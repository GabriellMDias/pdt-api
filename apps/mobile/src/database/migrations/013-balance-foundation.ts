import type { SQLiteDatabase } from 'expo-sqlite';
import type { Migration } from '@/src/database/types';

const MIGRATION_LOG_PREFIX = '[mobile-db:migration:v14]';

async function runStatement(db: SQLiteDatabase, label: string, sql: string): Promise<void> {
  console.log(`${MIGRATION_LOG_PREFIX} ${label}`);
  await db.execAsync(sql);
}

export const migration013CreateBalanceFoundation: Migration = {
  version: 14,
  name: 'create_balance_foundation',
  up: async (db) => {
    await runStatement(
      db,
      'criando tabela balance_headers',
      `
        CREATE TABLE IF NOT EXISTS balance_headers (
          id INTEGER NOT NULL,
          store_id INTEGER NOT NULL,
          description TEXT NOT NULL,
          stock_label TEXT NOT NULL,
          status_code INTEGER NOT NULL,
          synced_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (id, store_id)
        );
      `,
    );

    await runStatement(
      db,
      'criando indice idx_balance_headers_store_status',
      `
        CREATE INDEX IF NOT EXISTS idx_balance_headers_store_status
          ON balance_headers (store_id, status_code, description);
      `,
    );

    await runStatement(
      db,
      'criando tabela balance_entries',
      `
        CREATE TABLE IF NOT EXISTS balance_entries (
          local_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          event_id TEXT NOT NULL UNIQUE,
          user_id INTEGER NOT NULL,
          store_id INTEGER NOT NULL,
          balance_id INTEGER NOT NULL,
          balance_description TEXT NOT NULL,
          stock_label TEXT NOT NULL,
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
      'criando indice idx_balance_entries_store_balance_created',
      `
        CREATE INDEX IF NOT EXISTS idx_balance_entries_store_balance_created
          ON balance_entries (user_id, store_id, balance_id, created_at DESC, local_id DESC);
      `,
    );

    await runStatement(
      db,
      'criando indice idx_balance_entries_balance_product',
      `
        CREATE INDEX IF NOT EXISTS idx_balance_entries_balance_product
          ON balance_entries (user_id, store_id, balance_id, product_id, created_at DESC);
      `,
    );

    await runStatement(
      db,
      'criando indice idx_balance_entries_balance_barcode',
      `
        CREATE INDEX IF NOT EXISTS idx_balance_entries_balance_barcode
          ON balance_entries (user_id, store_id, balance_id, barcode);
      `,
    );
  },
};
