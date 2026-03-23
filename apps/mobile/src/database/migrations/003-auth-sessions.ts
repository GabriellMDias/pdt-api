import type { Migration } from '@/src/database/types';

export const migration003CreateAuthSessions: Migration = {
  version: 3,
  name: 'create_auth_sessions',
  up: async (db) => {
    await db.execAsync(`
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

      CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id
        ON auth_sessions (user_id);
    `);
  },
};
