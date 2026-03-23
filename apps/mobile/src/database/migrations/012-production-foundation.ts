import type { SQLiteDatabase } from 'expo-sqlite';
import type { Migration } from '@/src/database/types';

const MIGRATION_LOG_PREFIX = '[mobile-db:migration:v13]';

async function runStatement(db: SQLiteDatabase, label: string, sql: string): Promise<void> {
  console.log(`${MIGRATION_LOG_PREFIX} ${label}`);
  await db.execAsync(sql);
}

export const migration012CreateProductionFoundation: Migration = {
  version: 13,
  name: 'create_production_foundation',
  up: async (db) => {
    await runStatement(
      db,
      'resetando estruturas locais de catalogo de producao',
      `
        DROP TABLE IF EXISTS production_recipe_inputs;
        DROP TABLE IF EXISTS production_recipe_outputs;
        DROP TABLE IF EXISTS production_recipes;
      `,
    );

    await runStatement(
      db,
      'criando tabela production_recipes',
      `
        CREATE TABLE IF NOT EXISTS production_recipes (
          id INTEGER NOT NULL,
          store_id INTEGER NOT NULL,
          description TEXT NOT NULL,
          active_status INTEGER NOT NULL DEFAULT 1,
          synced_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (id, store_id)
        );
      `,
    );

    await runStatement(
      db,
      'criando tabela production_recipe_outputs',
      `
        CREATE TABLE IF NOT EXISTS production_recipe_outputs (
          recipe_output_id INTEGER NOT NULL,
          recipe_id INTEGER NOT NULL,
          store_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          yield_quantity REAL,
          synced_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (recipe_output_id, store_id),
          FOREIGN KEY (recipe_id, store_id)
            REFERENCES production_recipes (id, store_id)
            ON DELETE CASCADE
        );
      `,
    );

    await runStatement(
      db,
      'criando tabela production_recipe_inputs',
      `
        CREATE TABLE IF NOT EXISTS production_recipe_inputs (
          recipe_input_id INTEGER NOT NULL,
          recipe_id INTEGER NOT NULL,
          store_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          recipe_package_quantity REAL,
          product_package_quantity REAL,
          deduct_stock INTEGER NOT NULL DEFAULT 0,
          conversion_factor REAL,
          synced_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (recipe_input_id, store_id),
          FOREIGN KEY (recipe_id, store_id)
            REFERENCES production_recipes (id, store_id)
            ON DELETE CASCADE
        );
      `,
    );

    await runStatement(
      db,
      'limpando metadados de ultima sync de receitas de producao',
      `
        DELETE FROM app_meta
        WHERE key LIKE 'catalog.production_recipes.last_synced_at.%';
      `,
    );

    await runStatement(
      db,
      'criando indice idx_production_recipes_store_active',
      `
        CREATE INDEX IF NOT EXISTS idx_production_recipes_store_active
          ON production_recipes (store_id, active_status, description);
      `,
    );

    await runStatement(
      db,
      'criando indice idx_production_recipe_outputs_recipe',
      `
        CREATE INDEX IF NOT EXISTS idx_production_recipe_outputs_recipe
          ON production_recipe_outputs (store_id, recipe_id, product_id);
      `,
    );

    await runStatement(
      db,
      'criando indice idx_production_recipe_inputs_recipe',
      `
        CREATE INDEX IF NOT EXISTS idx_production_recipe_inputs_recipe
          ON production_recipe_inputs (store_id, recipe_id, product_id);
      `,
    );

    await runStatement(
      db,
      'criando tabela production_entries',
      `
        CREATE TABLE IF NOT EXISTS production_entries (
          local_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          event_id TEXT NOT NULL UNIQUE,
          user_id INTEGER NOT NULL,
          store_id INTEGER NOT NULL,
          recipe_id INTEGER NOT NULL,
          recipe_description TEXT NOT NULL,
          product_id INTEGER NOT NULL,
          product_description TEXT NOT NULL,
          quantity_input REAL NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES auth_users (id) ON DELETE CASCADE
        );
      `,
    );

    await runStatement(
      db,
      'criando indice idx_production_entries_store_created',
      `
        CREATE INDEX IF NOT EXISTS idx_production_entries_store_created
          ON production_entries (user_id, store_id, created_at DESC);
      `,
    );

    await runStatement(
      db,
      'criando indice idx_production_entries_recipe',
      `
        CREATE INDEX IF NOT EXISTS idx_production_entries_recipe
          ON production_entries (user_id, store_id, recipe_id, product_id, created_at DESC);
      `,
    );
  },
};
