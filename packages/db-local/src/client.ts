import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import * as schema from './schema/index';

export type LocalDb = ReturnType<typeof createLocalDb>;

export function createLocalDb(dbPath: string) {
  const sqlite = new Database(dbPath);

  // Critical SQLite pragmas for performance and safety
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('cache_size = -64000'); // 64MB cache
  sqlite.pragma('temp_store = MEMORY');

  const db = drizzle(sqlite, { schema });
  return db;
}

export function closeSqlite(db: LocalDb): void {
  // Access underlying sqlite3 instance and close
  (db as unknown as { _client: { close: () => void } })._client.close();
}
