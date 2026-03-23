import {
  finishSyncRun,
  insertSyncRun,
  replaceProductionRecipesForStore,
} from '@/src/database/repositories';
import { pullMobileSyncCatalog } from '@/src/features/mobile-sync/api/mobile-sync-api';
import {
  emitSyncMetricsLog,
  measureSyncPhase,
} from '@/src/features/sync/services/sync-performance';
import { setProductionRecipesLastSyncedAt } from '@/src/features/producao/data/producao-db';

export async function syncProductionRecipesCatalog(payload: {
  userId: number;
  storeId: number;
  triggerSource: string;
}): Promise<{ syncedAt: string; itemsCount: number }> {
  const startedAt = new Date().toISOString();
  const totalStartedAtMs = Date.now();
  const runId = await insertSyncRun({
    runType: 'pull',
    scope: 'production.catalog.recipes',
    storeId: payload.storeId,
    userId: payload.userId,
    triggerSource: payload.triggerSource,
    startedAt,
  });

  try {
    const requestMetric = await measureSyncPhase('request.catalog_pull', () =>
      pullMobileSyncCatalog({
        domain: 'production.recipes',
        storeId: payload.storeId,
      }),
    );
    const response = requestMetric.result;

    if (response.domain !== 'production.recipes') {
      throw new Error(`Catalogo inesperado retornado pela API: ${response.domain}.`);
    }

    const normalizationMetric = await measureSyncPhase('normalize.catalog_items', () =>
      response.items.map((item) => ({
        id: item.id,
        storeId: response.storeId,
        description: item.description,
        activeStatus: item.activeStatus,
        syncedAt: response.syncedAt,
        updatedAt: response.syncedAt,
        outputs: item.outputs.map((output) => ({
          recipeOutputId: output.recipeOutputId,
          recipeId: item.id,
          storeId: response.storeId,
          productId: output.productId,
          yieldQuantity: output.yieldQuantity,
          syncedAt: response.syncedAt,
          updatedAt: response.syncedAt,
        })),
        inputs: item.inputs.map((input) => ({
          recipeInputId: input.recipeInputId,
          recipeId: item.id,
          storeId: response.storeId,
          productId: input.productId,
          recipePackageQuantity: input.recipePackageQuantity,
          productPackageQuantity: input.productPackageQuantity,
          deductStock: input.deductStock,
          conversionFactor: input.conversionFactor,
          syncedAt: response.syncedAt,
          updatedAt: response.syncedAt,
        })),
      })),
    );

    const persistenceMetric = await measureSyncPhase('persist.catalog_items', () =>
      replaceProductionRecipesForStore(payload.storeId, normalizationMetric.result),
    );

    const metaMetric = await measureSyncPhase('persist.catalog_meta', () =>
      setProductionRecipesLastSyncedAt(payload.userId, payload.storeId, response.syncedAt),
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
        note: 'Cada receita ainda persiste cabecalho, outputs e inputs em loops separados.',
      },
      metaMetric.metric,
    ];
    const totalDurationMs = Date.now() - totalStartedAtMs;

    emitSyncMetricsLog('production.catalog.recipes', {
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
      errorCode: 'production_recipes_sync_failed',
      errorMessage:
        error instanceof Error ? error.message : 'Falha ao sincronizar as receitas de producao.',
    });

    throw error;
  }
}
