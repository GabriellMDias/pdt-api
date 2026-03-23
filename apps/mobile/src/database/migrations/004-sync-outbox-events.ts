import type { Migration } from '@/src/database/types';
import type { SQLiteDatabase } from 'expo-sqlite';

const MIGRATION_LOG_PREFIX = '[mobile-db:migration:v4]';

type TableInfoRow = {
  name: string;
};

type SyncOutboxColumnDefinition = {
  name: string;
  createDefinition: string;
  addDefinition: string;
};

const syncOutboxColumns: readonly SyncOutboxColumnDefinition[] = [
  {
    name: 'event_id',
    createDefinition: 'event_id TEXT PRIMARY KEY NOT NULL',
    addDefinition: 'event_id TEXT',
  },
  {
    name: 'batch_id',
    createDefinition: 'batch_id TEXT',
    addDefinition: 'batch_id TEXT',
  },
  {
    name: 'event_type',
    createDefinition: 'event_type TEXT NOT NULL',
    addDefinition: 'event_type TEXT',
  },
  {
    name: 'aggregate_type',
    createDefinition: 'aggregate_type TEXT NOT NULL',
    addDefinition: 'aggregate_type TEXT',
  },
  {
    name: 'aggregate_key',
    createDefinition: 'aggregate_key TEXT NOT NULL',
    addDefinition: 'aggregate_key TEXT',
  },
  {
    name: 'store_id',
    createDefinition: 'store_id INTEGER NOT NULL',
    addDefinition: 'store_id INTEGER',
  },
  {
    name: 'user_id',
    createDefinition: 'user_id INTEGER NOT NULL',
    addDefinition: 'user_id INTEGER',
  },
  {
    name: 'device_id',
    createDefinition: 'device_id TEXT NOT NULL',
    addDefinition: 'device_id TEXT',
  },
  {
    name: 'schema_version',
    createDefinition: 'schema_version INTEGER NOT NULL',
    addDefinition: 'schema_version INTEGER',
  },
  {
    name: 'payload_json',
    createDefinition: 'payload_json TEXT NOT NULL',
    addDefinition: 'payload_json TEXT',
  },
  {
    name: 'payload_hash',
    createDefinition: 'payload_hash TEXT NOT NULL',
    addDefinition: 'payload_hash TEXT',
  },
  {
    name: 'status',
    createDefinition:
      "status TEXT NOT NULL CHECK (status IN ('pending', 'sending', 'success', 'failed'))",
    addDefinition: "status TEXT NOT NULL DEFAULT 'pending'",
  },
  {
    name: 'failure_class',
    createDefinition:
      "failure_class TEXT NOT NULL DEFAULT 'none' CHECK (failure_class IN ('none', 'temporary', 'permanent'))",
    addDefinition: "failure_class TEXT NOT NULL DEFAULT 'none'",
  },
  {
    name: 'attempt_count',
    createDefinition: 'attempt_count INTEGER NOT NULL DEFAULT 0',
    addDefinition: 'attempt_count INTEGER NOT NULL DEFAULT 0',
  },
  {
    name: 'last_attempt_at',
    createDefinition: 'last_attempt_at TEXT',
    addDefinition: 'last_attempt_at TEXT',
  },
  {
    name: 'next_attempt_at',
    createDefinition: 'next_attempt_at TEXT',
    addDefinition: 'next_attempt_at TEXT',
  },
  {
    name: 'locked_at',
    createDefinition: 'locked_at TEXT',
    addDefinition: 'locked_at TEXT',
  },
  {
    name: 'locked_by',
    createDefinition: 'locked_by TEXT',
    addDefinition: 'locked_by TEXT',
  },
  {
    name: 'last_http_status',
    createDefinition: 'last_http_status INTEGER',
    addDefinition: 'last_http_status INTEGER',
  },
  {
    name: 'last_error_code',
    createDefinition: 'last_error_code TEXT',
    addDefinition: 'last_error_code TEXT',
  },
  {
    name: 'last_error_message',
    createDefinition: 'last_error_message TEXT',
    addDefinition: 'last_error_message TEXT',
  },
  {
    name: 'server_ack_status',
    createDefinition: 'server_ack_status TEXT',
    addDefinition: 'server_ack_status TEXT',
  },
  {
    name: 'server_receipt_id',
    createDefinition: 'server_receipt_id TEXT',
    addDefinition: 'server_receipt_id TEXT',
  },
  {
    name: 'server_processed_at',
    createDefinition: 'server_processed_at TEXT',
    addDefinition: 'server_processed_at TEXT',
  },
  {
    name: 'created_at',
    createDefinition: 'created_at TEXT NOT NULL',
    addDefinition: 'created_at TEXT',
  },
  {
    name: 'updated_at',
    createDefinition: 'updated_at TEXT NOT NULL',
    addDefinition: 'updated_at TEXT',
  },
];

async function runStatement(db: SQLiteDatabase, label: string, sql: string): Promise<void> {
  console.log(`${MIGRATION_LOG_PREFIX} ${label}`);
  await db.execAsync(sql);
}

async function listColumns(db: SQLiteDatabase): Promise<Set<string>> {
  const rows = await db.getAllAsync<TableInfoRow>('PRAGMA table_info(sync_outbox_events)');
  return new Set(rows.map((row) => row.name));
}

async function ensureColumn(
  db: SQLiteDatabase,
  definition: SyncOutboxColumnDefinition,
): Promise<void> {
  const columns = await listColumns(db);

  if (columns.has(definition.name)) {
    console.log(`${MIGRATION_LOG_PREFIX} coluna ja existe: ${definition.name}`);
    return;
  }

  await runStatement(
    db,
    `adicionando coluna ${definition.name}`,
    `ALTER TABLE sync_outbox_events ADD COLUMN ${definition.addDefinition};`,
  );
}

export const migration004CreateSyncOutboxEvents: Migration = {
  version: 4,
  name: 'create_sync_outbox_events',
  up: async (db) => {
    await runStatement(
      db,
      'criando tabela sync_outbox_events',
      `
        CREATE TABLE IF NOT EXISTS sync_outbox_events (
          ${syncOutboxColumns.map((column) => column.createDefinition).join(',\n          ')}
        );
      `,
    );

    for (const column of syncOutboxColumns) {
      await ensureColumn(db, column);
    }

    await runStatement(
      db,
      'criando indice idx_sync_outbox_events_dispatch',
      `
        CREATE INDEX IF NOT EXISTS idx_sync_outbox_events_dispatch
          ON sync_outbox_events (status, failure_class, next_attempt_at, store_id, user_id, created_at);
      `,
    );

    await runStatement(
      db,
      'criando indice idx_sync_outbox_events_batch',
      `
        CREATE INDEX IF NOT EXISTS idx_sync_outbox_events_batch
          ON sync_outbox_events (batch_id);
      `,
    );

    await runStatement(
      db,
      'criando indice idx_sync_outbox_events_aggregate',
      `
        CREATE INDEX IF NOT EXISTS idx_sync_outbox_events_aggregate
          ON sync_outbox_events (aggregate_type, aggregate_key);
      `,
    );
  },
};
