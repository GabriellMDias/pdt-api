import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '@/src/database/client';

const DB_SCHEMA_VERSION = 1;
const DB_SCHEMA_KEY = 'db_schema_version';

let migrationPromise: Promise<void> | null = null;

async function createSchema(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_users (
      id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      login TEXT NOT NULL,
      login_normalized TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      permissions_json TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL,
      synced_at TEXT NOT NULL,
      last_login_at TEXT
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_users_login_normalized
      ON auth_users (login_normalized);

    CREATE INDEX IF NOT EXISTS idx_auth_users_email
      ON auth_users (email);

    CREATE TABLE IF NOT EXISTS auth_sessions (
      id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
      user_id INTEGER NOT NULL,
      token TEXT,
      token_expires_at TEXT,
      mode TEXT NOT NULL CHECK (mode IN ('online', 'offline')),
      last_login_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
    );
  `);
}

async function readSchemaVersion(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_meta WHERE key = ? LIMIT 1',
    [DB_SCHEMA_KEY],
  );

  if (!row?.value) return 0;
  const parsed = Number(row.value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function writeSchemaVersion(db: SQLiteDatabase, version: number): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `
      INSERT INTO app_meta (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `,
    [DB_SCHEMA_KEY, String(version), now],
  );
}

export async function ensureDatabaseSchema(db?: SQLiteDatabase): Promise<void> {
  if (migrationPromise) {
    await migrationPromise;
    return;
  }

  migrationPromise = (async () => {
    const targetDb = db ?? (await getDatabase());
    await createSchema(targetDb);

    const currentVersion = await readSchemaVersion(targetDb);
    if (currentVersion < DB_SCHEMA_VERSION) {
      await writeSchemaVersion(targetDb, DB_SCHEMA_VERSION);
    }
  })();

  await migrationPromise;
}
