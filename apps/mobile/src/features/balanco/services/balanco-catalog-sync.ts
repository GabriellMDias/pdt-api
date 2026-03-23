import {
  finishSyncRun,
  insertSyncRun,
  replaceBalanceHeadersForStore,
} from '@/src/database/repositories';
import { pullMobileSyncCatalog } from '@/src/features/mobile-sync/api/mobile-sync-api';
import {
  emitSyncMetricsLog,
  measureSyncPhase,
} from '@/src/features/sync/services/sync-performance';
import { setBalanceCatalogLastSyncedAt } from '@/src/features/balanco/data/balanco-db';

export async function syncBalanceHeadersCatalog(payload: {
  userId: number;
  storeId: number;
  triggerSource: string;
}): Promise<{ syncedAt: string; itemsCount: number }> {
  const startedAt = new Date().toISOString();
  const totalStartedAtMs = Date.now();
  const runId = await insertSyncRun({
    runType: 'pull',
    scope: 'balance.catalog.headers',
    storeId: payload.storeId,
    userId: payload.userId,
    triggerSource: payload.triggerSource,
    startedAt,
  });

  try {
    const requestMetric = await measureSyncPhase('request.catalog_pull', () =>
      pullMobileSyncCatalog({
        domain: 'balance.headers',
        storeId: payload.storeId,
      }),
    );
    const response = requestMetric.result;

    if (response.domain !== 'balance.headers') {
      throw new Error(`Catalogo inesperado retornado pela API: ${response.domain}.`);
    }

    const normalizationMetric = await measureSyncPhase('normalize.catalog_items', () =>
      response.items.map((item) => ({
        id: item.id,
        storeId: response.storeId,
        description: item.description,
        stockLabel: item.stockLabel,
        statusCode: item.statusCode,
        syncedAt: response.syncedAt,
        updatedAt: response.syncedAt,
      })),
    );
    const persistenceMetric = await measureSyncPhase('persist.catalog_items', () =>
      replaceBalanceHeadersForStore(payload.storeId, normalizationMetric.result),
    );

    const metaMetric = await measureSyncPhase('persist.catalog_meta', () =>
      setBalanceCatalogLastSyncedAt(payload.userId, payload.storeId, response.syncedAt),
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
      metaMetric.metric,
    ];
    const totalDurationMs = Date.now() - totalStartedAtMs;

    emitSyncMetricsLog('balance.catalog.headers', {
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
      errorCode: 'balance_headers_sync_failed',
      errorMessage:
        error instanceof Error ? error.message : 'Falha ao sincronizar os balancos.',
    });

    throw error;
  }
}
