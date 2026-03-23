import type { Migration } from '@/src/database/types';

export const migration009CreateUserPreferences: Migration = {
  version: 9,
  name: 'create_user_preferences',
  up: async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        user_id INTEGER NOT NULL,
        preference_key TEXT NOT NULL,
        preference_value TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES auth_users (id) ON DELETE CASCADE,
        UNIQUE (user_id, preference_key)
      );

      CREATE INDEX IF NOT EXISTS idx_user_preferences_user
        ON user_preferences (user_id, preference_key);
    `);
  },
};
