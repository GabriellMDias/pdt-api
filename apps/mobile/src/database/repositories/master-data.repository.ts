import type {
  AuthUserContextRow,
  AuthUserContextUpsertInput,
  DatabaseExecutor,
  MasterStoreRow,
  MasterStoreUpsertInput,
  UserPermissionScopeRow,
  UserPermissionScopeUpsertInput,
} from '@/src/database/types';
import { runInTransaction } from '@/src/database/client';
import { getReadyDatabase } from '@/src/database/repositories/shared';

async function resolveExecutor(db?: DatabaseExecutor): Promise<DatabaseExecutor> {
  return db ?? (await getReadyDatabase());
}

export async function upsertAuthUserContext(
  input: AuthUserContextUpsertInput,
  db?: DatabaseExecutor,
): Promise<void> {
  const executor = await resolveExecutor(db);

  await executor.runAsync(
    `
      INSERT INTO auth_user_contexts (
        user_id,
        name,
        email,
        active_status,
        notify_cost_center_type,
        codigo_usuario_vr_master,
        synced_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        name = excluded.name,
        email = excluded.email,
        active_status = excluded.active_status,
        notify_cost_center_type = excluded.notify_cost_center_type,
        codigo_usuario_vr_master = excluded.codigo_usuario_vr_master,
        synced_at = excluded.synced_at,
        updated_at = excluded.updated_at
    `,
    [
      input.userId,
      input.name,
      input.email,
      input.activeStatus ? 1 : 0,
      input.notifyCostCenterType ? 1 : 0,
      input.codigoUsuarioVrMaster,
      input.syncedAt,
      input.updatedAt,
    ],
  );
}

export async function getAuthUserContextRowByUserId(
  userId: number,
  db?: DatabaseExecutor,
): Promise<AuthUserContextRow | null> {
  const executor = await resolveExecutor(db);
  return executor.getFirstAsync<AuthUserContextRow>(
    `
      SELECT
        user_id,
        name,
        email,
        active_status,
        notify_cost_center_type,
        codigo_usuario_vr_master,
        synced_at,
        updated_at
      FROM auth_user_contexts
      WHERE user_id = ?
      LIMIT 1
    `,
    [userId],
  );
}

export async function replaceMasterStores(
  stores: readonly MasterStoreUpsertInput[],
  db?: DatabaseExecutor,
): Promise<void> {
  const executor = await resolveExecutor(db);
  const syncedStoreIds = stores.map((store) => store.id);

  const persistStores = async () => {
    for (const store of stores) {
      await executor.runAsync(
        `
          INSERT INTO master_stores (
            id,
            description,
            store_name,
            cnpj,
            active_status,
            synced_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            description = excluded.description,
            store_name = excluded.store_name,
            cnpj = excluded.cnpj,
            active_status = excluded.active_status,
            synced_at = excluded.synced_at,
            updated_at = excluded.updated_at
        `,
        [
          store.id,
          store.description,
          store.storeName,
          store.cnpj,
          store.activeStatus ? 1 : 0,
          store.syncedAt,
          store.updatedAt,
        ],
      );
    }

    if (syncedStoreIds.length > 0) {
      const placeholders = syncedStoreIds.map(() => '?').join(', ');
      await executor.runAsync(
        `DELETE FROM master_stores WHERE id NOT IN (${placeholders})`,
        syncedStoreIds,
      );
    } else {
      await executor.runAsync('DELETE FROM master_stores');
    }
  };

  if (db) {
    await persistStores();
    return;
  }

  await runInTransaction(executor, persistStores);
}

export async function getMasterStoreRows(
  db?: DatabaseExecutor,
): Promise<MasterStoreRow[]> {
  const executor = await resolveExecutor(db);
  return executor.getAllAsync<MasterStoreRow>(
    `
      SELECT
        id,
        description,
        store_name,
        cnpj,
        active_status,
        synced_at,
        updated_at
      FROM master_stores
      ORDER BY description COLLATE NOCASE ASC, id ASC
    `,
  );
}

export async function replaceUserPermissionScopes(
  userId: number,
  scopes: readonly UserPermissionScopeUpsertInput[],
  db?: DatabaseExecutor,
): Promise<void> {
  const executor = await resolveExecutor(db);

  const persistScopes = async () => {
    await executor.runAsync('DELETE FROM user_permission_scopes WHERE user_id = ?', [userId]);

    for (const scope of scopes) {
      await executor.runAsync(
        `
          INSERT INTO user_permission_scopes (
            user_id,
            permission_code,
            permission_group_path,
            use_store_permission,
            global_access,
            store_id,
            synced_at,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          scope.userId,
          scope.permissionCode,
          scope.permissionGroupPath ?? null,
          scope.useStorePermission ? 1 : 0,
          scope.globalAccess ? 1 : 0,
          scope.storeId ?? null,
          scope.syncedAt,
          scope.createdAt,
          scope.updatedAt,
        ],
      );
    }
  };

  if (db) {
    await persistScopes();
    return;
  }

  await runInTransaction(executor, persistScopes);
}

export async function getUserPermissionScopeRowsByUserId(
  userId: number,
  db?: DatabaseExecutor,
): Promise<UserPermissionScopeRow[]> {
  const executor = await resolveExecutor(db);
  return executor.getAllAsync<UserPermissionScopeRow>(
    `
      SELECT
        id,
        user_id,
        permission_code,
        permission_group_path,
        use_store_permission,
        global_access,
        store_id,
        synced_at,
        created_at,
        updated_at
      FROM user_permission_scopes
      WHERE user_id = ?
      ORDER BY permission_code ASC, store_id ASC
    `,
    [userId],
  );
}
