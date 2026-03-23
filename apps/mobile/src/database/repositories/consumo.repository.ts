import type {
  ConsumptionEntryInsertInput,
  ConsumptionEntryListRow,
  ConsumptionEntryRow,
  DatabaseExecutor,
} from '@/src/database/types';
import { runInTransaction } from '@/src/database/client';
import { buildOperationalEntrySearch } from '@/src/database/repositories/operational-entry-search';
import { getReadyDatabase } from '@/src/database/repositories/shared';

async function resolveExecutor(db?: DatabaseExecutor): Promise<DatabaseExecutor> {
  return db ?? (await getReadyDatabase());
}

export async function insertConsumptionEntry(
  input: ConsumptionEntryInsertInput,
  db?: DatabaseExecutor,
): Promise<number> {
  const executor = await resolveExecutor(db);

  await executor.runAsync(
    `
      INSERT INTO consumption_entries (
        event_id,
        user_id,
        store_id,
        reason_id,
        reason_description,
        product_id,
        barcode,
        product_description,
        movement_type,
        quantity_input,
        package_count,
        total_quantity,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.eventId,
      input.userId,
      input.storeId,
      input.reasonId,
      input.reasonDescription,
      input.productId,
      input.barcode ?? null,
      input.productDescription,
      input.movementType,
      input.quantityInput,
      input.packageCount,
      input.totalQuantity,
      input.createdAt,
      input.updatedAt,
    ],
  );

  const row = await executor.getFirstAsync<{ id: number }>('SELECT last_insert_rowid() AS id');
  return Number(row?.id ?? 0);
}

export async function listConsumptionEntriesByStore(payload: {
  userId: number;
  storeId: number;
  search?: string | null;
  limit?: number;
  offset?: number;
  db?: DatabaseExecutor;
}): Promise<ConsumptionEntryListRow[]> {
  const executor = await resolveExecutor(payload.db);
  const search = buildOperationalEntrySearch(payload.search);

  return executor.getAllAsync<ConsumptionEntryListRow>(
    `
      SELECT
        ce.local_id,
        ce.event_id,
        ce.user_id,
        ce.store_id,
        ce.reason_id,
        ce.reason_description,
        ce.product_id,
        ce.barcode,
        ce.product_description,
        ce.movement_type,
        ce.quantity_input,
        ce.package_count,
        ce.total_quantity,
        ce.created_at,
        ce.updated_at,
        soe.status AS outbox_status,
        soe.failure_class,
        soe.attempt_count,
        soe.last_attempt_at,
        soe.last_error_code,
        soe.last_error_message,
        soe.server_ack_status,
        soe.server_receipt_id,
        soe.server_processed_at
      FROM consumption_entries ce
      JOIN sync_outbox_events soe
        ON soe.event_id = ce.event_id
      WHERE ce.user_id = ?
        AND ce.store_id = ?
        AND (
          ? IS NULL
          OR CAST(ce.product_id AS TEXT) LIKE ?
          OR COALESCE(ce.barcode, '') LIKE ?
          OR LOWER(ce.product_description) LIKE ?
          OR LOWER(ce.reason_description) LIKE ?
        )
      ORDER BY
        CASE
          WHEN soe.status = 'success' THEN 1
          ELSE 0
        END ASC,
        ce.created_at DESC,
        ce.local_id DESC
      LIMIT ?
      OFFSET ?
    `,
    [
      payload.userId,
      payload.storeId,
      search.value,
      search.pattern,
      search.pattern,
      search.pattern,
      search.pattern,
      payload.limit ?? 100,
      payload.offset ?? 0,
    ],
  );
}

export async function countConsumptionEntriesByStore(payload: {
  userId: number;
  storeId: number;
  search?: string | null;
  db?: DatabaseExecutor;
}): Promise<number> {
  const executor = await resolveExecutor(payload.db);
  const search = buildOperationalEntrySearch(payload.search);

  const row = await executor.getFirstAsync<{ total: number | null }>(
    `
      SELECT COUNT(*) AS total
      FROM consumption_entries ce
      WHERE ce.user_id = ?
        AND ce.store_id = ?
        AND (
          ? IS NULL
          OR CAST(ce.product_id AS TEXT) LIKE ?
          OR COALESCE(ce.barcode, '') LIKE ?
          OR LOWER(ce.product_description) LIKE ?
          OR LOWER(ce.reason_description) LIKE ?
        )
    `,
    [
      payload.userId,
      payload.storeId,
      search.value,
      search.pattern,
      search.pattern,
      search.pattern,
      search.pattern,
    ],
  );

  return Number(row?.total ?? 0);
}

export async function getPendingConsumptionSignedBalanceByProductAndReason(payload: {
  userId: number;
  storeId: number;
  reasonId: number;
  productId: number;
  db?: DatabaseExecutor;
}): Promise<number> {
  const executor = await resolveExecutor(payload.db);

  const row = await executor.getFirstAsync<{ total: number | null }>(
    `
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN ce.movement_type = 'add' THEN ce.total_quantity
              ELSE -ce.total_quantity
            END
          ),
          0
        ) AS total
      FROM consumption_entries ce
      JOIN sync_outbox_events soe
        ON soe.event_id = ce.event_id
      WHERE ce.user_id = ?
        AND ce.store_id = ?
        AND ce.reason_id = ?
        AND ce.product_id = ?
        AND soe.status != 'success'
    `,
    [payload.userId, payload.storeId, payload.reasonId, payload.productId],
  );

  return Number(row?.total ?? 0);
}

export async function getConsumptionSignedBalanceByProductAndReason(payload: {
  userId: number;
  storeId: number;
  reasonId: number;
  productId: number;
  db?: DatabaseExecutor;
}): Promise<number> {
  const executor = await resolveExecutor(payload.db);

  const row = await executor.getFirstAsync<{ total: number | null }>(
    `
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN movement_type = 'add' THEN total_quantity
              ELSE -total_quantity
            END
          ),
          0
        ) AS total
      FROM consumption_entries
      WHERE user_id = ?
        AND store_id = ?
        AND reason_id = ?
        AND product_id = ?
    `,
    [payload.userId, payload.storeId, payload.reasonId, payload.productId],
  );

  return Number(row?.total ?? 0);
}

export async function deleteConsumptionEntryWithOutboxByEventId(eventId: string): Promise<void> {
  const db = await getReadyDatabase();

  await runInTransaction(db, async () => {
    await db.runAsync('DELETE FROM consumption_entries WHERE event_id = ?', [eventId]);
    await db.runAsync('DELETE FROM sync_outbox_events WHERE event_id = ?', [eventId]);
  });
}

export async function getConsumptionEntryByEventId(
  eventId: string,
  db?: DatabaseExecutor,
): Promise<ConsumptionEntryRow | null> {
  const executor = await resolveExecutor(db);
  return executor.getFirstAsync<ConsumptionEntryRow>(
    `
      SELECT *
      FROM consumption_entries
      WHERE event_id = ?
      LIMIT 1
    `,
    [eventId],
  );
}
