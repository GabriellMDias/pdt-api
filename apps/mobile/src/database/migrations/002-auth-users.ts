import type { Migration } from '@/src/database/types';

export const migration002CreateAuthUsers: Migration = {
  version: 2,
  name: 'create_auth_users',
  up: async (db) => {
    await db.execAsync(`
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

      CREATE INDEX IF NOT EXISTS idx_auth_users_synced_at
        ON auth_users (synced_at);
    `);
  },
};
