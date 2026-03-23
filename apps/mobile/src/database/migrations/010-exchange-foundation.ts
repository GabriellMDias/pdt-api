import type { SQLiteDatabase } from 'expo-sqlite';
import type { Migration } from '@/src/database/types';

const MIGRATION_LOG_PREFIX = '[mobile-db:migration:v10]';

type TableInfoRow = {
  name: string;
};

type CatalogProductColumnDefinition = {
  name: string;
  addDefinition: string;
};

const catalogProductColumns: readonly CatalogProductColumnDefinition[] = [
  {
    name: 'decimal_allowed',
    addDefinition: 'decimal_allowed INTEGER NOT NULL DEFAULT 0',
  },
  {
    name: 'sale_price',
    addDefinition: 'sale_price REAL',
  },
  {
    name: 'stock_quantity',
    addDefinition: 'stock_quantity REAL',
  },
  {
    name: 'exchange_quantity',
    addDefinition: 'exchange_quantity REAL',
  },
  {
    name: 'average_cost_with_tax',
    addDefinition: 'average_cost_with_tax REAL',
  },
  {
    name: 'gross_weight',
    addDefinition: 'gross_weight REAL',
  },
];

async function runStatement(db: SQLiteDatabase, label: string, sql: string): Promise<void> {
  console.log(`${MIGRATION_LOG_PREFIX} ${label}`);
  await db.execAsync(sql);
}

async function listColumns(db: SQLiteDatabase, tableName: string): Promise<Set<string>> {
  const rows = await db.getAllAsync<TableInfoRow>(`PRAGMA table_info(${tableName})`);
  return new Set(rows.map((row) => row.name));
}

async function ensureCatalogProductColumn(
  db: SQLiteDatabase,
  definition: CatalogProductColumnDefinition,
): Promise<void> {
  const columns = await listColumns(db, 'catalog_products');

  if (columns.has(definition.name)) {
    console.log(`${MIGRATION_LOG_PREFIX} coluna ja existe: catalog_products.${definition.name}`);
    return;
  }

  await runStatement(
    db,
    `adicionando coluna catalog_products.${definition.name}`,
    `ALTER TABLE catalog_products ADD COLUMN ${definition.addDefinition};`,
  );
}

export const migration010CreateExchangeFoundation: Migration = {
  version: 10,
  name: 'create_exchange_foundation',
  up: async (db) => {
    for (const column of catalogProductColumns) {
      await ensureCatalogProductColumn(db, column);
    }

    await runStatement(
      db,
      'criando tabela exchange_reasons',
      `
        CREATE TABLE IF NOT EXISTS exchange_reasons (
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
      'criando indice idx_exchange_reasons_active',
      `
        CREATE INDEX IF NOT EXISTS idx_exchange_reasons_active
          ON exchange_reasons (active_status, description);
      `,
    );

    await runStatement(
      db,
      'criando tabela exchange_entries',
      `
        CREATE TABLE IF NOT EXISTS exchange_entries (
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
      'criando indice idx_exchange_entries_store_created',
      `
        CREATE INDEX IF NOT EXISTS idx_exchange_entries_store_created
          ON exchange_entries (user_id, store_id, created_at DESC);
      `,
    );

    await runStatement(
      db,
      'criando indice idx_exchange_entries_reason_product',
      `
        CREATE INDEX IF NOT EXISTS idx_exchange_entries_reason_product
          ON exchange_entries (user_id, store_id, reason_id, product_id, created_at DESC);
      `,
    );
  },
};
