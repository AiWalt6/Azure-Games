export type Category = 'Azure' | 'American history' | 'Thanksgiving & tech';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type Pattern = 'line' | 'corners' | 'x';
export type Phase = 'lobby' | 'question' | 'reveal' | 'round-end' | 'finished' | 'tiebreak';
export interface Question {
  id: string;
  category: Category;
  difficulty: Difficulty;
  text: string;
  answer: string;
  explanation: string;
  source: string;
  aliases?: string[];
}
export interface PublicQuestion {
  id: string;
  category: Category;
  difficulty: Difficulty;
  text: string;
  answer?: string;
  explanation?: string;
  source?: string;
}
export interface Player {
  id: string;
  name: string;
  token: string;
  card: string[];
  marks: number[];
  score: number;
  wins: number;
  claimed: boolean;
  bot: boolean;
}
export interface Winner {
  playerId: string;
  name: string;
  round: number;
  points: number;
  card: string[];
  pattern: number[];
}
export interface Room {
  code: string;
  hostToken: string;
  createdAt: number;
  players: Player[];
  phase: Phase;
  round: number;
  queues: string[][];
  cursor: number;
  revealed: string[];
  asked: string[];
  duration: number;
  deadline: number | null;
  paused: boolean;
  remaining: number | null;
  winners: Winner[];
  announcement: Winner | null;
  firstWinQuestion: string | null;
  view: 'game' | 'leaderboard';
  lobbyDeadline: number | null;
  tieQuestion: string | null;
  tieIds: string[];
  tieAnswers: Record<string, { answer: string; at: number }>;
  tieResolved: boolean;
}
export interface Standing {
  id: string;
  name: string;
  score: number;
  wins: number;
  online: boolean;
  marked: number;
  claimed: boolean;
  bot: boolean;
  rank: number;
}
export interface Snapshot {
  code: string;
  phase: Phase;
  round: number;
  roundName: string;
  pattern: Pattern;
  question: PublicQuestion | null;
  questionNumber: number;
  questionCount: number;
  duration: number;
  deadline: number | null;
  remaining: number | null;
  paused: boolean;
  serverNow: number;
  standings: Standing[];
  revealed: string[];
  winners: Winner[];
  announcement: Winner | null;
  view: 'game' | 'leaderboard';
  lobbyDeadline: number | null;
  me?: Omit<Player, 'token'>;
  host?: { queue: Question[]; asked: Question[]; privateQuestion: Question | null };
  tieIds: string[];
  tieSubmitted: boolean;
  tieResolved: boolean;
}
export type Reply<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
export const ROUND_NAMES = ['The Warm-Up Feast', 'The Turkey Trot', 'The Grand Thanksgiving Showdown'];
export const PATTERNS: Pattern[] = ['line', 'corners', 'x'];
export const BONUSES = [100, 150, 200];
export function patternCells(pattern: Pattern): number[][] {
  if (pattern === 'corners') return [[0, 4, 20, 24]];
  const diagonals = [[0, 6, 12, 18, 24], [4, 8, 12, 16, 20]];
  if (pattern === 'x') return [[...new Set(diagonals.flat())]];
  return [
    ...Array.from({ length: 5 }, (_, r) => Array.from({ length: 5 }, (_, c) => r * 5 + c)),
    ...Array.from({ length: 5 }, (_, c) => Array.from({ length: 5 }, (_, r) => r * 5 + c)),
    ...diagonals,
  ];
}
