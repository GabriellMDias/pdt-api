import { runInTransaction } from '@/src/database/client';
import type {
  DatabaseExecutor,
  ExchangeReasonRow,
  ExchangeReasonUpsertInput,
} from '@/src/database/types';
import { getReadyDatabase } from '@/src/database/repositories/shared';

async function resolveExecutor(db?: DatabaseExecutor): Promise<DatabaseExecutor> {
  return db ?? (await getReadyDatabase());
}

export async function replaceExchangeReasons(
  reasons: readonly ExchangeReasonUpsertInput[],
  db?: DatabaseExecutor,
): Promise<void> {
  const executor = await resolveExecutor(db);

  const persist = async () => {
    await executor.runAsync('DELETE FROM exchange_reasons', []);

    for (const reason of reasons) {
      await executor.runAsync(
        `
          INSERT INTO exchange_reasons (
            id,
            description,
            active_status,
            synced_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?)
        `,
        [
          reason.id,
          reason.description,
          reason.activeStatus ? 1 : 0,
          reason.syncedAt,
          reason.updatedAt,
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

export async function listExchangeReasons(db?: DatabaseExecutor): Promise<ExchangeReasonRow[]> {
  const executor = await resolveExecutor(db);
  return executor.getAllAsync<ExchangeReasonRow>(
    `
      SELECT *
      FROM exchange_reasons
      WHERE active_status = 1
      ORDER BY description COLLATE NOCASE ASC, id ASC
    `,
    [],
  );
}

export async function getExchangeReasonById(
  reasonId: number,
  db?: DatabaseExecutor,
): Promise<ExchangeReasonRow | null> {
  const executor = await resolveExecutor(db);
  return executor.getFirstAsync<ExchangeReasonRow>(
    `
      SELECT *
      FROM exchange_reasons
      WHERE id = ?
      LIMIT 1
    `,
    [reasonId],
  );
}
