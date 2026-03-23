import type {
  DatabaseExecutor,
  ProductionEntryInsertInput,
  ProductionEntryListRow,
  ProductionEntryRow,
} from '@/src/database/types';
import { runInTransaction } from '@/src/database/client';
import { buildOperationalEntrySearch } from '@/src/database/repositories/operational-entry-search';
import { getReadyDatabase } from '@/src/database/repositories/shared';

async function resolveExecutor(db?: DatabaseExecutor): Promise<DatabaseExecutor> {
  return db ?? (await getReadyDatabase());
}

export async function insertProductionEntry(
  input: ProductionEntryInsertInput,
  db?: DatabaseExecutor,
): Promise<number> {
  const executor = await resolveExecutor(db);

  await executor.runAsync(
    `
      INSERT INTO production_entries (
        event_id,
        user_id,
        store_id,
        recipe_id,
        recipe_description,
        product_id,
        product_description,
        quantity_input,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.eventId,
      input.userId,
      input.storeId,
      input.recipeId,
      input.recipeDescription,
      input.productId,
      input.productDescription,
      input.quantityInput,
      input.createdAt,
      input.updatedAt,
    ],
  );

  const row = await executor.getFirstAsync<{ id: number }>('SELECT last_insert_rowid() AS id');
  return Number(row?.id ?? 0);
}

export async function listProductionEntriesByStore(payload: {
  userId: number;
  storeId: number;
  search?: string | null;
  limit?: number;
  offset?: number;
  db?: DatabaseExecutor;
}): Promise<ProductionEntryListRow[]> {
  const executor = await resolveExecutor(payload.db);
  const search = buildOperationalEntrySearch(payload.search);

  return executor.getAllAsync<ProductionEntryListRow>(
    `
      SELECT
        pe.local_id,
        pe.event_id,
        pe.user_id,
        pe.store_id,
        pe.recipe_id,
        pe.recipe_description,
        pe.product_id,
        pe.product_description,
        pe.quantity_input,
        pe.created_at,
        pe.updated_at,
        soe.status AS outbox_status,
        soe.failure_class,
        soe.attempt_count,
        soe.last_attempt_at,
        soe.last_error_code,
        soe.last_error_message,
        soe.server_ack_status,
        soe.server_receipt_id,
        soe.server_processed_at
      FROM production_entries pe
      JOIN sync_outbox_events soe
        ON soe.event_id = pe.event_id
      WHERE pe.user_id = ?
        AND pe.store_id = ?
        AND (
          ? IS NULL
          OR CAST(pe.product_id AS TEXT) LIKE ?
          OR LOWER(pe.product_description) LIKE ?
          OR LOWER(pe.recipe_description) LIKE ?
        )
      ORDER BY
        CASE
          WHEN soe.status = 'success' THEN 1
          ELSE 0
        END ASC,
        pe.created_at DESC,
        pe.local_id DESC
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
      payload.limit ?? 100,
      payload.offset ?? 0,
    ],
  );
}

export async function countProductionEntriesByStore(payload: {
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
      FROM production_entries pe
      WHERE pe.user_id = ?
        AND pe.store_id = ?
        AND (
          ? IS NULL
          OR CAST(pe.product_id AS TEXT) LIKE ?
          OR LOWER(pe.product_description) LIKE ?
          OR LOWER(pe.recipe_description) LIKE ?
        )
    `,
    [
      payload.userId,
      payload.storeId,
      search.value,
      search.pattern,
      search.pattern,
      search.pattern,
    ],
  );

  return Number(row?.total ?? 0);
}

export async function deleteProductionEntryWithOutboxByEventId(eventId: string): Promise<void> {
  const db = await getReadyDatabase();

  await runInTransaction(db, async () => {
    await db.runAsync('DELETE FROM production_entries WHERE event_id = ?', [eventId]);
    await db.runAsync('DELETE FROM sync_outbox_events WHERE event_id = ?', [eventId]);
  });
}

export async function getProductionEntryByEventId(
  eventId: string,
  db?: DatabaseExecutor,
): Promise<ProductionEntryRow | null> {
  const executor = await resolveExecutor(db);
  return executor.getFirstAsync<ProductionEntryRow>(
    `
      SELECT *
      FROM production_entries
      WHERE event_id = ?
      LIMIT 1
    `,
    [eventId],
  );
}
