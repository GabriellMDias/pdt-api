import type { Migration } from '@/src/database/types';

export const migration005CreateSyncRuns: Migration = {
  version: 5,
  name: 'create_sync_runs',
  up: async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        run_type TEXT NOT NULL CHECK (run_type IN ('push', 'pull', 'reconcile')),
        scope TEXT NOT NULL,
        store_id INTEGER,
        user_id INTEGER,
        trigger_source TEXT NOT NULL DEFAULT 'system',
        status TEXT NOT NULL CHECK (status IN ('started', 'success', 'partial', 'failed')),
        started_at TEXT NOT NULL,
        finished_at TEXT,
        cursor_in TEXT,
        cursor_out TEXT,
        request_payload_json TEXT,
        response_payload_json TEXT,
        error_code TEXT,
        error_message TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sync_runs_status
        ON sync_runs (run_type, status, started_at DESC);

      CREATE INDEX IF NOT EXISTS idx_sync_runs_scope
        ON sync_runs (scope, store_id, user_id, started_at DESC);
    `);
  },
};
