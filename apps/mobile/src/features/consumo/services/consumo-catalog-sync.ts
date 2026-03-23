import {
  finishSyncRun,
  insertSyncRun,
  replaceConsumptionReasons,
} from '@/src/database/repositories';
import { pullMobileSyncCatalog } from '@/src/features/mobile-sync/api/mobile-sync-api';
import {
  emitSyncMetricsLog,
  measureSyncPhase,
} from '@/src/features/sync/services/sync-performance';

export async function syncConsumptionReasonsCatalog(payload: {
  userId: number;
  storeId: number;
  triggerSource: string;
}): Promise<{ syncedAt: string; itemsCount: number }> {
  const startedAt = new Date().toISOString();
  const totalStartedAtMs = Date.now();
  const runId = await insertSyncRun({
    runType: 'pull',
    scope: 'consumption.catalog.reasons',
    storeId: payload.storeId,
    userId: payload.userId,
    triggerSource: payload.triggerSource,
    startedAt,
  });

  try {
    const requestMetric = await measureSyncPhase('request.catalog_pull', () =>
      pullMobileSyncCatalog({
        domain: 'consumption.reasons',
        storeId: payload.storeId,
      }),
    );
    const response = requestMetric.result;

    if (response.domain !== 'consumption.reasons') {
      throw new Error(`Catalogo inesperado retornado pela API: ${response.domain}.`);
    }

    const normalizationMetric = await measureSyncPhase('normalize.catalog_items', () =>
      response.items.map((item) => ({
        id: item.id,
        description: item.description,
        activeStatus: item.activeStatus,
        syncedAt: response.syncedAt,
        updatedAt: response.syncedAt,
      })),
    );
    const persistenceMetric = await measureSyncPhase('persist.catalog_items', () =>
      replaceConsumptionReasons(normalizationMetric.result),
    );
    const metrics = [
      {
        ...requestMetric.metric,
        itemsCount: response.items.length,
      },
      {
        ...normalizationMetric.metric,
        itemsCount: normalizationMetric.result.length,
      },
      {
        ...persistenceMetric.metric,
        itemsCount: normalizationMetric.result.length,
      },
    ];
    const totalDurationMs = Date.now() - totalStartedAtMs;

    emitSyncMetricsLog('consumption.catalog.reasons', {
      storeId: payload.storeId,
      itemsCount: response.items.length,
      totalDurationMs,
      metrics,
    });

    await finishSyncRun(runId, {
      status: 'success',
      finishedAt: new Date().toISOString(),
      responsePayloadJson: JSON.stringify({
        syncedAt: response.syncedAt,
        itemsCount: response.items.length,
        totalDurationMs,
        metrics,
      }),
    });

    return {
      syncedAt: response.syncedAt,
      itemsCount: response.items.length,
    };
  } catch (error) {
    await finishSyncRun(runId, {
      status: 'failed',
      finishedAt: new Date().toISOString(),
      errorCode: 'consumption_reasons_sync_failed',
      errorMessage:
        error instanceof Error ? error.message : 'Falha ao sincronizar os tipos de consumo.',
    });

    throw error;
  }
}
