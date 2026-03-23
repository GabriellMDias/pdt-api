import type {
  BalanceEntryInsertInput,
  BalanceEntryListRow,
  BalanceEntryRow,
  BalanceGroupListRow,
  DatabaseExecutor,
} from '@/src/database/types';
import { runInTransaction } from '@/src/database/client';
import { getReadyDatabase } from '@/src/database/repositories/shared';

async function resolveExecutor(db?: DatabaseExecutor): Promise<DatabaseExecutor> {
  return db ?? (await getReadyDatabase());
}

function buildSearchClause(search?: string | null) {
  const normalized = search?.trim().toLowerCase() ?? '';

  if (!normalized) {
    return {
      value: null,
      pattern: null,
    };
  }

  return {
    value: normalized,
    pattern: `%${normalized}%`,
  };
}

export async function insertBalanceEntry(
  input: BalanceEntryInsertInput,
  db?: DatabaseExecutor,
): Promise<number> {
  const executor = await resolveExecutor(db);

  await executor.runAsync(
    `
      INSERT INTO balance_entries (
        event_id,
        user_id,
        store_id,
        balance_id,
        balance_description,
        stock_label,
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.eventId,
      input.userId,
      input.storeId,
      input.balanceId,
      input.balanceDescription,
      input.stockLabel,
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

export async function listBalanceEntriesByBalance(payload: {
  userId: number;
  storeId: number;
  balanceId: number;
  search?: string | null;
  limit?: number;
  offset?: number;
  db?: DatabaseExecutor;
}): Promise<BalanceEntryListRow[]> {
  const executor = await resolveExecutor(payload.db);
  const search = buildSearchClause(payload.search);

  return executor.getAllAsync<BalanceEntryListRow>(
    `
      SELECT
        be.local_id,
        be.event_id,
        be.user_id,
        be.store_id,
        be.balance_id,
        be.balance_description,
        be.stock_label,
        be.product_id,
        be.barcode,
        be.product_description,
        be.movement_type,
        be.quantity_input,
        be.package_count,
        be.total_quantity,
        be.created_at,
        be.updated_at,
        soe.status AS outbox_status,
        soe.failure_class,
        soe.attempt_count,
        soe.last_attempt_at,
        soe.last_error_code,
        soe.last_error_message,
        soe.server_ack_status,
        soe.server_receipt_id,
        soe.server_processed_at
      FROM balance_entries be
      JOIN sync_outbox_events soe
        ON soe.event_id = be.event_id
      WHERE be.user_id = ?
        AND be.store_id = ?
        AND be.balance_id = ?
        AND (
          ? IS NULL
          OR CAST(be.product_id AS TEXT) LIKE ?
          OR COALESCE(be.barcode, '') LIKE ?
          OR LOWER(be.product_description) LIKE ?
        )
      ORDER BY
        CASE
          WHEN soe.status = 'success' THEN 1
          ELSE 0
        END ASC,
        be.created_at DESC,
        be.local_id DESC
      LIMIT ?
      OFFSET ?
    `,
    [
      payload.userId,
      payload.storeId,
      payload.balanceId,
      search.value,
      search.pattern,
      search.pattern,
      search.pattern,
      payload.limit ?? 100,
      payload.offset ?? 0,
    ],
  );
}

export async function countBalanceEntriesByBalance(payload: {
  userId: number;
  storeId: number;
  balanceId: number;
  search?: string | null;
  db?: DatabaseExecutor;
}): Promise<number> {
  const executor = await resolveExecutor(payload.db);
  const search = buildSearchClause(payload.search);

  const row = await executor.getFirstAsync<{ total: number | null }>(
    `
      SELECT COUNT(*) AS total
      FROM balance_entries be
      WHERE be.user_id = ?
        AND be.store_id = ?
        AND be.balance_id = ?
        AND (
          ? IS NULL
          OR CAST(be.product_id AS TEXT) LIKE ?
          OR COALESCE(be.barcode, '') LIKE ?
          OR LOWER(be.product_description) LIKE ?
        )
    `,
    [
      payload.userId,
      payload.storeId,
      payload.balanceId,
      search.value,
      search.pattern,
      search.pattern,
      search.pattern,
    ],
  );

  return Number(row?.total ?? 0);
}

export async function listBalanceGroupsByStore(payload: {
  userId: number;
  storeId: number;
  db?: DatabaseExecutor;
}): Promise<BalanceGroupListRow[]> {
  const executor = await resolveExecutor(payload.db);

  return executor.getAllAsync<BalanceGroupListRow>(
    `
      SELECT
        be.balance_id,
        be.store_id,
        COALESCE(bh.description, MIN(be.balance_description)) AS balance_description,
        COALESCE(bh.stock_label, MIN(be.stock_label)) AS stock_label,
        bh.status_code,
        COUNT(*) AS total_entries,
        SUM(CASE WHEN soe.status = 'success' THEN 1 ELSE 0 END) AS sent_entries,
        SUM(CASE WHEN soe.status != 'success' THEN 1 ELSE 0 END) AS not_transmitted_entries,
        SUM(CASE WHEN soe.status = 'sending' THEN 1 ELSE 0 END) AS sending_entries,
        SUM(
          CASE
            WHEN soe.status = 'failed' AND soe.failure_class = 'temporary' THEN 1
            ELSE 0
          END
        ) AS temporary_error_entries,
        SUM(
          CASE
            WHEN soe.status = 'failed' AND soe.failure_class = 'permanent' THEN 1
            ELSE 0
          END
        ) AS permanent_error_entries,
        MAX(be.created_at) AS last_entry_created_at
      FROM balance_entries be
      JOIN sync_outbox_events soe
        ON soe.event_id = be.event_id
      LEFT JOIN balance_headers bh
        ON bh.id = be.balance_id
       AND bh.store_id = be.store_id
      WHERE be.user_id = ?
        AND be.store_id = ?
      GROUP BY
        be.balance_id,
        be.store_id,
        bh.description,
        bh.stock_label,
        bh.status_code
      ORDER BY last_entry_created_at DESC, be.balance_id DESC
    `,
    [payload.userId, payload.storeId],
  );
}

export async function getPendingBalanceSignedBalanceByProduct(payload: {
  userId: number;
  storeId: number;
  balanceId: number;
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
              WHEN be.movement_type = 'add' THEN be.total_quantity
              ELSE -be.total_quantity
            END
          ),
          0
        ) AS total
      FROM balance_entries be
      JOIN sync_outbox_events soe
        ON soe.event_id = be.event_id
      WHERE be.user_id = ?
        AND be.store_id = ?
        AND be.balance_id = ?
        AND be.product_id = ?
        AND soe.status != 'success'
    `,
    [payload.userId, payload.storeId, payload.balanceId, payload.productId],
  );

  return Number(row?.total ?? 0);
}

export async function getBalanceSignedBalanceByProduct(payload: {
  userId: number;
  storeId: number;
  balanceId: number;
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
      FROM balance_entries
      WHERE user_id = ?
        AND store_id = ?
        AND balance_id = ?
        AND product_id = ?
    `,
    [payload.userId, payload.storeId, payload.balanceId, payload.productId],
  );

  return Number(row?.total ?? 0);
}

export async function deleteBalanceEntryWithOutboxByEventId(eventId: string): Promise<void> {
  const db = await getReadyDatabase();

  await runInTransaction(db, async () => {
    await db.runAsync('DELETE FROM balance_entries WHERE event_id = ?', [eventId]);
    await db.runAsync('DELETE FROM sync_outbox_events WHERE event_id = ?', [eventId]);
  });
}

export async function deleteBalanceEntriesByBalanceWithOutbox(payload: {
  userId: number;
  storeId: number;
  balanceId: number;
}): Promise<void> {
  const db = await getReadyDatabase();

  await runInTransaction(db, async () => {
    const rows = await db.getAllAsync<{ event_id: string }>(
      `
        SELECT event_id
        FROM balance_entries
        WHERE user_id = ?
          AND store_id = ?
          AND balance_id = ?
      `,
      [payload.userId, payload.storeId, payload.balanceId],
    );

    if (rows.length === 0) {
      return;
    }

    const placeholders = rows.map(() => '?').join(', ');
    const eventIds = rows.map((row) => row.event_id);

    await db.runAsync(
      `DELETE FROM balance_entries WHERE event_id IN (${placeholders})`,
      eventIds,
    );
    await db.runAsync(
      `DELETE FROM sync_outbox_events WHERE event_id IN (${placeholders})`,
      eventIds,
    );
  });
}

export async function getBalanceEntryByEventId(
  eventId: string,
  db?: DatabaseExecutor,
): Promise<BalanceEntryRow | null> {
  const executor = await resolveExecutor(db);
  return executor.getFirstAsync<BalanceEntryRow>(
    `
      SELECT *
      FROM balance_entries
      WHERE event_id = ?
      LIMIT 1
    `,
    [eventId],
  );
}
