import { runInTransaction } from '@/src/database/client';
import {
  getAppMeta,
  getAuthUserContextRowByUserId,
  getMasterStoreRows,
  getUserPermissionScopeRowsByUserId,
  replaceMasterStores,
  replaceUserPermissionScopes,
  setAppMeta,
  upsertAuthUserContext,
} from '@/src/database/repositories';
import { getReadyDatabase } from '@/src/database/repositories/shared';
import type {
  AuthUserContextRow,
  DatabaseExecutor,
  MasterStoreUpsertInput,
  UserPermissionScopeUpsertInput,
} from '@/src/database/types';
import { bootstrapMetaKeys } from '@/src/features/bootstrap/constants';
import type {
  BootstrapErrorKind,
  BootstrapMetadata,
  CachedBootstrapSnapshot,
  LocalMasterStore,
  LocalPermissionScope,
  LocalUserContext,
} from '@/src/features/bootstrap/types';
import type { AccountMeResponse } from '@/src/features/auth/types';

function normalizeMetaValue(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function mapUserContextRow(row: AuthUserContextRow | null): LocalUserContext | null {
  if (!row) return null;

  return {
    userId: row.user_id,
    name: row.name,
    email: row.email,
    activeStatus: row.active_status === 1,
    notifyCostCenterType: row.notify_cost_center_type === 1,
    codigoUsuarioVrMaster: row.codigo_usuario_vr_master,
    syncedAt: row.synced_at,
    updatedAt: row.updated_at,
  };
}

function mapStoreRow(row: {
  id: number;
  description: string;
  store_name: string;
  cnpj: string | null;
  active_status: number;
  synced_at: string;
  updated_at: string;
}): LocalMasterStore {
  return {
    id: row.id,
    description: row.description,
    storeName: row.store_name,
    cnpj: row.cnpj,
    activeStatus: row.active_status === 1,
    syncedAt: row.synced_at,
    updatedAt: row.updated_at,
  };
}

function mapPermissionScopeRow(row: {
  user_id: number;
  permission_code: string;
  permission_group_path: string | null;
  use_store_permission: number;
  global_access: number;
  store_id: number | null;
  synced_at: string;
  updated_at: string;
}): LocalPermissionScope {
  return {
    userId: row.user_id,
    permissionCode: row.permission_code,
    permissionGroupPath: row.permission_group_path,
    useStorePermission: row.use_store_permission === 1,
    globalAccess: row.global_access === 1,
    storeId: row.store_id,
    syncedAt: row.synced_at,
    updatedAt: row.updated_at,
  };
}

async function getMetaValue(
  key: string,
  db: DatabaseExecutor,
): Promise<string | null> {
  const row = await getAppMeta(key, db);
  return normalizeMetaValue(row?.value ?? null);
}

async function loadBootstrapMetadata(
  userId: number,
  db: DatabaseExecutor,
): Promise<BootstrapMetadata> {
  const [readyRaw, lastPreparedAt, lastErrorKind, lastErrorMessage, accountSyncedAt, storesSyncedAt, permissionsSyncedAt] =
    await Promise.all([
      getMetaValue(bootstrapMetaKeys.ready(userId), db),
      getMetaValue(bootstrapMetaKeys.lastPreparedAt(userId), db),
      getMetaValue(bootstrapMetaKeys.lastErrorKind(userId), db),
      getMetaValue(bootstrapMetaKeys.lastErrorMessage(userId), db),
      getMetaValue(bootstrapMetaKeys.accountSyncedAt(userId), db),
      getMetaValue(bootstrapMetaKeys.storesSyncedAt(userId), db),
      getMetaValue(bootstrapMetaKeys.permissionsSyncedAt(userId), db),
    ]);

  return {
    ready: readyRaw === '1',
    lastPreparedAt,
    lastErrorKind: (lastErrorKind as BootstrapErrorKind | null) ?? null,
    lastErrorMessage,
    accountSyncedAt,
    storesSyncedAt,
    permissionsSyncedAt,
  };
}

async function writeMeta(
  key: string,
  value: string | null,
  updatedAt: string,
  db: DatabaseExecutor,
): Promise<void> {
  await setAppMeta(key, value ?? '', updatedAt, db);
}

async function writeBootstrapMetadata(
  userId: number,
  metadata: BootstrapMetadata,
  updatedAt: string,
  db: DatabaseExecutor,
): Promise<void> {
  await Promise.all([
    writeMeta(bootstrapMetaKeys.ready(userId), metadata.ready ? '1' : '0', updatedAt, db),
    writeMeta(bootstrapMetaKeys.lastPreparedAt(userId), metadata.lastPreparedAt, updatedAt, db),
    writeMeta(bootstrapMetaKeys.lastErrorKind(userId), metadata.lastErrorKind, updatedAt, db),
    writeMeta(bootstrapMetaKeys.lastErrorMessage(userId), metadata.lastErrorMessage, updatedAt, db),
    writeMeta(bootstrapMetaKeys.accountSyncedAt(userId), metadata.accountSyncedAt, updatedAt, db),
    writeMeta(bootstrapMetaKeys.storesSyncedAt(userId), metadata.storesSyncedAt, updatedAt, db),
    writeMeta(
      bootstrapMetaKeys.permissionsSyncedAt(userId),
      metadata.permissionsSyncedAt,
      updatedAt,
      db,
    ),
  ]);
}

export async function loadBootstrapSnapshot(
  userId: number,
  db?: DatabaseExecutor,
): Promise<CachedBootstrapSnapshot> {
  const executor = db ?? (await getReadyDatabase());

  const [userContextRow, storeRows, permissionRows, metadata] = await Promise.all([
    getAuthUserContextRowByUserId(userId, executor),
    getMasterStoreRows(executor),
    getUserPermissionScopeRowsByUserId(userId, executor),
    loadBootstrapMetadata(userId, executor),
  ]);

  const userContext = mapUserContextRow(userContextRow);
  const stores = storeRows.map(mapStoreRow);
  const permissionScopes = permissionRows.map(mapPermissionScopeRow);
  const hasMinimumMasterData = Boolean(
    userContext &&
      metadata.accountSyncedAt &&
      metadata.storesSyncedAt &&
      metadata.permissionsSyncedAt,
  );

  return {
    userContext,
    stores,
    permissionScopes,
    metadata,
    hasMinimumMasterData,
  };
}

export async function saveBootstrapSnapshot(payload: {
  account: AccountMeResponse;
  stores: MasterStoreUpsertInput[];
  permissionScopes: UserPermissionScopeUpsertInput[];
  syncedAt: string;
}): Promise<CachedBootstrapSnapshot> {
  const db = await getReadyDatabase();

  await runInTransaction(db, async () => {
    await upsertAuthUserContext(
      {
        userId: payload.account.id,
        name: payload.account.name,
        email: payload.account.email ?? null,
        activeStatus: Boolean(payload.account.activeStatus),
        notifyCostCenterType: Boolean(payload.account.notifyCostCenterType),
        codigoUsuarioVrMaster: payload.account.codigoUsuarioVrMaster ?? null,
        syncedAt: payload.syncedAt,
        updatedAt: payload.syncedAt,
      },
      db,
    );

    await replaceMasterStores(payload.stores, db);
    await replaceUserPermissionScopes(payload.account.id, payload.permissionScopes, db);

    await writeBootstrapMetadata(
      payload.account.id,
      {
        ready: true,
        lastPreparedAt: payload.syncedAt,
        lastErrorKind: null,
        lastErrorMessage: null,
        accountSyncedAt: payload.syncedAt,
        storesSyncedAt: payload.syncedAt,
        permissionsSyncedAt: payload.syncedAt,
      },
      payload.syncedAt,
      db,
    );
  });

  return loadBootstrapSnapshot(payload.account.id, db);
}

export async function recordBootstrapError(payload: {
  userId: number;
  kind: BootstrapErrorKind;
  message: string;
  preserveReady?: boolean;
}): Promise<void> {
  const db = await getReadyDatabase();
  const now = new Date().toISOString();
  const existing = await loadBootstrapMetadata(payload.userId, db);

  await writeBootstrapMetadata(
    payload.userId,
    {
      ...existing,
      ready: payload.preserveReady ? existing.ready : false,
      lastErrorKind: payload.kind,
      lastErrorMessage: payload.message,
    },
    now,
    db,
  );
}
