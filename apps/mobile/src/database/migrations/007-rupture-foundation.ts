import type { Migration } from '@/src/database/types';

export const migration007CreateRuptureFoundation: Migration = {
  version: 7,
  name: 'create_rupture_foundation',
  up: async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS catalog_products (
        id INTEGER NOT NULL,
        store_id INTEGER NOT NULL,
        barcode TEXT,
        description TEXT NOT NULL,
        package_quantity REAL,
        packaging_type_id INTEGER,
        packaging_description TEXT,
        shelf_code TEXT,
        active_status INTEGER NOT NULL DEFAULT 1,
        synced_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (store_id, id)
      );

      CREATE INDEX IF NOT EXISTS idx_catalog_products_lookup
        ON catalog_products (store_id, description, id);

      CREATE INDEX IF NOT EXISTS idx_catalog_products_barcode
        ON catalog_products (store_id, barcode);

      CREATE INDEX IF NOT EXISTS idx_catalog_products_shelf
        ON catalog_products (store_id, shelf_code);

      CREATE TABLE IF NOT EXISTS rupture_entries (
        local_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        event_id TEXT NOT NULL UNIQUE,
        user_id INTEGER NOT NULL,
        store_id INTEGER NOT NULL,
        shelf_code TEXT NOT NULL,
        product_id INTEGER NOT NULL,
        barcode TEXT,
        product_description TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES auth_users (id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_rupture_entries_store_created
        ON rupture_entries (user_id, store_id, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_rupture_entries_product
        ON rupture_entries (user_id, store_id, shelf_code, product_id);
    `);
  },
};
