import { runInTransaction } from '@/src/database/client';
import type {
  ConsumptionReasonRow,
  ConsumptionReasonUpsertInput,
  DatabaseExecutor,
} from '@/src/database/types';
import { getReadyDatabase } from '@/src/database/repositories/shared';

async function resolveExecutor(db?: DatabaseExecutor): Promise<DatabaseExecutor> {
  return db ?? (await getReadyDatabase());
}

export async function replaceConsumptionReasons(
  reasons: readonly ConsumptionReasonUpsertInput[],
  db?: DatabaseExecutor,
): Promise<void> {
  const executor = await resolveExecutor(db);

  const persist = async () => {
    await executor.runAsync('DELETE FROM consumption_reasons', []);

    for (const reason of reasons) {
      await executor.runAsync(
        `
          INSERT INTO consumption_reasons (
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

export async function listConsumptionReasons(
  db?: DatabaseExecutor,
): Promise<ConsumptionReasonRow[]> {
  const executor = await resolveExecutor(db);
  return executor.getAllAsync<ConsumptionReasonRow>(
    `
      SELECT *
      FROM consumption_reasons
      WHERE active_status = 1
      ORDER BY description COLLATE NOCASE ASC, id ASC
    `,
    [],
  );
}

export async function getConsumptionReasonById(
  reasonId: number,
  db?: DatabaseExecutor,
): Promise<ConsumptionReasonRow | null> {
  const executor = await resolveExecutor(db);
  return executor.getFirstAsync<ConsumptionReasonRow>(
    `
      SELECT *
      FROM consumption_reasons
      WHERE id = ?
      LIMIT 1
    `,
    [reasonId],
  );
}
