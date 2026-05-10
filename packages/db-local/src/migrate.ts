import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'path';

export async function migrateDb(dbPath: string): Promise<void> {
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  const db = drizzle(sqlite);

  await migrate(db, {
    migrationsFolder: path.join(__dirname, '../migrations'),
  });

  sqlite.close();
}

// Allow running directly: tsx src/migrate.ts <db-path>
if (require.main === module) {
  const dbPath = process.argv[2] ?? ':memory:';
  migrateDb(dbPath)
    .then(() => console.warn('Migration complete:', dbPath))
    .catch((err: unknown) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
