import type { Migration } from '@/src/database/types';

export const migration008CreateHomeFavorites: Migration = {
  version: 8,
  name: 'create_home_favorites',
  up: async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS home_favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        user_id INTEGER NOT NULL,
        route_key TEXT NOT NULL,
        label TEXT NOT NULL,
        icon TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES auth_users (id) ON DELETE CASCADE,
        UNIQUE (user_id, route_key)
      );

      CREATE INDEX IF NOT EXISTS idx_home_favorites_user_sort
        ON home_favorites (user_id, sort_order, id);
    `);
  },
};
