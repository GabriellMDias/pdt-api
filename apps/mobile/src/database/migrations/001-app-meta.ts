import type { Migration } from '@/src/database/types';

export const migration001CreateAppMeta: Migration = {
  version: 1,
  name: 'create_app_meta',
  up: async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS app_meta (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  },
};
