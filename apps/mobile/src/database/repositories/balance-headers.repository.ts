import { runInTransaction } from '@/src/database/client';
import type {
  BalanceHeaderRow,
  BalanceHeaderUpsertInput,
  DatabaseExecutor,
} from '@/src/database/types';
import { getReadyDatabase } from '@/src/database/repositories/shared';

async function resolveExecutor(db?: DatabaseExecutor): Promise<DatabaseExecutor> {
  return db ?? (await getReadyDatabase());
}

export async function replaceBalanceHeadersForStore(
  storeId: number,
  headers: readonly BalanceHeaderUpsertInput[],
  db?: DatabaseExecutor,
): Promise<void> {
  const executor = await resolveExecutor(db);

  const persist = async () => {
    await executor.runAsync('DELETE FROM balance_headers WHERE store_id = ?', [storeId]);

    for (const header of headers) {
      await executor.runAsync(
        `
          INSERT INTO balance_headers (
            id,
            store_id,
            description,
            stock_label,
            status_code,
            synced_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          header.id,
          header.storeId,
          header.description,
          header.stockLabel,
          header.statusCode,
          header.syncedAt,
          header.updatedAt,
        ],
      );
    }
  };

  if (db) {
    await persist();
    return;
  }

  await runInTransaction(executor, persist);
}

export async function listBalanceHeadersByStore(
  storeId: number,
  db?: DatabaseExecutor,
): Promise<BalanceHeaderRow[]> {
  const executor = await resolveExecutor(db);
  return executor.getAllAsync<BalanceHeaderRow>(
    `
      SELECT *
      FROM balance_headers
      WHERE store_id = ?
      ORDER BY
        CASE
          WHEN status_code = 0 THEN 0
          ELSE 1
        END ASC,
        description COLLATE NOCASE ASC,
        id ASC
    `,
    [storeId],
  );
}

export async function listOpenBalanceHeadersByStore(
  storeId: number,
  db?: DatabaseExecutor,
): Promise<BalanceHeaderRow[]> {
  const executor = await resolveExecutor(db);
  return executor.getAllAsync<BalanceHeaderRow>(
    `
      SELECT *
      FROM balance_headers
      WHERE store_id = ?
        AND status_code = 0
      ORDER BY description COLLATE NOCASE ASC, id ASC
    `,
    [storeId],
  );
}

export async function getBalanceHeaderById(payload: {
  balanceId: number;
  storeId: number;
  db?: DatabaseExecutor;
}): Promise<BalanceHeaderRow | null> {
  const executor = await resolveExecutor(payload.db);
  return executor.getFirstAsync<BalanceHeaderRow>(
    `
      SELECT *
      FROM balance_headers
      WHERE id = ?
        AND store_id = ?
      LIMIT 1
    `,
    [payload.balanceId, payload.storeId],
  );
}
