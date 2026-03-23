import type { SQLiteDatabase } from 'expo-sqlite';
import type { Migration } from '@/src/database/types';

const MIGRATION_LOG_PREFIX = '[mobile-db:migration:v11]';

async function runStatement(db: SQLiteDatabase, label: string, sql: string): Promise<void> {
  console.log(`${MIGRATION_LOG_PREFIX} ${label}`);
  await db.execAsync(sql);
}

export const migration011CreateConsumptionFoundation: Migration = {
  version: 11,
  name: 'create_consumption_foundation',
  up: async (db) => {
    await runStatement(
      db,
      'criando tabela consumption_reasons',
      `
        CREATE TABLE IF NOT EXISTS consumption_reasons (
          id INTEGER PRIMARY KEY NOT NULL,
          description TEXT NOT NULL,
          active_status INTEGER NOT NULL DEFAULT 1,
          synced_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `,
    );

    await runStatement(
      db,
      'criando indice idx_consumption_reasons_active',
      `
        CREATE INDEX IF NOT EXISTS idx_consumption_reasons_active
          ON consumption_reasons (active_status, description);
      `,
    );

    await runStatement(
      db,
      'criando tabela consumption_entries',
      `
        CREATE TABLE IF NOT EXISTS consumption_entries (
          local_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          event_id TEXT NOT NULL UNIQUE,
          user_id INTEGER NOT NULL,
          store_id INTEGER NOT NULL,
          reason_id INTEGER NOT NULL,
          reason_description TEXT NOT NULL,
          product_id INTEGER NOT NULL,
          barcode TEXT,
          product_description TEXT NOT NULL,
          movement_type TEXT NOT NULL CHECK (movement_type IN ('add', 'remove')),
          quantity_input REAL NOT NULL,
          package_count REAL NOT NULL,
          total_quantity REAL NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES auth_users (id) ON DELETE CASCADE
        );
      `,
    );

    await runStatement(
      db,
      'criando indice idx_consumption_entries_store_created',
      `
        CREATE INDEX IF NOT EXISTS idx_consumption_entries_store_created
          ON consumption_entries (user_id, store_id, created_at DESC);
      `,
    );

    await runStatement(
      db,
      'criando indice idx_consumption_entries_reason_product',
      `
        CREATE INDEX IF NOT EXISTS idx_consumption_entries_reason_product
          ON consumption_entries (user_id, store_id, reason_id, product_id, created_at DESC);
      `,
    );
  },
};
