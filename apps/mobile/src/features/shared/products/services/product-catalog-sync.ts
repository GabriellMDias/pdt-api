import {
  finishSyncRun,
  insertSyncRun,
  replaceCatalogProductsForStore,
} from '@/src/database/repositories';
import { pullMobileSyncCatalog } from '@/src/features/mobile-sync/api/mobile-sync-api';
import {
  emitSyncMetricsLog,
  measureSyncPhase,
} from '@/src/features/sync/services/sync-performance';
import { setProductCatalogLastSyncedAt } from '@/src/features/shared/products/data/product-catalog-db';

export async function syncProductCatalog(payload: {
  userId: number;
  storeId: number;
  triggerSource: string;
}): Promise<{ syncedAt: string; itemsCount: number }> {
  const startedAt = new Date().toISOString();
  const totalStartedAtMs = Date.now();
  const runId = await insertSyncRun({
    runType: 'pull',
    scope: 'catalog.products',
    storeId: payload.storeId,
    userId: payload.userId,
    triggerSource: payload.triggerSource,
    startedAt,
  });

  try {
    const requestMetric = await measureSyncPhase('request.catalog_pull', () =>
      pullMobileSyncCatalog({
        domain: 'stock.products',
        storeId: payload.storeId,
      }),
    );
    const response = requestMetric.result;

    if (response.domain !== 'stock.products' && response.domain !== 'rupture.products') {
      throw new Error(`Catalogo inesperado retornado pela API: ${response.domain}.`);
    }

    const normalizationMetric = await measureSyncPhase('normalize.catalog_items', () =>
      response.items.map((item) => ({
        id: item.id,
        storeId: response.storeId,
        barcode: item.barcode,
        description: item.description,
        packageQuantity: item.packageQuantity,
        packagingTypeId: item.packagingTypeId,
        packagingDescription: item.packagingDescription,
        shelfCode: item.shelfCode,
        activeStatus: item.activeStatus,
        decimalAllowed: item.decimalAllowed,
        salePrice: item.salePrice,
        stockQuantity: item.stockQuantity,
        exchangeQuantity: item.exchangeQuantity,
        averageCostWithTax: item.averageCostWithTax,
        grossWeight: item.grossWeight,
        syncedAt: response.syncedAt,
        updatedAt: response.syncedAt,
      })),
    );

    const persistenceMetric = await measureSyncPhase('persist.catalog_items', () =>
      replaceCatalogProductsForStore(payload.storeId, normalizationMetric.result),
    );

    const metaMetric = await measureSyncPhase('persist.catalog_meta', () =>
      setProductCatalogLastSyncedAt(payload.userId, payload.storeId, response.syncedAt),
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

    emitSyncMetricsLog('catalog.products', {
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
      errorCode: 'product_catalog_sync_failed',
      errorMessage:
        error instanceof Error ? error.message : 'Falha ao sincronizar o catalogo de produtos.',
    });

    throw error;
  }
}
