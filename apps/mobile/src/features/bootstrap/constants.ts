export const APP_BOOTSTRAP_SYNC_SCOPE = 'app_bootstrap';

function buildScopedKey(userId: number, suffix: string): string {
  return `bootstrap:user:${userId}:${suffix}`;
}

export const bootstrapMetaKeys = {
  ready: (userId: number) => buildScopedKey(userId, 'ready'),
  lastPreparedAt: (userId: number) => buildScopedKey(userId, 'last_prepared_at'),
  lastErrorKind: (userId: number) => buildScopedKey(userId, 'last_error_kind'),
  lastErrorMessage: (userId: number) => buildScopedKey(userId, 'last_error_message'),
  accountSyncedAt: (userId: number) => buildScopedKey(userId, 'account_synced_at'),
  storesSyncedAt: (userId: number) => buildScopedKey(userId, 'stores_synced_at'),
  permissionsSyncedAt: (userId: number) => buildScopedKey(userId, 'permissions_synced_at'),
} as const;
