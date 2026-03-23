import { runInTransaction } from '@/src/database/client';
import { getReadyDatabase } from '@/src/database/repositories/shared';

export type ClearDataRoutineKey =
  | 'rupture'
  | 'troca'
  | 'consumo'
  | 'producao'
  | 'balanco';

type RoutineTableName =
  | 'rupture_entries'
  | 'exchange_entries'
  | 'consumption_entries'
  | 'production_entries'
  | 'balance_entries';

type ClearDataRoutineSummary = {
  routine: ClearDataRoutineKey;
  deletedEntries: number;
  deletedOutboxEvents: number;
};

const routineTableMap: Record<ClearDataRoutineKey, RoutineTableName> = {
  rupture: 'rupture_entries',
  troca: 'exchange_entries',
  consumo: 'consumption_entries',
  producao: 'production_entries',
  balanco: 'balance_entries',
};

function chunkValues<T>(values: readonly T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push([...values.slice(index, index + chunkSize)]);
  }

  return chunks;
}

async function countOutboxEventsByIds(
  eventIds: readonly string[],
  db: Awaited<ReturnType<typeof getReadyDatabase>>,
): Promise<number> {
  let total = 0;

  for (const batch of chunkValues(eventIds, 250)) {
    const placeholders = batch.map(() => '?').join(', ');
    const row = await db.getFirstAsync<{ total: number | null }>(
      `
        SELECT COUNT(*) AS total
        FROM sync_outbox_events
        WHERE event_id IN (${placeholders})
      `,
      batch,
    );

    total += Number(row?.total ?? 0);
  }

  return total;
}

async function deleteOutboxEventsByIds(
  eventIds: readonly string[],
  db: Awaited<ReturnType<typeof getReadyDatabase>>,
): Promise<void> {
  for (const batch of chunkValues(eventIds, 250)) {
    const placeholders = batch.map(() => '?').join(', ');
    await db.runAsync(
      `DELETE FROM sync_outbox_events WHERE event_id IN (${placeholders})`,
      batch,
    );
  }
}

export async function clearOperationalDataByScope(payload: {
  userId: number;
  storeId: number;
  routines: readonly ClearDataRoutineKey[];
}): Promise<ClearDataRoutineSummary[]> {
  const db = await getReadyDatabase();

  return runInTransaction(db, async () => {
    const summaries: ClearDataRoutineSummary[] = [];

    for (const routine of payload.routines) {
      const tableName = routineTableMap[routine];
      const rows = await db.getAllAsync<{ event_id: string }>(
        `
          SELECT event_id
          FROM ${tableName}
          WHERE user_id = ?
            AND store_id = ?
        `,
        [payload.userId, payload.storeId],
      );

      const eventIds = rows.map((row) => row.event_id);
      const deletedEntries = eventIds.length;

      await db.runAsync(
        `
          DELETE FROM ${tableName}
          WHERE user_id = ?
            AND store_id = ?
        `,
        [payload.userId, payload.storeId],
      );

      const deletedOutboxEvents =
        eventIds.length > 0 ? await countOutboxEventsByIds(eventIds, db) : 0;

      if (eventIds.length > 0) {
        await deleteOutboxEventsByIds(eventIds, db);
      }

      summaries.push({
        routine,
        deletedEntries,
        deletedOutboxEvents,
      });
    }

    return summaries;
  });
}
