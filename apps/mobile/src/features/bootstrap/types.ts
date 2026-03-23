export type BootstrapErrorKind = 'offline' | 'backend' | 'unknown' | 'auth';
export type AppReadinessStatus = 'idle' | 'loading' | 'ready' | 'error';
export type AppBootstrapTrigger =
  | 'session_restore'
  | 'post_login'
  | 'retry'
  | 'manual'
  | 'sidebar_sync'
  | 'settings_sync'
  | 'login_sync';
export type BootstrapSource = 'remote' | 'cache';

export type RemoteMasterStore = {
  id: number;
  description: string;
  storeName: string;
  cnpj: string | null;
  activeStatus: boolean;
};

export type RemoteUserPermissionScope = {
  code: string;
  global: boolean;
  stores: number[];
  useStorePermission: boolean;
  groupPath: string | null;
};

export type RemoteUserPermissionsPayload = {
  userId: number;
  permissions: RemoteUserPermissionScope[];
};

export type LocalUserContext = {
  userId: number;
  name: string;
  email: string | null;
  activeStatus: boolean;
  notifyCostCenterType: boolean;
  codigoUsuarioVrMaster: number | null;
  syncedAt: string;
  updatedAt: string;
};

export type LocalMasterStore = {
  id: number;
  description: string;
  storeName: string;
  cnpj: string | null;
  activeStatus: boolean;
  syncedAt: string;
  updatedAt: string;
};

export type LocalPermissionScope = {
  userId: number;
  permissionCode: string;
  permissionGroupPath: string | null;
  useStorePermission: boolean;
  globalAccess: boolean;
  storeId: number | null;
  syncedAt: string;
  updatedAt: string;
};

export type BootstrapMetadata = {
  ready: boolean;
  lastPreparedAt: string | null;
  lastErrorKind: BootstrapErrorKind | null;
  lastErrorMessage: string | null;
  accountSyncedAt: string | null;
  storesSyncedAt: string | null;
  permissionsSyncedAt: string | null;
};

export type CachedBootstrapSnapshot = {
  userContext: LocalUserContext | null;
  stores: LocalMasterStore[];
  permissionScopes: LocalPermissionScope[];
  metadata: BootstrapMetadata;
  hasMinimumMasterData: boolean;
};

export type BootstrapPreparationResult = {
  snapshot: CachedBootstrapSnapshot;
  source: BootstrapSource;
};

export class AppBootstrapError extends Error {
  constructor(
    public readonly kind: BootstrapErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'AppBootstrapError';
  }
}

export class InvalidSessionError extends Error {
  constructor(message = 'Sua sessao nao e mais valida. Entre novamente.') {
    super(message);
    this.name = 'InvalidSessionError';
  }
}
