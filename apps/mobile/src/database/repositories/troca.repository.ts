import type {
  DatabaseExecutor,
  ExchangeEntryInsertInput,
  ExchangeEntryListRow,
  ExchangeEntryRow,
} from '@/src/database/types';
import { runInTransaction } from '@/src/database/client';
import { buildOperationalEntrySearch } from '@/src/database/repositories/operational-entry-search';
import { getReadyDatabase } from '@/src/database/repositories/shared';

async function resolveExecutor(db?: DatabaseExecutor): Promise<DatabaseExecutor> {
  return db ?? (await getReadyDatabase());
}

export async function insertExchangeEntry(
  input: ExchangeEntryInsertInput,
  db?: DatabaseExecutor,
): Promise<number> {
  const executor = await resolveExecutor(db);

  await executor.runAsync(
    `
      INSERT INTO exchange_entries (
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

export async function listExchangeEntriesByStore(payload: {
  userId: number;
  storeId: number;
  search?: string | null;
  limit?: number;
  offset?: number;
  db?: DatabaseExecutor;
}): Promise<ExchangeEntryListRow[]> {
  const executor = await resolveExecutor(payload.db);
  const search = buildOperationalEntrySearch(payload.search);

  return executor.getAllAsync<ExchangeEntryListRow>(
    `
      SELECT
        ee.local_id,
        ee.event_id,
        ee.user_id,
        ee.store_id,
        ee.reason_id,
        ee.reason_description,
        ee.product_id,
        ee.barcode,
        ee.product_description,
        ee.movement_type,
        ee.quantity_input,
        ee.package_count,
        ee.total_quantity,
        ee.created_at,
        ee.updated_at,
        soe.status AS outbox_status,
        soe.failure_class,
        soe.attempt_count,
        soe.last_attempt_at,
        soe.last_error_code,
        soe.last_error_message,
        soe.server_ack_status,
        soe.server_receipt_id,
        soe.server_processed_at
      FROM exchange_entries ee
      JOIN sync_outbox_events soe
        ON soe.event_id = ee.event_id
      WHERE ee.user_id = ?
        AND ee.store_id = ?
        AND (
          ? IS NULL
          OR CAST(ee.product_id AS TEXT) LIKE ?
          OR COALESCE(ee.barcode, '') LIKE ?
          OR LOWER(ee.product_description) LIKE ?
          OR LOWER(ee.reason_description) LIKE ?
        )
      ORDER BY
        CASE
          WHEN soe.status = 'success' THEN 1
          ELSE 0
        END ASC,
        ee.created_at DESC,
        ee.local_id DESC
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

export async function countExchangeEntriesByStore(payload: {
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
      FROM exchange_entries ee
      WHERE ee.user_id = ?
        AND ee.store_id = ?
        AND (
          ? IS NULL
          OR CAST(ee.product_id AS TEXT) LIKE ?
          OR COALESCE(ee.barcode, '') LIKE ?
          OR LOWER(ee.product_description) LIKE ?
          OR LOWER(ee.reason_description) LIKE ?
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

export async function getPendingExchangeSignedBalanceByProductAndReason(payload: {
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
              WHEN ee.movement_type = 'add' THEN ee.total_quantity
              ELSE -ee.total_quantity
            END
          ),
          0
        ) AS total
      FROM exchange_entries ee
      JOIN sync_outbox_events soe
        ON soe.event_id = ee.event_id
      WHERE ee.user_id = ?
        AND ee.store_id = ?
        AND ee.reason_id = ?
        AND ee.product_id = ?
        AND soe.status != 'success'
    `,
    [payload.userId, payload.storeId, payload.reasonId, payload.productId],
  );

  return Number(row?.total ?? 0);
}

export async function getExchangeSignedBalanceByProductAndReason(payload: {
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
      FROM exchange_entries
      WHERE user_id = ?
        AND store_id = ?
        AND reason_id = ?
        AND product_id = ?
    `,
    [payload.userId, payload.storeId, payload.reasonId, payload.productId],
  );

  return Number(row?.total ?? 0);
}

export async function deleteExchangeEntryWithOutboxByEventId(eventId: string): Promise<void> {
  const db = await getReadyDatabase();

  await runInTransaction(db, async () => {
    await db.runAsync('DELETE FROM exchange_entries WHERE event_id = ?', [eventId]);
    await db.runAsync('DELETE FROM sync_outbox_events WHERE event_id = ?', [eventId]);
  });
}

export async function getExchangeEntryByEventId(
  eventId: string,
  db?: DatabaseExecutor,
): Promise<ExchangeEntryRow | null> {
  const executor = await resolveExecutor(db);
  return executor.getFirstAsync<ExchangeEntryRow>(
    `
      SELECT *
      FROM exchange_entries
      WHERE event_id = ?
      LIMIT 1
    `,
    [eventId],
  );
}
