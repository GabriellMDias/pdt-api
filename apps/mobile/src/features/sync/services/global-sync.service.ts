import { finishSyncRun, insertSyncRun } from '@/src/database/repositories';
import { runInitialSync } from '@/src/features/bootstrap/services/initial-sync';
import { syncConsumptionReasonsCatalog } from '@/src/features/consumo/services/consumo-catalog-sync';
import { syncBalanceHeadersCatalog } from '@/src/features/balanco/services/balanco-catalog-sync';
import { syncProductionRecipesCatalog } from '@/src/features/producao/services/producao-catalog-sync';
import type { AppBootstrapTrigger, CachedBootstrapSnapshot } from '@/src/features/bootstrap/types';
import type { SyncProgressScope } from '@/src/features/sync/constants/sync-progress';
import { setCurrentStoreForUser } from '@/src/features/settings/services/user-settings.service';
import { syncProductCatalog } from '@/src/features/shared/products/services/product-catalog-sync';
import { syncExchangeReasonsCatalog } from '@/src/features/troca/services/troca-catalog-sync';

export type GlobalSyncResult = {
  storeId: number;
  bootstrapSnapshot: CachedBootstrapSnapshot;
  productCatalog: {
    syncedAt: string;
    itemsCount: number;
  };
  exchangeReasons: {
    syncedAt: string;
    itemsCount: number;
  };
  consumptionReasons: {
    syncedAt: string;
    itemsCount: number;
  };
  productionRecipes: {
    syncedAt: string;
    itemsCount: number;
  };
  balanceHeaders: {
    syncedAt: string;
    itemsCount: number;
  };
  syncedAt: string;
};

export type GlobalSyncProgress = {
  scope: SyncProgressScope;
  label: string;
  detail: string;
};

type GlobalSyncStepMetric = {
  scope: string;
  label: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  itemsCount?: number;
};

export async function runGlobalSync(payload: {
  userId: number;
  storeId: number;
  triggerSource: AppBootstrapTrigger | 'sidebar_sync' | 'settings_sync' | 'login_sync';
  onProgress?: (progress: GlobalSyncProgress) => void | Promise<void>;
}): Promise<GlobalSyncResult> {
  const startedAt = new Date().toISOString();
  const totalStartedAtMs = Date.now();
  const runId = await insertSyncRun({
    runType: 'pull',
    scope: 'global.master_sync',
    storeId: payload.storeId,
    userId: payload.userId,
    triggerSource: payload.triggerSource,
    startedAt,
    requestPayloadJson: JSON.stringify({
      storeId: payload.storeId,
    }),
  });

  try {
    const stepMetrics: GlobalSyncStepMetric[] = [];
    const trackStep = async <T>(
      scope: string,
      progress: GlobalSyncProgress,
      action: () => Promise<T>,
      itemsCountResolver?: (result: T) => number | undefined,
    ) => {
      await payload.onProgress?.(progress);
      const startedAt = new Date().toISOString();
      const startedAtMs = Date.now();
      const result = await action();
      stepMetrics.push({
        scope,
        label: progress.label,
        startedAt,
        finishedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAtMs,
        itemsCount: itemsCountResolver?.(result),
      });

      return result;
    };

    const bootstrapSnapshot = await trackStep(
      'bootstrap.account_stores_permissions',
      {
        scope: 'bootstrap.account_stores_permissions',
        label: 'Conta, lojas e permissoes',
        detail: 'Preparando o contexto base do app para a loja selecionada.',
      },
      () =>
        runInitialSync({
          userId: payload.userId,
          triggerSource: payload.triggerSource,
        }),
      (result) => result.stores.length + result.permissionScopes.length,
    );

    const productCatalog = await trackStep(
      'catalog.products',
      {
        scope: 'catalog.products',
        label: 'Produtos',
        detail: 'Atualizando o catalogo local de produtos.',
      },
      () =>
        syncProductCatalog({
          userId: payload.userId,
          storeId: payload.storeId,
          triggerSource: payload.triggerSource,
        }),
      (result) => result.itemsCount,
    );

    const exchangeReasons = await trackStep(
      'exchange.catalog.reasons',
      {
        scope: 'exchange.catalog.reasons',
        label: 'Motivos de troca',
        detail: 'Atualizando os motivos usados na rotina de troca.',
      },
      () =>
        syncExchangeReasonsCatalog({
          userId: payload.userId,
          storeId: payload.storeId,
          triggerSource: payload.triggerSource,
        }),
      (result) => result.itemsCount,
    );

    const consumptionReasons = await trackStep(
      'consumption.catalog.reasons',
      {
        scope: 'consumption.catalog.reasons',
        label: 'Tipos de consumo',
        detail: 'Atualizando os tipos usados na rotina de consumo.',
      },
      () =>
        syncConsumptionReasonsCatalog({
          userId: payload.userId,
          storeId: payload.storeId,
          triggerSource: payload.triggerSource,
        }),
      (result) => result.itemsCount,
    );

    const productionRecipes = await trackStep(
      'production.catalog.recipes',
      {
        scope: 'production.catalog.recipes',
        label: 'Receitas de producao',
        detail: 'Atualizando as receitas e produtos produzidos.',
      },
      () =>
        syncProductionRecipesCatalog({
          userId: payload.userId,
          storeId: payload.storeId,
          triggerSource: payload.triggerSource,
        }),
      (result) => result.itemsCount,
    );

    const balanceHeaders = await trackStep(
      'balance.catalog.headers',
      {
        scope: 'balance.catalog.headers',
        label: 'Balancos',
        detail: 'Atualizando os balancos em aberto da loja atual.',
      },
      () =>
        syncBalanceHeadersCatalog({
          userId: payload.userId,
          storeId: payload.storeId,
          triggerSource: payload.triggerSource,
        }),
      (result) => result.itemsCount,
    );

    await trackStep(
      'settings.current_store',
      {
        scope: 'settings.current_store',
        label: 'Finalizando',
        detail: 'Salvando a loja atual e concluindo a sincronizacao.',
      },
      () => setCurrentStoreForUser(payload.userId, payload.storeId),
    );

    const syncedAt = [
      productCatalog.syncedAt,
      exchangeReasons.syncedAt,
      consumptionReasons.syncedAt,
      productionRecipes.syncedAt,
      balanceHeaders.syncedAt,
    ]
      .sort()
      .at(-1) ?? new Date().toISOString();
    const totalDurationMs = Date.now() - totalStartedAtMs;
    await finishSyncRun(runId, {
      status: 'success',
      finishedAt: syncedAt,
      responsePayloadJson: JSON.stringify({
        storeId: payload.storeId,
        syncedAt,
        totalDurationMs,
        scopes: [
          {
            scope: 'bootstrap.account',
            preparedAt: bootstrapSnapshot.metadata.accountSyncedAt,
            durationMs:
              stepMetrics.find((metric) => metric.scope === 'bootstrap.account_stores_permissions')
                ?.durationMs ?? null,
          },
          {
            scope: 'bootstrap.stores',
            preparedAt: bootstrapSnapshot.metadata.storesSyncedAt,
            itemsCount: bootstrapSnapshot.stores.length,
            durationMs:
              stepMetrics.find((metric) => metric.scope === 'bootstrap.account_stores_permissions')
                ?.durationMs ?? null,
          },
          {
            scope: 'bootstrap.permissions',
            preparedAt: bootstrapSnapshot.metadata.permissionsSyncedAt,
            itemsCount: bootstrapSnapshot.permissionScopes.length,
            durationMs:
              stepMetrics.find((metric) => metric.scope === 'bootstrap.account_stores_permissions')
                ?.durationMs ?? null,
          },
          {
            scope: 'catalog.products',
            preparedAt: productCatalog.syncedAt,
            itemsCount: productCatalog.itemsCount,
            durationMs:
              stepMetrics.find((metric) => metric.scope === 'catalog.products')?.durationMs ?? null,
          },
          {
            scope: 'exchange.catalog.reasons',
            preparedAt: exchangeReasons.syncedAt,
            itemsCount: exchangeReasons.itemsCount,
            durationMs:
              stepMetrics.find((metric) => metric.scope === 'exchange.catalog.reasons')
                ?.durationMs ?? null,
          },
          {
            scope: 'consumption.catalog.reasons',
            preparedAt: consumptionReasons.syncedAt,
            itemsCount: consumptionReasons.itemsCount,
            durationMs:
              stepMetrics.find((metric) => metric.scope === 'consumption.catalog.reasons')
                ?.durationMs ?? null,
          },
          {
            scope: 'production.catalog.recipes',
            preparedAt: productionRecipes.syncedAt,
            itemsCount: productionRecipes.itemsCount,
            durationMs:
              stepMetrics.find((metric) => metric.scope === 'production.catalog.recipes')
                ?.durationMs ?? null,
          },
          {
            scope: 'balance.catalog.headers',
            preparedAt: balanceHeaders.syncedAt,
            itemsCount: balanceHeaders.itemsCount,
            durationMs:
              stepMetrics.find((metric) => metric.scope === 'balance.catalog.headers')
                ?.durationMs ?? null,
          },
        ],
        metrics: stepMetrics,
      }),
    });

    return {
      storeId: payload.storeId,
      bootstrapSnapshot,
      productCatalog,
      exchangeReasons,
      consumptionReasons,
      productionRecipes,
      balanceHeaders,
      syncedAt,
    };
  } catch (error) {
    await finishSyncRun(runId, {
      status: 'failed',
      finishedAt: new Date().toISOString(),
      errorCode: 'global_sync_failed',
      errorMessage:
        error instanceof Error ? error.message : 'Falha ao sincronizar os dados globais do app.',
    });
    throw error;
  }
}
