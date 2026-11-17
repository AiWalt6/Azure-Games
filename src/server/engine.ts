import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { BONUSES, PATTERNS, ROUND_NAMES, patternCells } from '../shared/types.ts';
import type { Player, PublicQuestion, Room, Snapshot } from '../shared/types.ts';
import { QUESTIONS, question } from './questions.ts';

export class GameError extends Error {}
export function requireGame(condition: unknown, message: string): asserts condition {
  if (!condition) throw new GameError(message);
}
export function secret(): string { return randomBytes(32).toString('base64url'); }
export function secureEqual(left: string, right: string): boolean {
  const a = Buffer.from(left), b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function shuffle<T>(input: readonly T[]): T[] {
  const result = [...input];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function queues(): string[][] {
  // Disjoint 24-answer pools guarantee every card can finish in at most eight
  // minutes of 15s questions + 5s reveals. Eight questions remain for tiebreaks.
  const easy = shuffle(QUESTIONS.filter(q => q.difficulty === 'Easy'));
  const medium = shuffle(QUESTIONS.filter(q => q.difficulty === 'Medium'));
  const hard = shuffle(QUESTIONS.filter(q => q.difficulty === 'Hard'));
  return [
    shuffle([...easy.splice(0, 15), ...medium.splice(0, 9)]),
    shuffle([...easy.splice(0, 10), ...medium.splice(0, 12), ...hard.splice(0, 2)]),
    shuffle([...easy.splice(0, 7), ...medium.splice(0, 9), ...hard.splice(0, 8)]),
  ].map(pool => pool.map(q => q.id));
}
export function createRoom(code: string): Room {
  return {
    code, hostToken: secret(), createdAt: Date.now(), players: [],
    phase: 'lobby', round: 0, queues: queues(), cursor: -1,
    revealed: [], asked: [], duration: 15, deadline: null, paused: false,
    remaining: null, winners: [], announcement: null, firstWinQuestion: null,
    view: 'game', lobbyDeadline: null,
    tieQuestion: null, tieIds: [], tieAnswers: {}, tieResolved: false,
  };
}
function uniqueCard(room: Room): string[] {
  const used = new Set(room.players.map(p => p.card.join('|')));
  const answers = room.queues[room.round].map(id => question(id).answer);
  let card: string[];
  do {
    card = shuffle(answers);
    card.splice(12, 0, 'FREE SPACE');
  } while (used.has(card.join('|')));
  return card;
}
export function joinRoom(room: Room, name: string, bot = false): Player {
  requireGame(room.phase === 'lobby' || room.phase === 'round-end', 'Join during the lobby or between rounds.');
  requireGame(room.players.length < 50, 'This room has reached its 50-player limit.');
  name = name.trim();
  requireGame(name.length >= 1 && name.length <= 30, 'Use a display name between 1 and 30 characters.');
  requireGame(!/[\p{Cc}\p{Cf}]/u.test(name), 'Display names cannot contain control characters.');
  requireGame(!room.players.some(p => p.name.toLocaleLowerCase() === name.toLocaleLowerCase()), 'That name is taken. Please choose another.');
  const player: Player = {
    id: randomBytes(12).toString('hex'), token: secret(), name,
    card: uniqueCard(room), marks: [12], score: 0, wins: 0, claimed: false, bot,
  };
  room.players.push(player);
  return player;
}
export function currentQuestion(room: Room) {
  const id = room.tieQuestion && (room.phase === 'tiebreak' || room.phase === 'finished')
    ? room.tieQuestion : room.queues[room.round][room.cursor];
  return id ? question(id) : null;
}
export function winningPattern(room: Room, player: Player): number[] | undefined {
  return patternCells(PATTERNS[room.round]).find(pattern => pattern.every(index => player.marks.includes(index)));
}
function verifyWin(room: Room, player: Player): void {
  const pattern = winningPattern(room, player);
  if (!pattern || player.claimed) return;
  const q = currentQuestion(room);
  requireGame(q, 'No question is active.');
  // Claims completed on the same revealed question share first place, independent
  // of network arrival order. Later-question claims receive the additional bonus.
  room.firstWinQuestion ??= q.id;
  const first = room.firstWinQuestion === q.id;
  const points = first ? BONUSES[room.round] : 50;
  player.claimed = true;
  player.score += points;
  if (first) player.wins++;
  const winner = {
    playerId: player.id, name: player.name, round: room.round,
    points, card: [...player.card], pattern,
  };
  room.winners.push(winner);
  room.announcement ??= winner;
  room.deadline = null;
}
export const CommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('start-round') }),
  z.object({ type: z.literal('timer') }),
  z.object({ type: z.literal('duration'), seconds: z.number().int().min(5).max(120) }),
  z.object({ type: z.literal('reveal') }),
  z.object({ type: z.literal('next') }),
  z.object({ type: z.literal('pause') }),
  z.object({ type: z.literal('end-round') }),
  z.object({ type: z.literal('end-event') }),
  z.object({ type: z.literal('dismiss') }),
  z.object({ type: z.literal('view'), view: z.enum(['game', 'leaderboard']) }),
  z.object({ type: z.literal('remove'), playerId: z.string().max(64) }),
  z.object({ type: z.literal('reset-scores') }),
  z.object({ type: z.literal('restart') }),
  z.object({ type: z.literal('bots') }),
  z.object({ type: z.literal('lobby-countdown') }),
  z.object({ type: z.literal('mark'), index: z.number().int().min(0).max(24) }),
  z.object({ type: z.literal('claim') }),
  z.object({ type: z.literal('tiebreak') }),
  z.object({ type: z.literal('tie-answer'), answer: z.string().trim().min(1).max(120) }),
]);
export type Command = z.infer<typeof CommandSchema>;
function normalize(answer: string): string {
  return answer.toLowerCase().replace(/^(the|an?|microsoft)\s+/, '').replace(/[^\p{L}\p{N}]/gu, '');
}
export function isCorrect(answer: string, id: string): boolean {
  const q = question(id);
  return [q.answer, ...(q.aliases ?? [])].some(a => normalize(a) === normalize(answer));
}
export function applyCommand(room: Room, cmd: Command, role: 'host' | 'player', playerId?: string, now = Date.now()): void {
  const playerCommand = ['mark', 'claim', 'tie-answer'].includes(cmd.type);
  requireGame(playerCommand ? role === 'player' : role === 'host', 'You are not authorized to use that control.');
  const player = playerCommand ? room.players.find(p => p.id === playerId) : undefined;
  if (playerCommand) requireGame(player, 'Player session not found. Please rejoin.');
  if (cmd.type === 'mark' || cmd.type === 'claim') {
    requireGame(room.phase === 'reveal' && !room.paused, 'Wait for the host to reveal an answer and resume play.');
    requireGame(player, 'Player not found.');
    if (cmd.type === 'mark') {
      requireGame(cmd.index !== 12, 'The center is already free.');
      requireGame(room.revealed.includes(player.card[cmd.index]), 'That answer has not been revealed.');
      if (player.marks.includes(cmd.index)) return;
      player.marks.push(cmd.index);
      player.score += 10;
    } else {
      requireGame(winningPattern(room, player), 'Your card does not yet complete this round’s pattern.');
    }
    verifyWin(room, player);
    return;
  }
  switch (cmd.type) {
    case 'start-round': {
      requireGame(room.phase === 'lobby' || (room.phase === 'round-end' && room.round < 2), 'Close the current round first.');
      requireGame(room.players.length > 0, 'At least one player must join first.');
      if (room.phase === 'round-end') room.round++;
      room.players.forEach(p => { p.card = []; });
      room.players.forEach(p => { p.card = uniqueCard(room); p.marks = [12]; p.claimed = false; });
      room.cursor = 0;
      room.revealed = [];
      room.firstWinQuestion = null;
      room.announcement = null;
      room.lobbyDeadline = null;
      room.phase = 'question';
      room.view = 'game';
      room.paused = false;
      room.remaining = null;
      room.deadline = now + room.duration * 1000;
      room.asked.push(room.queues[room.round][0]);
      break;
    }
    case 'duration':
      room.duration = cmd.seconds;
      break;
    case 'timer':
      requireGame(['question', 'tiebreak'].includes(room.phase) && !room.paused && !room.announcement, 'Start a question before starting the timer.');
      room.deadline = now + room.duration * 1000;
      break;
    case 'reveal': {
      requireGame(!room.paused, 'Resume the game first.');
      const q = currentQuestion(room);
      requireGame(q, 'No question is active.');
      if (room.phase === 'tiebreak') {
        requireGame(!room.tieResolved, 'This tiebreaker is already resolved.');
        const correct = Object.entries(room.tieAnswers)
          .filter(([, value]) => isCorrect(value.answer, q.id))
          .sort((a, b) => a[1].at - b[1].at || a[0].localeCompare(b[0]));
        if (correct[0]) {
          const winner = room.players.find(p => p.id === correct[0][0]);
          requireGame(winner, 'Tiebreak winner no longer exists.');
          winner.score += 1;
        }
        room.tieResolved = true;
        room.phase = 'finished';
      } else {
        requireGame(room.phase === 'question' || room.phase === 'reveal', 'No active question to reveal.');
        if (!room.revealed.includes(q.answer)) room.revealed.push(q.answer);
        room.phase = 'reveal';
      }
      room.deadline = null;
      break;
    }
    case 'next':
      requireGame(room.phase === 'reveal' && !room.paused, 'Reveal the answer and resume before advancing.');
      requireGame(!room.announcement, 'Dismiss the winner celebration before advancing.');
      requireGame(room.cursor + 1 < room.queues[room.round].length, 'All questions have been called. End this round.');
      room.cursor++;
      room.phase = 'question';
      room.deadline = now + room.duration * 1000;
      room.asked.push(room.queues[room.round][room.cursor]);
      break;
    case 'pause':
      requireGame(['question', 'reveal', 'tiebreak'].includes(room.phase), 'No active game to pause.');
      if (room.paused) {
        room.deadline = room.remaining === null ? null : now + room.remaining;
        room.remaining = null;
      } else {
        room.remaining = room.deadline === null ? null : Math.max(0, room.deadline - now);
        room.deadline = null;
      }
      room.paused = !room.paused;
      break;
    case 'end-round':
      requireGame(['question', 'reveal'].includes(room.phase), 'No round is active.');
      room.phase = 'round-end';
      room.deadline = null;
      room.remaining = null;
      room.paused = false;
      room.announcement = null;
      break;
    case 'end-event':
      requireGame(room.players.length > 0, 'There are no players to rank.');
      requireGame(room.phase !== 'tiebreak', 'Resolve the current tiebreaker first.');
      room.phase = 'finished';
      room.deadline = null;
      room.paused = false;
      room.announcement = null;
      room.view = 'game';
      break;
    case 'dismiss':
      room.announcement = null;
      break;
    case 'view':
      room.view = cmd.view;
      break;
    case 'remove':
      requireGame(room.players.some(p => p.id === cmd.playerId), 'Player not found.');
      requireGame(room.phase !== 'tiebreak', 'Finish the tiebreaker before changing the roster.');
      room.players = room.players.filter(p => p.id !== cmd.playerId);
      break;
    case 'reset-scores':
      requireGame(['lobby', 'round-end', 'finished'].includes(room.phase), 'Reset scores between rounds, not during play.');
      room.players.forEach(p => { p.score = 0; p.wins = 0; });
      room.winners = [];
      break;
    case 'restart':
      Object.assign(room, {
        ...createRoom(room.code), hostToken: room.hostToken, players: room.players,
        createdAt: room.createdAt,
      });
      room.players.forEach(p => { p.card = []; });
      room.players.forEach(p => {
        p.card = uniqueCard(room); p.marks = [12]; p.score = 0; p.wins = 0; p.claimed = false;
      });
      break;
    case 'bots':
      requireGame(room.phase === 'lobby', 'Add rehearsal players before starting.');
      for (let n = 1; n <= 15; n++) {
        if (!room.players.some(p => p.name === `Rehearsal ${n}`)) joinRoom(room, `Rehearsal ${n}`, true);
      }
      break;
    case 'lobby-countdown':
      requireGame(room.phase === 'lobby', 'The lobby countdown is only available before play.');
      room.lobbyDeadline = now + 60_000;
      break;
    case 'tiebreak': {
      requireGame(room.phase === 'finished', 'End the event before starting a tiebreaker.');
      const top = Math.max(...room.players.map(p => p.score));
      const tied = room.players.filter(p => p.score === top);
      requireGame(tied.length > 1, 'There is no tie for the highest total score.');
      const q = QUESTIONS.find(q => !room.asked.includes(q.id));
      requireGame(q, 'All tiebreak questions have been used. Restart the event to play again.');
      room.tieQuestion = q.id;
      room.tieIds = tied.map(p => p.id);
      room.tieAnswers = {};
      room.tieResolved = false;
      room.asked.push(q.id);
      room.phase = 'tiebreak';
      room.deadline = now + room.duration * 1000;
      room.paused = false;
      break;
    }
    case 'tie-answer':
      requireGame(player && room.phase === 'tiebreak' && !room.paused && room.tieIds.includes(player.id), 'You are not in the active tiebreaker.');
      requireGame(room.deadline !== null && now <= room.deadline, 'The tiebreaker timer has expired.');
      requireGame(!room.tieAnswers[player.id], 'Your answer has already been submitted.');
      room.tieAnswers[player.id] = { answer: cmd.answer, at: now };
      break;
  }
}
export function botStep(room: Room): boolean {
  if (room.paused) return false;
  let changed = false;
  for (const player of room.players.filter(p => p.bot)) {
    if (room.phase === 'reveal') {
      for (let i = 0; i < 25; i++) {
        if (i !== 12 && !player.marks.includes(i) && room.revealed.includes(player.card[i])) {
          applyCommand(room, { type: 'mark', index: i }, 'player', player.id);
          changed = true;
        }
      }
    } else if (room.phase === 'tiebreak' && room.tieIds.includes(player.id) && !room.tieAnswers[player.id] && room.deadline !== null && Date.now() < room.deadline) {
      const q = currentQuestion(room);
      if (q) {
        applyCommand(room, { type: 'tie-answer', answer: q.answer }, 'player', player.id);
        changed = true;
      }
    }
  }
  return changed;
}
export function snapshot(room: Room, role: 'host' | 'player' | 'present', online: Set<string>, playerId?: string): Snapshot {
  const current = currentQuestion(room);
  const canReveal = room.phase === 'reveal' || (room.phase === 'finished' && room.tieResolved);
  let publicQuestion: PublicQuestion | null = null;
  if (current && !['lobby', 'round-end'].includes(room.phase)) {
    publicQuestion = { id: current.id, category: current.category, difficulty: current.difficulty, text: current.text };
    if (canReveal) Object.assign(publicQuestion, { answer: current.answer, explanation: current.explanation, source: current.source });
  }
  const standings = [...room.players]
    .sort((a, b) => b.score - a.score || b.wins - a.wins || a.name.localeCompare(b.name))
    .map((p, index, list) => ({
      id: p.id, name: p.name, score: p.score, wins: p.wins,
      online: p.bot || online.has(p.id), marked: p.marks.length - 1, claimed: p.claimed, bot: p.bot,
      rank: index === 0 ? 1 : list.findIndex(other => other.score === p.score) + 1,
    }));
  const result: Snapshot = {
    code: room.code, phase: room.phase, round: room.round,
    roundName: ROUND_NAMES[room.round], pattern: PATTERNS[room.round], question: publicQuestion,
    questionNumber: Math.max(0, room.cursor + 1), questionCount: room.queues[room.round].length,
    deadline: room.deadline, duration: room.duration, remaining: room.remaining,
    paused: room.paused, serverNow: Date.now(), standings, revealed: room.revealed,
    winners: room.winners.map(w => ({
      ...w, card: w.card.map(answer => role === 'host' || answer === 'FREE SPACE' || room.revealed.includes(answer) ? answer : 'Not called'),
    })),
    announcement: room.announcement ? {
      ...room.announcement,
      card: room.announcement.card.map(answer => role === 'host' || answer === 'FREE SPACE' || room.revealed.includes(answer) ? answer : 'Not called'),
    } : null,
    view: room.view,
    lobbyDeadline: room.lobbyDeadline, tieIds: room.tieIds,
    tieSubmitted: playerId ? Boolean(room.tieAnswers[playerId]) : false, tieResolved: room.tieResolved,
  };
  if (role === 'player') {
    const p = room.players.find(p => p.id === playerId);
    if (p) {
      const { token: _token, ...me } = p;
      result.me = me;
    }
  }
  if (role === 'host') result.host = {
    queue: room.queues[room.round].map(question),
    asked: room.asked.map(question),
    privateQuestion: current,
  };
  return result;
}
