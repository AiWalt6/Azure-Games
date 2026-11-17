import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Room } from '../shared/types.ts';

export class RoomStore {
  db: DatabaseSync;
  constructor(directory: string) {
    if (directory !== ':memory:') mkdirSync(directory, { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(directory === ':memory:' ? ':memory:' : resolve(directory, 'rooms.sqlite'));
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY, state TEXT NOT NULL, created_at INTEGER NOT NULL)');
  }
  get(code: string): Room | undefined {
    const row = this.db.prepare('SELECT state FROM rooms WHERE code = ?').get(code);
    return row ? JSON.parse(String(row.state)) as Room : undefined;
  }
  save(room: Room): void {
    this.db.prepare('INSERT INTO rooms(code,state,created_at) VALUES(?,?,?) ON CONFLICT(code) DO UPDATE SET state=excluded.state')
      .run(room.code, JSON.stringify(room), room.createdAt);
  }
  codes(): string[] {
    return this.db.prepare('SELECT code FROM rooms').all().map(row => String(row.code));
  }
  close(): void { this.db.close(); }
}
