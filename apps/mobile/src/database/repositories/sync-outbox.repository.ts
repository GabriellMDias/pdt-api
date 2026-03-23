import type {
  ClaimSyncOutboxBatchInput,
  DatabaseExecutor,
  SyncFailureClass,
  SyncOutboxEventFailureInput,
  SyncOutboxEventInsertInput,
  SyncOutboxEventRow,
  SyncOutboxEventSuccessInput,
  SyncOutboxEventStatus,
} from '@/src/database/types';
import { runInTransaction } from '@/src/database/client';
import { getReadyDatabase } from '@/src/database/repositories/shared';

async function resolveExecutor(db?: DatabaseExecutor): Promise<DatabaseExecutor> {
  return db ?? (await getReadyDatabase());
}

export async function insertSyncOutboxEvent(
  input: SyncOutboxEventInsertInput,
  db?: DatabaseExecutor,
): Promise<void> {
  const executor = await resolveExecutor(db);

  await executor.runAsync(
    `
      INSERT INTO sync_outbox_events (
        event_id,
        batch_id,
        event_type,
        aggregate_type,
        aggregate_key,
        store_id,
        user_id,
        device_id,
        schema_version,
        payload_json,
        payload_hash,
        status,
        failure_class,
        attempt_count,
        last_attempt_at,
        next_attempt_at,
        locked_at,
        locked_by,
        last_http_status,
        last_error_code,
        last_error_message,
        server_ack_status,
        server_receipt_id,
        server_processed_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.eventId,
      input.batchId ?? null,
      input.eventType,
      input.aggregateType,
      input.aggregateKey,
      input.storeId,
      input.userId,
      input.deviceId,
      input.schemaVersion,
      input.payloadJson,
      input.payloadHash,
      input.status ?? 'pending',
      input.failureClass ?? 'none',
      input.attemptCount ?? 0,
      input.lastAttemptAt ?? null,
      input.nextAttemptAt ?? null,
      input.lockedAt ?? null,
      input.lockedBy ?? null,
      input.lastHttpStatus ?? null,
      input.lastErrorCode ?? null,
      input.lastErrorMessage ?? null,
      input.serverAckStatus ?? null,
      input.serverReceiptId ?? null,
      input.serverProcessedAt ?? null,
      input.createdAt,
      input.updatedAt,
    ],
  );
}

export async function getSyncOutboxEventById(
  eventId: string,
  db?: DatabaseExecutor,
): Promise<SyncOutboxEventRow | null> {
  const executor = await resolveExecutor(db);
  return executor.getFirstAsync<SyncOutboxEventRow>(
    `
      SELECT *
      FROM sync_outbox_events
      WHERE event_id = ?
      LIMIT 1
    `,
    [eventId],
  );
}

export async function countSyncOutboxEventsByStatus(
  status: SyncOutboxEventStatus,
  failureClass?: SyncFailureClass,
  db?: DatabaseExecutor,
): Promise<number> {
  const executor = await resolveExecutor(db);

  const row = await executor.getFirstAsync<{ total: number }>(
    failureClass
      ? `
          SELECT COUNT(*) AS total
          FROM sync_outbox_events
          WHERE status = ? AND failure_class = ?
        `
      : `
          SELECT COUNT(*) AS total
          FROM sync_outbox_events
          WHERE status = ?
        `,
    failureClass ? [status, failureClass] : [status],
  );

  return Number(row?.total ?? 0);
}

export async function claimSyncOutboxBatch(
  input: ClaimSyncOutboxBatchInput,
  db?: DatabaseExecutor,
): Promise<SyncOutboxEventRow[]> {
  const executor = await resolveExecutor(db);
  const claimBatch = async () => {
    const events = await executor.getAllAsync<SyncOutboxEventRow>(
      `
        SELECT *
        FROM sync_outbox_events
        WHERE user_id = ?
          AND (? IS NULL OR store_id = ?)
          AND (? IS NULL OR event_type LIKE ?)
          AND (? IS NULL OR aggregate_key LIKE ?)
          AND (
            status = 'pending'
            OR (status = 'failed' AND failure_class = 'temporary')
          )
          AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
        ORDER BY created_at ASC, event_id ASC
        LIMIT ?
      `,
      [
        input.userId,
        input.storeId ?? null,
        input.storeId ?? null,
        input.eventTypePrefix ?? null,
        input.eventTypePrefix ? `${input.eventTypePrefix}%` : null,
        input.aggregateKeyPrefix ?? null,
        input.aggregateKeyPrefix ? `${input.aggregateKeyPrefix}%` : null,
        input.claimedAt,
        input.limit,
      ],
    );

    if (events.length === 0) {
      return [];
    }

    for (const event of events) {
      await executor.runAsync(
        `
          UPDATE sync_outbox_events
          SET
            batch_id = ?,
            status = 'sending',
            attempt_count = attempt_count + 1,
            last_attempt_at = ?,
            locked_at = ?,
            locked_by = ?,
            last_http_status = NULL,
            updated_at = ?
          WHERE event_id = ?
        `,
        [
          input.batchId,
          input.claimedAt,
          input.claimedAt,
          input.lockedBy,
          input.claimedAt,
          event.event_id,
        ],
      );
    }

    return executor.getAllAsync<SyncOutboxEventRow>(
      `
        SELECT *
        FROM sync_outbox_events
        WHERE batch_id = ?
        ORDER BY created_at ASC, event_id ASC
      `,
      [input.batchId],
    );
  };

  if (db) {
    return claimBatch();
  }

  return runInTransaction(executor, claimBatch);
}

export async function markSyncOutboxEventSuccess(
  input: SyncOutboxEventSuccessInput,
  db?: DatabaseExecutor,
): Promise<void> {
  const executor = await resolveExecutor(db);

  await executor.runAsync(
    `
      UPDATE sync_outbox_events
      SET
        status = 'success',
        failure_class = 'none',
        next_attempt_at = NULL,
        locked_at = NULL,
        locked_by = NULL,
        last_http_status = ?,
        last_error_code = NULL,
        last_error_message = NULL,
        server_ack_status = ?,
        server_receipt_id = ?,
        server_processed_at = ?,
        updated_at = ?
      WHERE event_id = ?
    `,
    [
      input.httpStatus ?? null,
      input.ackStatus,
      input.receiptId ?? null,
      input.processedAt ?? null,
      input.updatedAt,
      input.eventId,
    ],
  );
}

export async function markSyncOutboxEventFailure(
  input: SyncOutboxEventFailureInput,
  db?: DatabaseExecutor,
): Promise<void> {
  const executor = await resolveExecutor(db);

  await executor.runAsync(
    `
      UPDATE sync_outbox_events
      SET
        status = 'failed',
        failure_class = ?,
        next_attempt_at = ?,
        locked_at = NULL,
        locked_by = NULL,
        last_http_status = ?,
        last_error_code = ?,
        last_error_message = ?,
        server_ack_status = ?,
        updated_at = ?
      WHERE event_id = ?
    `,
    [
      input.failureClass,
      input.nextAttemptAt ?? null,
      input.httpStatus ?? null,
      input.errorCode ?? null,
      input.errorMessage ?? null,
      input.serverAckStatus ?? null,
      input.updatedAt,
      input.eventId,
    ],
  );
}

export async function deleteSyncOutboxEventById(
  eventId: string,
  db?: DatabaseExecutor,
): Promise<void> {
  const executor = await resolveExecutor(db);

  await executor.runAsync(
    `
      DELETE FROM sync_outbox_events
      WHERE event_id = ?
    `,
    [eventId],
  );
}
