import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type { Reply, Snapshot } from '../src/shared/types.ts';
import type { Command } from '../src/server/engine.ts';

const dir = mkdtempSync(join(tmpdir(), 'cornbread-multiplayer-'));
const sockets: Socket[] = [];
const latest = new Map<Socket, Snapshot>();
let server = launch();
function launch() {
  const child = spawn(process.execPath, ['src/server/index.ts'], {
    env: { ...process.env, PORT: '0', HOST: '127.0.0.1', DATA_DIR: dir, NODE_ENV: 'test', PUBLIC_ORIGIN: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stderr.on('data', data => process.stderr.write(data));
  return child;
}
async function address(): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server did not start in 15 seconds.')), 15000);
    server.stdout.on('data', data => {
      const port = String(data).match(/listening on port (\d+)/)?.[1];
      if (port) { clearTimeout(timer); resolve(`http://127.0.0.1:${port}`); }
    });
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exited: ${code}`)); });
  });
}
async function post<T>(base: string, path: string, body: unknown = {}): Promise<T> {
  const res = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const reply: Reply<T> = await res.json();
  assert.ok(reply.ok, reply.ok ? '' : reply.error);
  return reply.data;
}
async function connect(base: string, auth: { code: string; role: string; token?: string }): Promise<Socket> {
  const socket = io(base, { auth, transports: ['websocket'], reconnection: false });
  sockets.push(socket);
  socket.on('state', (state: Snapshot) => latest.set(socket, state));
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Socket connection timed out.')), 8000);
    socket.once('connect', () => { clearTimeout(timer); resolve(); });
    socket.once('connect_error', error => { clearTimeout(timer); reject(error); });
  });
  await waitFor(() => latest.has(socket));
  return socket;
}
async function command(socket: Socket, cmd: Command, expectSuccess = true): Promise<Reply> {
  const response: Reply = await socket.timeout(7000).emitWithAck('command', cmd);
  assert.equal(response.ok, expectSuccess, JSON.stringify(response));
  return response;
}
async function waitFor(predicate: () => boolean) {
  const deadline = Date.now() + 8000;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('Expected synchronized state did not arrive.');
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}
try {
  let base = await address();
  const homepage = await fetch(base);
  assert.equal(homepage.status, 200);
  assert.match(await homepage.text(), /Cloud &amp; Cornbread|Cloud & Cornbread/);
  const room = await post<{ code: string; token: string }>(base, '/api/rooms');
  await assert.rejects(connect(base, { code: room.code, role: 'host', token: 'not-a-host-credential' }), /Invalid host credential/);
  let host = await connect(base, { code: room.code, role: 'host', token: room.token });
  let presentation = await connect(base, { code: room.code, role: 'present' });
  const players: { socket: Socket; token: string }[] = [];
  for (let i = 0; i < 15; i++) {
    const { token } = await post<{ token: string }>(base, `/api/rooms/${room.code}/join`, { name: `Engineer ${i + 1}` });
    players.push({ socket: await connect(base, { code: room.code, role: 'player', token }), token });
  }
  await waitFor(() => latest.get(host)?.standings.length === 15 && latest.get(host)?.standings.filter(p => p.online).length === 15);
  assert.equal(latest.get(host)!.standings.filter(p => p.online).length, 15);
  await command(players[0].socket, { type: 'start-round' }, false);
  await command(presentation, { type: 'start-round' }, false);
  let priorCards: string[] = [];
  for (let round = 0; round < 3; round++) {
    await command(host, { type: 'start-round' });
    await waitFor(() => players.every(p => latest.get(p.socket)?.round === round && latest.get(p.socket)?.phase === 'question'));
    const cards = players.map(p => latest.get(p.socket)!.me!.card.join('|'));
    assert.equal(new Set(cards).size, 15);
    assert.ok(cards.every(card => !priorCards.includes(card)));
    priorCards = cards;
    for (let n = 0; n < 24; n++) {
      const hostState = latest.get(host)!;
      const correct = hostState.host!.privateQuestion!.answer;
      await waitFor(() => latest.get(presentation)?.question?.id === hostState.question?.id);
      assert.equal(latest.get(presentation)!.question?.answer, undefined);
      assert.equal(latest.get(presentation)!.host, undefined);
      const firstState = latest.get(players[0].socket)!;
      const firstIndex = firstState.me!.card.indexOf(correct);
      await command(players[0].socket, { type: 'mark', index: firstIndex }, false);
      await command(host, { type: 'reveal' });
      await waitFor(() => players.every(p => latest.get(p.socket)?.question?.answer === correct));
      await Promise.all(players.map(async p => {
        const index = latest.get(p.socket)!.me!.card.indexOf(correct);
        const before = latest.get(p.socket)!.me!.score;
        await command(p.socket, { type: 'mark', index });
        await command(p.socket, { type: 'mark', index });
        await waitFor(() => latest.get(p.socket)!.me!.marks.includes(index));
        assert.ok(latest.get(p.socket)!.me!.score >= before + 10);
      }));
      if (latest.get(host)?.announcement) await command(host, { type: 'dismiss' });
      if (n < 23) await command(host, { type: 'next' });
    }
    const state = latest.get(host)!;
    assert.equal(state.winners.filter(w => w.round === round).length, 15);
    for (const p of players) {
      const me = latest.get(p.socket)!.me!;
      assert.equal(me.marks.length, 25);
      const bonus = state.winners.filter(w => w.playerId === me.id).reduce((sum, w) => sum + w.points, 0);
      assert.equal(me.score, (round + 1) * 240 + bonus);
    }
    await command(host, { type: 'end-round' });
    console.log(`Round ${round + 1}: 15 unique cards, 24 synchronized questions, verified wins and exact scores.`);
    // The test uses accelerated questions; reset only the test clients' rate-limit
    // windows by reconnecting, never weakening production server limits.
    for (const p of players) {
      p.socket.disconnect();
      p.socket = await connect(base, { code: room.code, role: 'player', token: p.token });
    }
    host.disconnect();
    host = await connect(base, { code: room.code, role: 'host', token: room.token });
  }
  await command(host, { type: 'end-event' });
  const finalScores = latest.get(host)!.standings.map(p => [p.id, p.score]);
  const savedMe = latest.get(players[0].socket)!.me!;
  players[0].socket.disconnect();
  players[0].socket = await connect(base, { code: room.code, role: 'player', token: players[0].token });
  assert.deepEqual(latest.get(players[0].socket)!.me, savedMe);
  for (const s of sockets) s.disconnect();
  server.kill('SIGTERM');
  await once(server, 'exit');
  server = launch();
  base = await address();
  host = await connect(base, { code: room.code, role: 'host', token: room.token });
  presentation = await connect(base, { code: room.code, role: 'present' });
  const restored = await connect(base, { code: room.code, role: 'player', token: players[0].token });
  assert.deepEqual(latest.get(restored)!.me, savedMe);
  assert.deepEqual(latest.get(host)!.standings.map(p => [p.id, p.score]), finalScores);
  await command(host, { type: 'reset-scores' });
  await command(host, { type: 'tiebreak' });
  await waitFor(() => latest.get(host)?.phase === 'tiebreak');
  assert.equal(latest.get(presentation)!.question?.answer, undefined);
  const answer = latest.get(host)!.host!.privateQuestion!.answer;
  await command(restored, { type: 'tie-answer', answer });
  await command(restored, { type: 'tie-answer', answer }, false);
  await command(host, { type: 'reveal' });
  await waitFor(() => latest.get(host)?.phase === 'finished');
  assert.equal(latest.get(host)!.standings[0].score, 1);
  assert.equal(latest.get(host)!.standings[0].id, savedMe.id);
  console.log('PASS: independent sockets, role enforcement, three rounds, retry safety, reconnect, server restart and final tiebreaker.');
} finally {
  for (const socket of sockets) socket.disconnect();
  if (server.exitCode === null) {
    server.kill('SIGTERM');
    await once(server, 'exit');
  }
  rmSync(dir, { recursive: true });
}
