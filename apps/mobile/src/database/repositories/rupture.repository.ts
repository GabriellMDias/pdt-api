import type {
  DatabaseExecutor,
  RuptureEntryInsertInput,
  RuptureEntryListRow,
  RuptureEntryRow,
} from '@/src/database/types';
import { runInTransaction } from '@/src/database/client';
import { buildOperationalEntrySearch } from '@/src/database/repositories/operational-entry-search';
import { getReadyDatabase } from '@/src/database/repositories/shared';

async function resolveExecutor(db?: DatabaseExecutor): Promise<DatabaseExecutor> {
  return db ?? (await getReadyDatabase());
}

export async function insertRuptureEntry(
  input: RuptureEntryInsertInput,
  db?: DatabaseExecutor,
): Promise<number> {
  const executor = await resolveExecutor(db);

  await executor.runAsync(
    `
      INSERT INTO rupture_entries (
        event_id,
        user_id,
        store_id,
        shelf_code,
        product_id,
        barcode,
        product_description,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.eventId,
      input.userId,
      input.storeId,
      input.shelfCode,
      input.productId,
      input.barcode ?? null,
      input.productDescription,
      input.createdAt,
      input.updatedAt,
    ],
  );

  const row = await executor.getFirstAsync<{ id: number }>(
    'SELECT last_insert_rowid() AS id',
  );

  return Number(row?.id ?? 0);
}

export async function findPendingRuptureEntryByShelfAndProduct(payload: {
  userId: number;
  storeId: number;
  shelfCode: string;
  productId: number;
  db?: DatabaseExecutor;
}): Promise<RuptureEntryRow | null> {
  const executor = await resolveExecutor(payload.db);

  return executor.getFirstAsync<RuptureEntryRow>(
    `
      SELECT re.*
      FROM rupture_entries re
      JOIN sync_outbox_events soe
        ON soe.event_id = re.event_id
      WHERE re.user_id = ?
        AND re.store_id = ?
        AND re.shelf_code = ?
        AND re.product_id = ?
        AND soe.status != 'success'
      ORDER BY re.created_at DESC, re.local_id DESC
      LIMIT 1
    `,
    [payload.userId, payload.storeId, payload.shelfCode, payload.productId],
  );
}

export async function listRuptureEntriesByStore(payload: {
  userId: number;
  storeId: number;
  search?: string | null;
  limit?: number;
  offset?: number;
  db?: DatabaseExecutor;
}): Promise<RuptureEntryListRow[]> {
  const executor = await resolveExecutor(payload.db);
  const search = buildOperationalEntrySearch(payload.search);

  return executor.getAllAsync<RuptureEntryListRow>(
    `
      SELECT
        re.local_id,
        re.event_id,
        re.user_id,
        re.store_id,
        re.shelf_code,
        re.product_id,
        re.barcode,
        re.product_description,
        re.created_at,
        re.updated_at,
        soe.status AS outbox_status,
        soe.failure_class,
        soe.attempt_count,
        soe.last_attempt_at,
        soe.last_error_code,
        soe.last_error_message,
        soe.server_ack_status,
        soe.server_receipt_id,
        soe.server_processed_at
      FROM rupture_entries re
      JOIN sync_outbox_events soe
        ON soe.event_id = re.event_id
      WHERE re.user_id = ?
        AND re.store_id = ?
        AND (
          ? IS NULL
          OR CAST(re.product_id AS TEXT) LIKE ?
          OR COALESCE(re.barcode, '') LIKE ?
          OR LOWER(re.product_description) LIKE ?
          OR LOWER(re.shelf_code) LIKE ?
        )
      ORDER BY
        CASE
          WHEN soe.status = 'success' THEN 1
          ELSE 0
        END ASC,
        re.created_at DESC,
        re.local_id DESC
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

export async function countRuptureEntriesByStore(payload: {
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
      FROM rupture_entries re
      WHERE re.user_id = ?
        AND re.store_id = ?
        AND (
          ? IS NULL
          OR CAST(re.product_id AS TEXT) LIKE ?
          OR COALESCE(re.barcode, '') LIKE ?
          OR LOWER(re.product_description) LIKE ?
          OR LOWER(re.shelf_code) LIKE ?
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

export async function deleteRuptureEntryByEventId(
  eventId: string,
  db?: DatabaseExecutor,
): Promise<void> {
  const executor = await resolveExecutor(db);

  await executor.runAsync(
    `
      DELETE FROM rupture_entries
      WHERE event_id = ?
    `,
    [eventId],
  );
}

export async function deleteRuptureEntryWithOutboxByEventId(
  eventId: string,
): Promise<void> {
  const db = await getReadyDatabase();

  await runInTransaction(db, async () => {
    await db.runAsync('DELETE FROM rupture_entries WHERE event_id = ?', [eventId]);
    await db.runAsync('DELETE FROM sync_outbox_events WHERE event_id = ?', [eventId]);
  });
}
