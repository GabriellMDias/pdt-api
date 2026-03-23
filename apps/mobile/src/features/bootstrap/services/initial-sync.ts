import { fetchCurrentAccount } from '@/src/features/auth/api/auth-api';
import { finishSyncRun, insertSyncRun } from '@/src/database/repositories';
import type {
  MasterStoreUpsertInput,
  UserPermissionScopeUpsertInput,
} from '@/src/database/types';
import { APP_BOOTSTRAP_SYNC_SCOPE } from '@/src/features/bootstrap/constants';
import {
  fetchStoresCatalog,
  fetchUserPermissionScopes,
} from '@/src/features/bootstrap/api/bootstrap-api';
import { saveBootstrapSnapshot } from '@/src/features/bootstrap/data/bootstrap-db';
import {
  emitSyncMetricsLog,
  measureSyncPhase,
} from '@/src/features/sync/services/sync-performance';
import type {
  AppBootstrapTrigger,
  CachedBootstrapSnapshot,
  RemoteMasterStore,
  RemoteUserPermissionScope,
} from '@/src/features/bootstrap/types';
import { extractErrorMessage } from '@/src/features/bootstrap/services/auth-bootstrap';

function normalizeStore(
  store: RemoteMasterStore,
  syncedAt: string,
): MasterStoreUpsertInput {
  return {
    id: Number(store.id),
    description: String(store.description ?? '').trim(),
    storeName: String(store.storeName ?? store.description ?? '').trim(),
    cnpj: store.cnpj ? String(store.cnpj).trim() : null,
    activeStatus: Boolean(store.activeStatus),
    syncedAt,
    updatedAt: syncedAt,
  };
}

function normalizePermissionScope(
  userId: number,
  scope: RemoteUserPermissionScope,
  syncedAt: string,
): UserPermissionScopeUpsertInput[] {
  const permissionCode = String(scope.code ?? '').trim();
  if (!permissionCode) return [];

  const uniqueStores = Array.from(
    new Set(
      Array.isArray(scope.stores)
        ? scope.stores
            .map((storeId) => Number(storeId))
            .filter((storeId) => Number.isFinite(storeId) && storeId > 0)
        : [],
    ),
  );

  const basePayload = {
    userId,
    permissionCode,
    permissionGroupPath: scope.groupPath ? String(scope.groupPath).trim() : null,
    useStorePermission: Boolean(scope.useStorePermission),
    syncedAt,
    createdAt: syncedAt,
    updatedAt: syncedAt,
  };

  const records: UserPermissionScopeUpsertInput[] = [];

  if (scope.global || uniqueStores.length === 0) {
    records.push({
      ...basePayload,
      globalAccess: Boolean(scope.global),
      storeId: null,
    });
  }

  for (const storeId of uniqueStores) {
    records.push({
      ...basePayload,
      globalAccess: false,
      storeId,
    });
  }

  return records;
}

function summarizeSyncPayload(snapshot: CachedBootstrapSnapshot): string {
  return JSON.stringify({
    stores: snapshot.stores.length,
    permissionScopes: snapshot.permissionScopes.length,
    ready: snapshot.metadata.ready,
    preparedAt: snapshot.metadata.lastPreparedAt,
  });
}

export async function runInitialSync(payload: {
  userId: number;
  triggerSource: AppBootstrapTrigger;
}): Promise<CachedBootstrapSnapshot> {
  const startedAt = new Date().toISOString();
  const totalStartedAtMs = Date.now();
  const runId = await insertSyncRun({
    runType: 'pull',
    scope: APP_BOOTSTRAP_SYNC_SCOPE,
    userId: payload.userId,
    triggerSource: payload.triggerSource,
    startedAt,
  });

  try {
    const [
      accountMetric,
      storesMetric,
      permissionsMetric,
    ] = await Promise.all([
      measureSyncPhase('request.account', () => fetchCurrentAccount()),
      measureSyncPhase('request.stores', () => fetchStoresCatalog()),
      measureSyncPhase('request.permissions', () => fetchUserPermissionScopes(payload.userId)),
    ]);
    const account = accountMetric.result;
    const storesPayload = storesMetric.result;
    const permissionsPayload = permissionsMetric.result;

    const syncedAt = new Date().toISOString();
    const storesNormalizationMetric = await measureSyncPhase('normalize.stores', () =>
      Array.isArray(storesPayload)
        ? storesPayload.map((store) => normalizeStore(store, syncedAt))
        : [],
    );
    const stores = storesNormalizationMetric.result;

    const rawPermissions = Array.isArray(permissionsPayload.permissions)
      ? permissionsPayload.permissions
      : [];

    const permissionsNormalizationMetric = await measureSyncPhase('normalize.permissions', () =>
      rawPermissions.flatMap((scope) => normalizePermissionScope(account.id, scope, syncedAt)),
    );
    const permissionScopes = permissionsNormalizationMetric.result;

    const persistenceMetric = await measureSyncPhase('persist.bootstrap_snapshot', () =>
      saveBootstrapSnapshot({
        account,
        stores,
        permissionScopes,
        syncedAt,
      }),
    );
    const snapshot = persistenceMetric.result;
    const metrics = [
      accountMetric.metric,
      storesMetric.metric,
      permissionsMetric.metric,
      {
        ...storesNormalizationMetric.metric,
        itemsCount: stores.length,
      },
      {
        ...permissionsNormalizationMetric.metric,
        itemsCount: permissionScopes.length,
      },
      {
        ...persistenceMetric.metric,
        itemsCount: stores.length + permissionScopes.length,
      },
    ];
    const totalDurationMs = Date.now() - totalStartedAtMs;

    emitSyncMetricsLog(APP_BOOTSTRAP_SYNC_SCOPE, {
      storeId: null,
      itemsCount: stores.length + permissionScopes.length,
      totalDurationMs,
      metrics,
    });

    await finishSyncRun(runId, {
      status: 'success',
      finishedAt: syncedAt,
      responsePayloadJson: JSON.stringify({
        ...JSON.parse(summarizeSyncPayload(snapshot)),
        totalDurationMs,
        metrics,
      }),
    });

    return snapshot;
  } catch (error) {
    const finishedAt = new Date().toISOString();
    await finishSyncRun(runId, {
      status: 'failed',
      finishedAt,
      errorCode: 'bootstrap_initial_sync_failed',
      errorMessage: extractErrorMessage(error),
    });
    throw error;
  }
}
