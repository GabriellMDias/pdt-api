import { flushPendingSyncOutbox } from '@/src/features/mobile-sync/services/mobile-sync-service';
import { getReadyDatabase } from '@/src/database/repositories/shared';
import { DEV_LOCAL_SEED_ENABLED } from '@/src/features/dev-seed/config';
import type {
  DevPerformanceRoutineCounts,
  DevPerformanceTransmitResult,
  DevSeedRoutineKey,
} from '@/src/features/dev-seed/types';

const ROUTINE_CONFIG: Record<
  DevSeedRoutineKey,
  {
    tableName:
      | 'rupture_entries'
      | 'exchange_entries'
      | 'consumption_entries'
      | 'production_entries'
      | 'balance_entries';
    eventTypePrefix: string;
    scope: string;
  }
> = {
  rupture: {
    tableName: 'rupture_entries',
    eventTypePrefix: 'rupture.',
    scope: 'rupture.push',
  },
  troca: {
    tableName: 'exchange_entries',
    eventTypePrefix: 'exchange.',
    scope: 'exchange.push',
  },
  consumo: {
    tableName: 'consumption_entries',
    eventTypePrefix: 'consumption.',
    scope: 'consumption.push',
  },
  producao: {
    tableName: 'production_entries',
    eventTypePrefix: 'production.',
    scope: 'production.push',
  },
  balanco: {
    tableName: 'balance_entries',
    eventTypePrefix: 'balance.',
    scope: 'balance.push',
  },
};

function assertDevSeedEnabled(): void {
  if (!DEV_LOCAL_SEED_ENABLED) {
    throw new Error('O debug de performance nao esta disponivel nesta build.');
  }
}

export async function getDevPerformanceCounts(payload: {
  routineKey: DevSeedRoutineKey;
  userId: number;
  storeId: number;
}): Promise<DevPerformanceRoutineCounts> {
  assertDevSeedEnabled();

  const db = await getReadyDatabase();
  const config = ROUTINE_CONFIG[payload.routineKey];
  const row = await db.getFirstAsync<{
    total: number | null;
    pending: number | null;
    sent: number | null;
    sending: number | null;
    temporary_errors: number | null;
    permanent_errors: number | null;
  }>(
    `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN soe.status != 'success' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN soe.status = 'success' THEN 1 ELSE 0 END) AS sent,
        SUM(CASE WHEN soe.status = 'sending' THEN 1 ELSE 0 END) AS sending,
        SUM(
          CASE
            WHEN soe.status = 'failed' AND soe.failure_class = 'temporary' THEN 1
            ELSE 0
          END
        ) AS temporary_errors,
        SUM(
          CASE
            WHEN soe.status = 'failed' AND soe.failure_class = 'permanent' THEN 1
            ELSE 0
          END
        ) AS permanent_errors
      FROM ${config.tableName} entry
      JOIN sync_outbox_events soe
        ON soe.event_id = entry.event_id
      WHERE entry.user_id = ?
        AND entry.store_id = ?
    `,
    [payload.userId, payload.storeId],
  );

  return {
    routineKey: payload.routineKey,
    total: Number(row?.total ?? 0),
    pending: Number(row?.pending ?? 0),
    sent: Number(row?.sent ?? 0),
    sending: Number(row?.sending ?? 0),
    temporaryErrors: Number(row?.temporary_errors ?? 0),
    permanentErrors: Number(row?.permanent_errors ?? 0),
  };
}

export async function getAllDevPerformanceCounts(payload: {
  userId: number;
  storeId: number;
}): Promise<DevPerformanceRoutineCounts[]> {
  assertDevSeedEnabled();

  const routines: DevSeedRoutineKey[] = [
    'rupture',
    'troca',
    'consumo',
    'producao',
    'balanco',
  ];

  const counts = await Promise.all(
    routines.map((routineKey) =>
      getDevPerformanceCounts({
        routineKey,
        userId: payload.userId,
        storeId: payload.storeId,
      }),
    ),
  );

  return counts;
}

export async function transmitDevPerformanceRoutine(payload: {
  routineKey: DevSeedRoutineKey;
  userId: number;
  storeId: number;
}): Promise<DevPerformanceTransmitResult> {
  assertDevSeedEnabled();

  const config = ROUTINE_CONFIG[payload.routineKey];
  const startedAt = Date.now();
  const result = await flushPendingSyncOutbox({
    userId: payload.userId,
    storeId: payload.storeId,
    eventTypePrefix: config.eventTypePrefix,
    scope: config.scope,
    triggerSource: 'debug_performance_screen',
    batchLimit: 100,
  });

  return {
    routineKey: payload.routineKey,
    durationMs: Date.now() - startedAt,
    batchCount: result.batchCount,
    eventCount: result.eventCount,
    processed: result.processed,
    duplicates: result.duplicates,
    temporaryErrors: result.temporaryErrors,
    permanentErrors: result.permanentErrors,
  };
}
