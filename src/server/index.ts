import express from 'express';
import { createServer } from 'node:http';
import { randomInt } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { z } from 'zod';
import { GameError, CommandSchema, applyCommand, botStep, createRoom, joinRoom, requireGame, secureEqual, snapshot } from './engine.ts';
import { RoomStore } from './store.ts';
import { allowsSocketRequest } from './origin.ts';
import type { Room } from '../shared/types.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const production = process.env.NODE_ENV === 'production';
const origin = process.env.PUBLIC_ORIGIN;
if (production && (!origin || new URL(origin).protocol !== 'https:')) throw new Error('Production requires PUBLIC_ORIGIN with an https:// URL.');
const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
app.use(express.json({ limit: '4kb' }));
app.use((_req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws: wss:; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
    'Cache-Control': 'no-store',
  });
  if (production) res.set('Strict-Transport-Security', 'max-age=31536000');
  next();
});
const server = createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 4096,
  allowRequest: (req, callback) => {
    callback(null, allowsSocketRequest(req.headers, origin, production));
  },
});
const store = new RoomStore(process.env.DATA_DIR ?? resolve(root, 'data'));
const limits = new Map<string, { count: number; until: number }>();
function rateLimit(key: string, max: number, window = 60_000): boolean {
  const now = Date.now();
  const entry = limits.get(key);
  if (!entry || entry.until < now) {
    limits.set(key, { count: 1, until: now + window });
    return true;
  }
  return ++entry.count <= max;
}
const cleanup = setInterval(() => {
  for (const [key, value] of limits) if (value.until < Date.now()) limits.delete(key);
}, 60_000);
function getRoom(code: string): Room {
  const room = store.get(code.toUpperCase());
  requireGame(room, 'Room not found. Check the six-character code.');
  return room;
}
const JoinSchema = z.object({ name: z.string().trim().min(1).max(30) });
const AuthSchema = z.object({
  code: z.string().regex(/^[A-Z2-9]{6}$/),
  role: z.enum(['host', 'player', 'present']),
  token: z.string().max(64).optional(),
});
type Auth = z.infer<typeof AuthSchema> & { playerId?: string };
const auths = new Map<string, Auth>();
function publish(code: string): void {
  const room = getRoom(code);
  const ids = io.sockets.adapter.rooms.get(code) ?? new Set<string>();
  const online = new Set([...ids].flatMap(id => auths.get(id)?.playerId ?? []));
  for (const id of ids) {
    const auth = auths.get(id);
    const socket = io.sockets.sockets.get(id);
    if (!auth || !socket) continue;
    if (auth.role === 'player' && !room.players.some(p => p.id === auth.playerId)) {
      socket.emit('removed', 'The host removed you from this room.');
      socket.disconnect(true);
      continue;
    }
    socket.emit('state', snapshot(room, auth.role, online, auth.playerId));
  }
}
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api', (req, res, next) => {
  if (req.method !== 'GET' && origin && req.headers.origin !== origin) {
    res.status(403).json({ ok: false, error: 'Request origin is not allowed.' });
    return;
  }
  if (!rateLimit(`http:${req.ip}`, 100)) {
    res.status(429).json({ ok: false, error: 'Too many requests. Please wait a minute.' });
    return;
  }
  next();
});
app.post('/api/rooms', (req, res) => {
  if (!rateLimit(`create:${req.ip}`, 10, 15 * 60_000)) {
    res.status(429).json({ ok: false, error: 'Room creation limit reached. Try again in 15 minutes.' });
    return;
  }
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code: string;
  do { code = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join(''); } while (store.get(code));
  const room = createRoom(code);
  store.save(room);
  res.status(201).json({ ok: true, data: { code, token: room.hostToken } });
});
app.post('/api/rooms/:code/join', (req, res) => {
  const room = getRoom(String(req.params.code));
  const input = JoinSchema.parse(req.body);
  const player = joinRoom(room, input.name);
  store.save(room);
  publish(room.code);
  res.status(201).json({ ok: true, data: { token: player.token, playerId: player.id } });
});
io.use((socket, next) => {
  try {
    if (!rateLimit(`connect:${socket.handshake.address}`, 200)) throw new GameError('Too many connections. Please wait a minute.');
    const auth: Auth = AuthSchema.parse(socket.handshake.auth);
    const room = getRoom(auth.code);
    if (auth.role === 'host') requireGame(auth.token && secureEqual(auth.token, room.hostToken), 'Invalid host credential. Use your private host link.');
    if (auth.role === 'player') {
      const player = room.players.find(p => auth.token && secureEqual(p.token, auth.token));
      requireGame(player && !player.bot, 'Player session expired or removed. Join again from the game link.');
      auth.playerId = player.id;
    }
    auths.set(socket.id, auth);
    next();
  } catch (error) {
    if (!(error instanceof GameError || error instanceof z.ZodError)) console.error('Socket authentication failed', error);
    next(new Error(error instanceof GameError ? error.message : 'Unable to authenticate this connection.'));
  }
});
io.on('connection', socket => {
  const auth = auths.get(socket.id);
  if (!auth) { socket.disconnect(true); return; }
  socket.join(auth.code);
  publish(auth.code);
  socket.on('command', (raw: unknown, ack: unknown) => {
    if (typeof ack !== 'function') return;
    try {
      requireGame(rateLimit(`command:${socket.id}`, 120), 'Too many actions. Please wait a minute.');
      requireGame(auth.role !== 'present', 'Presentation mode is read-only.');
      const room = getRoom(auth.code);
      const command = CommandSchema.parse(raw);
      applyCommand(room, command, auth.role, auth.playerId);
      store.save(room);
      publish(room.code);
      ack({ ok: true, data: undefined });
    } catch (error) {
      if (error instanceof GameError) ack({ ok: false, error: error.message });
      else if (error instanceof z.ZodError) ack({ ok: false, error: 'Invalid game action.' });
      else {
        console.error('Game command failed', error);
        ack({ ok: false, error: 'The server could not save this action. Please retry.' });
      }
    }
  });
  socket.on('disconnect', () => {
    auths.delete(socket.id);
    if (store.get(auth.code)) publish(auth.code);
  });
});
const bots = setInterval(() => {
  for (const code of store.codes()) {
    try {
      const room = getRoom(code);
      if (botStep(room)) { store.save(room); publish(code); }
    } catch (error) { console.error(`Rehearsal player processing failed for room ${code}`, error); }
  }
}, 750);
const dist = resolve(root, 'dist');
if (existsSync(dist)) app.use(express.static(dist, { index: false }));
app.get('/{*path}', (_req, res) => {
  if (existsSync(resolve(dist, 'index.html'))) res.sendFile(resolve(dist, 'index.html'));
  else res.status(503).send('Frontend is not built. Use npm run dev or run npm run build first.');
});
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof GameError) res.status(400).json({ ok: false, error: error.message });
  else if (error instanceof z.ZodError || error instanceof SyntaxError) res.status(400).json({ ok: false, error: 'Please check the submitted name and room code.' });
  else {
    console.error('Request failed', error);
    res.status(500).json({ ok: false, error: 'The server could not complete this request.' });
  }
});
const port = Number(process.env.PORT ?? 3001);
server.listen(port, process.env.HOST ?? '0.0.0.0', () => {
  const address = server.address();
  console.log(`Cloud & Cornbread listening on port ${address && typeof address !== 'string' ? address.port : port}`);
});
function shutdown() {
  clearInterval(bots);
  clearInterval(cleanup);
  io.close(() => { store.close(); server.close(); });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
