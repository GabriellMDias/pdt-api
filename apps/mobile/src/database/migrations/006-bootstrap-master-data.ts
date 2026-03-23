import type { Migration } from '@/src/database/types';

export const migration006CreateBootstrapMasterData: Migration = {
  version: 6,
  name: 'create_bootstrap_master_data',
  up: async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS auth_user_contexts (
        user_id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        active_status INTEGER NOT NULL DEFAULT 1,
        notify_cost_center_type INTEGER NOT NULL DEFAULT 0,
        codigo_usuario_vr_master INTEGER,
        synced_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES auth_users (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS master_stores (
        id INTEGER PRIMARY KEY NOT NULL,
        description TEXT NOT NULL,
        store_name TEXT NOT NULL,
        cnpj TEXT,
        active_status INTEGER NOT NULL DEFAULT 1,
        synced_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_permission_scopes (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        user_id INTEGER NOT NULL,
        permission_code TEXT NOT NULL,
        permission_group_path TEXT,
        use_store_permission INTEGER NOT NULL DEFAULT 0,
        global_access INTEGER NOT NULL DEFAULT 0,
        store_id INTEGER,
        synced_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (user_id, permission_code, store_id),
        FOREIGN KEY (user_id) REFERENCES auth_users (id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_master_stores_active
        ON master_stores (active_status, description);

      CREATE INDEX IF NOT EXISTS idx_user_permission_scopes_user
        ON user_permission_scopes (user_id, permission_code);

      CREATE INDEX IF NOT EXISTS idx_user_permission_scopes_store
        ON user_permission_scopes (user_id, store_id);
    `);
  },
};
