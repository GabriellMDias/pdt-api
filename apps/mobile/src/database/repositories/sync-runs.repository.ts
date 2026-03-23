import type {
  DatabaseExecutor,
  SyncRunFinishInput,
  SyncRunInsertInput,
  SyncRunRow,
} from '@/src/database/types';
import { getReadyDatabase } from '@/src/database/repositories/shared';

async function resolveExecutor(db?: DatabaseExecutor): Promise<DatabaseExecutor> {
  return db ?? (await getReadyDatabase());
}

export async function insertSyncRun(
  input: SyncRunInsertInput,
  db?: DatabaseExecutor,
): Promise<number> {
  const executor = await resolveExecutor(db);
  const now = new Date().toISOString();

  await executor.runAsync(
    `
      INSERT INTO sync_runs (
        run_type,
        scope,
        store_id,
        user_id,
        trigger_source,
        status,
        started_at,
        finished_at,
        cursor_in,
        cursor_out,
        request_payload_json,
        response_payload_json,
        error_code,
        error_message,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.runType,
      input.scope,
      input.storeId ?? null,
      input.userId ?? null,
      input.triggerSource ?? 'system',
      input.status ?? 'started',
      input.startedAt,
      input.finishedAt ?? null,
      input.cursorIn ?? null,
      input.cursorOut ?? null,
      input.requestPayloadJson ?? null,
      input.responsePayloadJson ?? null,
      input.errorCode ?? null,
      input.errorMessage ?? null,
      now,
      now,
    ],
  );

  const row = await executor.getFirstAsync<{ id: number }>(
    'SELECT last_insert_rowid() AS id',
  );

  return Number(row?.id ?? 0);
}

export async function finishSyncRun(
  runId: number,
  input: SyncRunFinishInput,
  db?: DatabaseExecutor,
): Promise<void> {
  const executor = await resolveExecutor(db);

  await executor.runAsync(
    `
      UPDATE sync_runs
      SET
        status = ?,
        finished_at = ?,
        cursor_out = ?,
        response_payload_json = ?,
        error_code = ?,
        error_message = ?,
        updated_at = ?
      WHERE id = ?
    `,
    [
      input.status,
      input.finishedAt,
      input.cursorOut ?? null,
      input.responsePayloadJson ?? null,
      input.errorCode ?? null,
      input.errorMessage ?? null,
      input.finishedAt,
      runId,
    ],
  );
}

export async function getLatestSyncRun(
  runType: SyncRunRow['run_type'],
  scope: string,
  db?: DatabaseExecutor,
): Promise<SyncRunRow | null> {
  const executor = await resolveExecutor(db);
  return executor.getFirstAsync<SyncRunRow>(
    `
      SELECT *
      FROM sync_runs
      WHERE run_type = ? AND scope = ?
      ORDER BY started_at DESC, id DESC
      LIMIT 1
    `,
    [runType, scope],
  );
}
