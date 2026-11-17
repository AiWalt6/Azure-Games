import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applyCommand, botStep, createRoom, currentQuestion, isCorrect, joinRoom, snapshot, winningPattern } from './engine.ts';
import { QUESTIONS, question } from './questions.ts';
import { RoomStore } from './store.ts';
import { PATTERNS, patternCells } from '../shared/types.ts';
import type { Room } from '../shared/types.ts';

function fixture(count = 15) {
  const room = createRoom('ABC234');
  for (let i = 0; i < count; i++) joinRoom(room, `Player ${i + 1}`);
  return room;
}
const host = (room: Room, type: 'start-round' | 'reveal' | 'next' | 'dismiss' | 'end-round' | 'end-event') => applyCommand(room, { type }, 'host');
test('80 original, uniquely mapped questions have required category and difficulty counts', () => {
  assert.equal(QUESTIONS.length, 80);
  assert.equal(new Set(QUESTIONS.map(q => q.id)).size, 80);
  assert.equal(new Set(QUESTIONS.map(q => q.answer)).size, 80);
  for (const [category, count] of [['Azure', 40], ['American history', 25], ['Thanksgiving & tech', 15]] as const) {
    assert.equal(QUESTIONS.filter(q => q.category === category).length, count);
  }
  for (const [difficulty, count] of [['Easy', 36], ['Medium', 32], ['Hard', 12]] as const) {
    assert.equal(QUESTIONS.filter(q => q.difficulty === difficulty).length, count);
  }
  for (const q of QUESTIONS) {
    assert.equal(new URL(q.source).protocol, 'https:');
    assert.ok(q.explanation.length > 30);
    assert.ok(isCorrect(q.answer, q.id));
  }
});
test('15 distinct cards per round, no duplicate answers, disjoint callable pools, bounded pacing', () => {
  const room = fixture();
  const allQuestions = room.queues.flat();
  assert.equal(new Set(allQuestions).size, 72);
  let prior: string[] = [];
  for (let round = 0; round < 3; round++) {
    host(room, 'start-round');
    const cards = room.players.map(p => p.card.join('|'));
    assert.equal(new Set(cards).size, 15);
    for (const p of room.players) {
      assert.equal(p.card.length, 25);
      assert.equal(p.card[12], 'FREE SPACE');
      assert.equal(new Set(p.card).size, 25);
      assert.deepEqual(p.marks, [12]);
      assert.ok(!prior.includes(p.card.join('|')));
      assert.ok(p.card.every(a => a === 'FREE SPACE' || room.queues[round].some(id => question(id).answer === a)));
    }
    assert.equal(room.queues[round].length * (room.duration + 5), 480);
    prior = cards;
    host(room, 'end-round');
  }
});
test('unrevealed marking, fake scores, unauthorized host actions, pause, and click retries', () => {
  const room = fixture(1), player = room.players[0];
  assert.throws(() => applyCommand(room, { type: 'start-round' }, 'player', player.id), /not authorized/);
  host(room, 'start-round');
  const index = player.card.indexOf(currentQuestion(room)!.answer);
  assert.throws(() => applyCommand(room, { type: 'mark', index }, 'player', player.id), /Wait for/);
  host(room, 'reveal');
  applyCommand(room, { type: 'pause' }, 'host');
  assert.throws(() => applyCommand(room, { type: 'mark', index }, 'player', player.id), /resume/);
  applyCommand(room, { type: 'pause' }, 'host');
  applyCommand(room, { type: 'mark', index }, 'player', player.id);
  applyCommand(room, { type: 'mark', index }, 'player', player.id);
  assert.equal(player.score, 10);
  const other = player.card.findIndex((a, i) => i !== 12 && a !== currentQuestion(room)!.answer);
  assert.throws(() => applyCommand(room, { type: 'mark', index: other }, 'player', player.id), /not been revealed/);
  assert.throws(() => applyCommand(room, { type: 'claim' }, 'player', player.id), /does not yet complete/);
  assert.throws(() => applyCommand(room, { type: 'mark', index }, 'host'), /not authorized/);
});
test('all row, column, diagonal, four-corners, and X patterns are detected without false positives', () => {
  const room = fixture(1), player = room.players[0];
  for (let round = 0; round < 3; round++) {
    room.round = round;
    for (const cells of patternCells(PATTERNS[round])) {
      player.marks = [...new Set([12, ...cells])];
      assert.ok(winningPattern(room, player));
      player.marks = player.marks.filter(i => i === 12 || i !== cells.find(c => c !== 12));
      assert.equal(winningPattern(room, player), undefined);
    }
  }
});
test('simultaneous-question winners share first bonus; later winners get 50 and no duplicate points', () => {
  const room = fixture(3);
  host(room, 'start-round');
  host(room, 'reveal');
  for (const player of room.players.slice(0, 2)) {
    player.marks = [...new Set([12, 0, 1, 2, 3, 4])];
    applyCommand(room, { type: 'claim' }, 'player', player.id);
    applyCommand(room, { type: 'claim' }, 'player', player.id);
    assert.equal(player.score, 100);
    assert.equal(player.wins, 1);
  }
  host(room, 'dismiss'); host(room, 'next'); host(room, 'reveal');
  const later = room.players[2];
  later.marks = [0, 1, 2, 3, 4, 12];
  applyCommand(room, { type: 'claim' }, 'player', later.id);
  assert.equal(later.score, 50);
  assert.equal(later.wins, 0);
});
test('presentation and player snapshots never expose host credentials, hidden answers or future queue', () => {
  const room = fixture(1);
  host(room, 'start-round');
  const q = currentQuestion(room)!;
  for (const role of ['player', 'present'] as const) {
    const state = snapshot(room, role, new Set(), room.players[0].id);
    assert.equal(state.host, undefined);
    assert.equal(state.question?.answer, undefined);
    assert.equal(state.question?.explanation, undefined);
    assert.ok(!JSON.stringify(state).includes(room.hostToken));
    assert.ok(!JSON.stringify(state).includes(room.players[0].token));
    if (role === 'present') assert.ok(!JSON.stringify(state).includes(q.answer));
  }
  host(room, 'reveal');
  assert.equal(snapshot(room, 'present', new Set()).question?.answer, q.answer);
  room.players[0].marks = [0, 1, 2, 3, 4, 12];
  applyCommand(room, { type: 'claim' }, 'player', room.players[0].id);
  const winner = snapshot(room, 'present', new Set()).announcement!;
  assert.ok(winner.card.every(a => a === q.answer || a === 'FREE SPACE' || a === 'Not called'));
  assert.ok(snapshot(room, 'host', new Set()).host?.queue.length);
});
test('pause freezes authoritative deadlines and resumes only the remaining time', () => {
  const room = fixture(1);
  applyCommand(room, { type: 'start-round' }, 'host', undefined, 1000);
  assert.equal(room.deadline, 16000);
  applyCommand(room, { type: 'pause' }, 'host', undefined, 6000);
  assert.equal(room.remaining, 10000);
  assert.equal(room.deadline, null);
  applyCommand(room, { type: 'pause' }, 'host', undefined, 90000);
  assert.equal(room.deadline, 100000);
});
test('full three-round rehearsal produces 15 verified winners, accurate scores and no automatic advancement', () => {
  const room = createRoom('ABC234');
  applyCommand(room, { type: 'bots' }, 'host');
  for (let round = 0; round < 3; round++) {
    host(room, 'start-round');
    for (let n = 0; n < 24; n++) {
      host(room, 'reveal');
      botStep(room);
      if (room.announcement) {
        assert.throws(() => host(room, 'next'), /celebration/);
        host(room, 'dismiss');
      }
      if (n < 23) host(room, 'next');
    }
    assert.equal(room.players.filter(p => p.claimed).length, 15);
    assert.equal(room.winners.filter(w => w.round === round).length, 15);
    for (const p of room.players) {
      const expected = (round + 1) * 240 + room.winners.filter(w => w.playerId === p.id).reduce((sum, w) => sum + w.points, 0);
      assert.equal(p.score, expected);
    }
    host(room, 'end-round');
  }
  host(room, 'end-event');
  assert.equal(room.phase, 'finished');
});
test('tiebreaker is restricted, accepts aliases once, rejects late answers and awards exactly one point', () => {
  const room = fixture(3);
  host(room, 'end-event');
  applyCommand(room, { type: 'tiebreak' }, 'host', undefined, 1000);
  const q = currentQuestion(room)!;
  const [first, second, third] = room.players;
  applyCommand(room, { type: 'tie-answer', answer: q.answer }, 'player', second.id, 2000);
  applyCommand(room, { type: 'tie-answer', answer: q.answer }, 'player', first.id, 3000);
  assert.throws(() => applyCommand(room, { type: 'tie-answer', answer: 'retry' }, 'player', first.id, 4000), /already/);
  assert.throws(() => applyCommand(room, { type: 'tie-answer', answer: q.answer }, 'player', third.id, 99999), /expired/);
  host(room, 'reveal');
  assert.equal(second.score, 1);
  assert.equal(first.score, 0);
  assert.equal(room.phase, 'finished');
  assert.throws(() => host(room, 'reveal'));
  assert.equal(second.score, 1);
});
test('persistent state and tokens survive closing and reopening the SQLite database', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cornbread-persistence-'));
  try {
    const room = fixture(1);
    host(room, 'start-round'); host(room, 'reveal');
    const index = room.players[0].card.indexOf(currentQuestion(room)!.answer);
    applyCommand(room, { type: 'mark', index }, 'player', room.players[0].id);
    const first = new RoomStore(dir);
    first.save(room); first.close();
    const reopened = new RoomStore(dir);
    assert.deepEqual(reopened.get(room.code), room);
    reopened.close();
  } finally { rmSync(dir, { recursive: true }); }
});
