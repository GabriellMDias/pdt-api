import { create } from 'zustand';
import { jwtDecode } from 'jwt-decode';
import * as Network from 'expo-network';
import { bootstrapDatabase } from '@/src/database/migrator';
import { clearToken, setToken } from '@/src/core/security/token-vault';
import { USER_SYNC_VERSION } from '@/src/features/auth/constants';
import { fetchCurrentAccount, loginOnline } from '@/src/features/auth/api/auth-api';
import { fetchUsersSyncPayload } from '@/src/features/auth/api/sync-api';
import {
  clearSession,
  getSessionWithUser,
  getUserById,
  getUserByIdentifier,
  getUsersSyncState,
  markUsersSynced,
  saveSession,
  touchUserLastLogin,
  upsertSingleUser,
  upsertUsersFromSync,
} from '@/src/features/auth/data/auth-db';
import { comparePassword, hashPassword } from '@/src/features/auth/data/password-hash';
import type {
  AuthStatus,
  ConnectivityStatus,
  JwtAccessToken,
  LocalAuthUser,
  RemoteSyncUser,
  SessionMode,
  UsersSyncState,
} from '@/src/features/auth/types';
import { fetchStoresCatalog } from '@/src/features/bootstrap/api/bootstrap-api';
import {
  extractErrorMessage,
  resolveConnectivityStatus,
  resolveStoredAuthBootstrap,
} from '@/src/features/bootstrap/services/auth-bootstrap';
import { prepareAuthenticatedApp } from '@/src/features/bootstrap/services/app-readiness';
import type {
  AppBootstrapTrigger,
  AppReadinessStatus,
  BootstrapErrorKind,
  LocalMasterStore,
  LocalPermissionScope,
  LocalUserContext,
  RemoteMasterStore,
} from '@/src/features/bootstrap/types';
import {
  AppBootstrapError as BootstrapPreparationError,
  InvalidSessionError as InvalidStoredSessionError,
} from '@/src/features/bootstrap/types';
import { runGlobalSync } from '@/src/features/sync/services/global-sync.service';
import type { SyncProgressScope } from '@/src/features/sync/constants/sync-progress';
import {
  loadUserScopedSettings,
  setAppThemeForUser,
  setCurrentStoreForUser,
  setAutoTransmitEnabledForUser,
} from '@/src/features/settings/services/user-settings.service';
import type { AppThemeMode } from '@/src/theme/colors';

type SyncTriggerSource =
  | AppBootstrapTrigger
  | 'sidebar_sync'
  | 'settings_sync'
  | 'login_sync';

type LoginSyncStorePreview = {
  userId: number;
  stores: LocalMasterStore[];
  preferredStoreId: number | null;
};

type AuthStoreState = {
  status: AuthStatus;
  connectivityStatus: ConnectivityStatus;
  isLoggingIn: boolean;
  isSyncingUsers: boolean;
  isSyncingApp: boolean;
  syncProgressScope: SyncProgressScope | null;
  syncProgressLabel: string | null;
  syncProgressDetail: string | null;
  errorMessage: string | null;
  usersSynced: boolean;
  usersSyncVersion: number;
  usersLastSyncedAt: string | null;
  sessionMode: SessionMode | null;
  currentUser: LocalAuthUser | null;
  currentUserContext: LocalUserContext | null;
  availableStores: LocalMasterStore[];
  permissionScopes: LocalPermissionScope[];
  currentStoreId: number | null;
  autoTransmitEnabled: boolean;
  appTheme: AppThemeMode;
  appReadinessStatus: AppReadinessStatus;
  appReadinessErrorKind: BootstrapErrorKind | null;
  appReadinessMessage: string | null;
  appLastPreparedAt: string | null;
  bootstrap: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  syncUsers: () => Promise<void>;
  prepareApp: (triggerSource?: AppBootstrapTrigger) => Promise<boolean>;
  syncAppData: (storeId: number, triggerSource?: SyncTriggerSource) => Promise<boolean>;
  loadLoginSyncStores: (
    identifier: string,
    password: string,
  ) => Promise<LoginSyncStorePreview>;
  syncFromLogin: (
    identifier: string,
    password: string,
    storeId: number,
  ) => Promise<boolean>;
  setCurrentStoreId: (storeId: number | null) => Promise<void>;
  setAutoTransmitEnabled: (enabled: boolean) => Promise<void>;
  setAppTheme: (theme: AppThemeMode) => Promise<void>;
  startNetworkMonitor: () => Promise<void>;
  stopNetworkMonitor: () => void;
};

function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase();
}

function resolveTokenExpiration(token: string): string | null {
  try {
    const payload = jwtDecode<JwtAccessToken>(token);
    if (!payload.exp) return null;
    return new Date(payload.exp * 1000).toISOString();
  } catch {
    return null;
  }
}

function normalizeRemoteUser(remoteUser: RemoteSyncUser): RemoteSyncUser {
  const permissions = Array.isArray(remoteUser.permissions)
    ? remoteUser.permissions
        .map((permission) => ({ code: String(permission.code ?? '').trim() }))
        .filter((permission) => permission.code.length > 0)
    : [];

  return {
    ...remoteUser,
    login: String(remoteUser.login ?? '').trim(),
    email: String(remoteUser.email ?? '').trim(),
    passwordHash: String(remoteUser.passwordHash ?? '').trim(),
    updatedAt: String(remoteUser.updatedAt ?? '').trim(),
    permissions,
  };
}

function normalizePreviewStore(store: RemoteMasterStore, syncedAt: string): LocalMasterStore {
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

function mergeUserContext(
  user: LocalAuthUser,
  userContext: LocalUserContext | null,
): LocalAuthUser {
  if (!userContext) return user;

  return {
    ...user,
    name: userContext.name || user.name,
    email: userContext.email ?? user.email,
  };
}

function resetAuthenticatedContextState() {
  return {
    currentUserContext: null,
    availableStores: [] as LocalMasterStore[],
    permissionScopes: [] as LocalPermissionScope[],
    currentStoreId: null as number | null,
    autoTransmitEnabled: false,
    appTheme: 'dark' as AppThemeMode,
    appReadinessStatus: 'idle' as AppReadinessStatus,
    appReadinessErrorKind: null as BootstrapErrorKind | null,
    appReadinessMessage: null as string | null,
    appLastPreparedAt: null as string | null,
  };
}

function buildEmptyUsersSyncState(): UsersSyncState {
  return {
    usersSynced: false,
    usersSyncVersion: 0,
    usersLastSyncedAt: null,
  };
}

async function resolveUserScopedState(
  userId: number,
  stores: readonly LocalMasterStore[],
): Promise<Pick<AuthStoreState, 'currentStoreId' | 'autoTransmitEnabled' | 'appTheme'>> {
  const settings = await loadUserScopedSettings(userId, stores);
  return {
    currentStoreId: settings.currentStoreId,
    autoTransmitEnabled: settings.autoTransmitEnabled,
    appTheme: settings.appTheme,
  };
}

async function ensureLocalUserRecord(payload: {
  account: Awaited<ReturnType<typeof fetchCurrentAccount>>;
  normalizedIdentifier: string;
  password: string;
}): Promise<LocalAuthUser> {
  let localUser = await getUserById(payload.account.id);

  if (!localUser) {
    const fallbackHash = await hashPassword(payload.password);
    const fallbackLogin = payload.account.email || payload.normalizedIdentifier;
    const nowIso = new Date().toISOString();

    await upsertSingleUser({
      id: payload.account.id,
      name: payload.account.name,
      email: payload.account.email || null,
      login: fallbackLogin,
      passwordHash: fallbackHash,
      permissions: [],
      updatedAt: nowIso,
      syncedAt: nowIso,
    });

    localUser = await getUserById(payload.account.id);
  }

  if (!localUser) {
    throw new Error('Nao foi possivel persistir o usuario localmente.');
  }

  return localUser;
}

async function refreshUsersSyncState(): Promise<UsersSyncState> {
  return getUsersSyncState().catch(buildEmptyUsersSyncState);
}

let networkSubscription: { remove: () => void } | null = null;
let appPreparationPromise: Promise<boolean> | null = null;

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  status: 'bootstrapping',
  connectivityStatus: 'unknown',
  isLoggingIn: false,
  isSyncingUsers: false,
  isSyncingApp: false,
  syncProgressScope: null,
  syncProgressLabel: null,
  syncProgressDetail: null,
  errorMessage: null,
  usersSynced: false,
  usersSyncVersion: 0,
  usersLastSyncedAt: null,
  sessionMode: null,
  currentUser: null,
  currentUserContext: null,
  availableStores: [],
  permissionScopes: [],
  currentStoreId: null,
  autoTransmitEnabled: false,
  appTheme: 'dark',
  appReadinessStatus: 'idle',
  appReadinessErrorKind: null,
  appReadinessMessage: null,
  appLastPreparedAt: null,

  bootstrap: async () => {
    set({
      status: 'bootstrapping',
      errorMessage: null,
      isSyncingApp: false,
      syncProgressScope: null,
      syncProgressLabel: null,
      syncProgressDetail: null,
      ...resetAuthenticatedContextState(),
    });

    try {
      await bootstrapDatabase();

      const { connectivityStatus, usersSyncState, sessionWithUser } =
        await resolveStoredAuthBootstrap();

      const nextBaseState: Partial<AuthStoreState> = {
        connectivityStatus,
        usersSynced: usersSyncState.usersSynced,
        usersSyncVersion: usersSyncState.usersSyncVersion,
        usersLastSyncedAt: usersSyncState.usersLastSyncedAt,
      };

      if (!sessionWithUser) {
        set({
          ...nextBaseState,
          status: 'unauthenticated',
          currentUser: null,
          sessionMode: null,
          ...resetAuthenticatedContextState(),
        });
        return;
      }

      const earlyUserSettings = await loadUserScopedSettings(sessionWithUser.user.id);

      set({
        ...nextBaseState,
        status: 'authenticated',
        currentUser: sessionWithUser.user,
        sessionMode: sessionWithUser.session.mode,
        appTheme: earlyUserSettings.appTheme,
        appReadinessStatus: 'loading',
        appReadinessErrorKind: null,
        appReadinessMessage: null,
        appLastPreparedAt: null,
      });

      void get().prepareApp('session_restore');

      if (sessionWithUser.session.mode === 'online' && connectivityStatus === 'online') {
        void get().syncUsers().catch(() => undefined);
      }
    } catch (error) {
      clearToken();
      set({
        status: 'unauthenticated',
        currentUser: null,
        sessionMode: null,
        errorMessage: extractErrorMessage(error),
        isSyncingApp: false,
        syncProgressScope: null,
        syncProgressLabel: null,
        syncProgressDetail: null,
        ...resetAuthenticatedContextState(),
      });
    }
  },

  startNetworkMonitor: async () => {
    if (networkSubscription) return;

    const initialStatus = await resolveConnectivityStatus().catch(
      () => 'unknown' as ConnectivityStatus,
    );
    set({ connectivityStatus: initialStatus });

    networkSubscription = Network.addNetworkStateListener((networkState) => {
      const connected = Boolean(networkState.isConnected);
      const internetReachable = networkState.isInternetReachable !== false;
      set({ connectivityStatus: connected && internetReachable ? 'online' : 'offline' });
    });
  },

  stopNetworkMonitor: () => {
    networkSubscription?.remove();
    networkSubscription = null;
  },

  syncUsers: async () => {
    if (get().isSyncingUsers) return;

    set({ isSyncingUsers: true, errorMessage: null });

    try {
      const payload = await fetchUsersSyncPayload();
      const remoteUsers = Array.isArray(payload.users)
        ? payload.users.map(normalizeRemoteUser)
        : [];

      const hasInvalidHash = remoteUsers.some((user) => !user.passwordHash);
      if (hasInvalidHash) {
        throw new Error('A API nao retornou hash de senha para todos os usuarios.');
      }

      const syncedAt = payload.syncedAt || new Date().toISOString();
      const syncVersion = Number(payload.syncVersion ?? USER_SYNC_VERSION) || USER_SYNC_VERSION;

      await upsertUsersFromSync(remoteUsers, syncedAt);
      await markUsersSynced(syncVersion, syncedAt);

      const nextSyncState = await getUsersSyncState();
      set({
        usersSynced: nextSyncState.usersSynced,
        usersSyncVersion: nextSyncState.usersSyncVersion,
        usersLastSyncedAt: nextSyncState.usersLastSyncedAt,
      });
    } catch (error) {
      const message = extractErrorMessage(error);
      set({ errorMessage: message });
      throw new Error(message);
    } finally {
      set({ isSyncingUsers: false });
    }
  },

  prepareApp: async (triggerSource = 'manual') => {
    if (get().status !== 'authenticated') return false;
    if (appPreparationPromise) {
      return appPreparationPromise;
    }

    appPreparationPromise = (async () => {
      const storedSession = await getSessionWithUser();
      if (!storedSession) {
        clearToken();
        set({
          status: 'unauthenticated',
          currentUser: null,
          sessionMode: null,
          errorMessage: 'Sua sessao nao esta mais disponivel localmente.',
          ...resetAuthenticatedContextState(),
        });
        return false;
      }

      const connectivityStatus =
        get().connectivityStatus === 'unknown'
          ? await resolveConnectivityStatus().catch(() => 'unknown' as ConnectivityStatus)
          : get().connectivityStatus;

      set({
        connectivityStatus,
        appReadinessStatus: 'loading',
        appReadinessErrorKind: null,
        appReadinessMessage: null,
      });

      try {
        const result = await prepareAuthenticatedApp({
          sessionWithUser: storedSession,
          connectivityStatus,
          triggerSource,
        });

        const nextUser = mergeUserContext(storedSession.user, result.snapshot.userContext);
        const userScopedState = await resolveUserScopedState(nextUser.id, result.snapshot.stores);

        set({
          status: 'authenticated',
          sessionMode: storedSession.session.mode,
          currentUser: nextUser,
          currentUserContext: result.snapshot.userContext,
          availableStores: result.snapshot.stores,
          permissionScopes: result.snapshot.permissionScopes,
          currentStoreId: userScopedState.currentStoreId,
          autoTransmitEnabled: userScopedState.autoTransmitEnabled,
          appTheme: userScopedState.appTheme,
          appReadinessStatus: 'ready',
          appReadinessErrorKind: null,
          appReadinessMessage: null,
          appLastPreparedAt: result.snapshot.metadata.lastPreparedAt,
        });

        return true;
      } catch (error) {
        if (error instanceof InvalidStoredSessionError) {
          set({
            status: 'unauthenticated',
            currentUser: null,
            sessionMode: null,
            errorMessage: error.message,
            ...resetAuthenticatedContextState(),
          });
          return false;
        }

        const readinessError =
          error instanceof BootstrapPreparationError
            ? error
            : new BootstrapPreparationError('unknown', extractErrorMessage(error));

        set({
          appReadinessStatus: 'error',
          appReadinessErrorKind: readinessError.kind,
          appReadinessMessage: readinessError.message,
          currentUserContext: null,
          availableStores: [],
          permissionScopes: [],
          currentStoreId: null,
          autoTransmitEnabled: false,
          appTheme: get().appTheme,
          appLastPreparedAt: null,
        });

        return false;
      }
    })();

    try {
      return await appPreparationPromise;
    } finally {
      appPreparationPromise = null;
    }
  },

  syncAppData: async (storeId, triggerSource = 'manual') => {
    const currentUser = get().currentUser;
    const sessionMode = get().sessionMode;
    const hadReadySnapshot = Boolean(
      get().currentUserContext || get().availableStores.length > 0 || get().permissionScopes.length > 0,
    );

    if (!currentUser) {
      set({ errorMessage: 'Nenhum usuario autenticado para sincronizar.' });
      return false;
    }

    if (!get().availableStores.some((store) => store.id === storeId)) {
      set({ errorMessage: 'Selecione uma loja valida para sincronizar.' });
      return false;
    }

    const connectivityStatus =
      get().connectivityStatus === 'unknown'
        ? await resolveConnectivityStatus().catch(() => 'unknown' as ConnectivityStatus)
        : get().connectivityStatus;

    if (sessionMode !== 'online' || connectivityStatus !== 'online') {
      set({
        connectivityStatus,
        errorMessage:
          'A sincronizacao global exige sessao online e internet disponivel. Entre novamente com conexao ativa.',
      });
      return false;
    }

    set({
      isSyncingApp: true,
      syncProgressScope: 'sync.users',
      syncProgressLabel: 'Usuarios',
      syncProgressDetail: 'Atualizando usuarios autorizados para acesso offline.',
      errorMessage: null,
      connectivityStatus,
      appReadinessStatus: 'loading',
      appReadinessErrorKind: null,
      appReadinessMessage: null,
    });

    try {
      const syncStateBefore = await getUsersSyncState();
      try {
        await get().syncUsers();
      } catch (syncError) {
        if (!syncStateBefore.usersSynced) {
          throw new Error(
            `Falha na sincronizacao de usuarios. ${extractErrorMessage(syncError)}`,
          );
        }
      }

      const result = await runGlobalSync({
        userId: currentUser.id,
        storeId,
        triggerSource,
        onProgress: ({ scope, label, detail }) => {
          set({
            syncProgressScope: scope,
            syncProgressLabel: label,
            syncProgressDetail: detail,
          });
        },
      });

      const latestLocalUser = await getUserById(currentUser.id);
      const mergedUser = mergeUserContext(
        latestLocalUser ?? currentUser,
        result.bootstrapSnapshot.userContext,
      );
      const userScopedState = await resolveUserScopedState(currentUser.id, result.bootstrapSnapshot.stores);

      set({
        status: 'authenticated',
        sessionMode: 'online',
        currentUser: mergedUser,
        currentUserContext: result.bootstrapSnapshot.userContext,
        availableStores: result.bootstrapSnapshot.stores,
        permissionScopes: result.bootstrapSnapshot.permissionScopes,
        currentStoreId: userScopedState.currentStoreId,
        autoTransmitEnabled: userScopedState.autoTransmitEnabled,
        appTheme: userScopedState.appTheme,
        appReadinessStatus: 'ready',
        appReadinessErrorKind: null,
        appReadinessMessage: null,
        appLastPreparedAt: result.bootstrapSnapshot.metadata.lastPreparedAt,
      });

      return true;
    } catch (error) {
      set({
        errorMessage: extractErrorMessage(error),
        appReadinessStatus: hadReadySnapshot ? 'ready' : 'error',
        appReadinessErrorKind: hadReadySnapshot ? null : 'backend',
        appReadinessMessage: hadReadySnapshot
          ? null
          : extractErrorMessage(error),
      });
      return false;
    } finally {
      const syncState = await refreshUsersSyncState();
      set({
        isSyncingApp: false,
        syncProgressScope: null,
        syncProgressLabel: null,
        syncProgressDetail: null,
        usersSynced: syncState.usersSynced,
        usersSyncVersion: syncState.usersSyncVersion,
        usersLastSyncedAt: syncState.usersLastSyncedAt,
      });
    }
  },

  loadLoginSyncStores: async (identifier, password) => {
    const normalizedIdentifier = normalizeIdentifier(identifier);
    const trimmedPassword = password.trim();

    if (!normalizedIdentifier || !trimmedPassword) {
      const message = 'Informe login/email e senha antes de sincronizar.';
      set({ errorMessage: message });
      throw new Error(message);
    }

    const connectivityStatus =
      get().connectivityStatus === 'unknown'
        ? await resolveConnectivityStatus().catch(() => 'unknown' as ConnectivityStatus)
        : get().connectivityStatus;

    if (connectivityStatus !== 'online') {
      const message =
        'A sincronizacao inicial a partir da tela de login exige internet disponivel.';
      set({ connectivityStatus, errorMessage: message });
      throw new Error(message);
    }

    set({
      isSyncingApp: true,
      syncProgressScope: 'preview.stores',
      syncProgressLabel: 'Lojas',
      syncProgressDetail: 'Carregando as lojas disponiveis para a sincronizacao inicial.',
      errorMessage: null,
      connectivityStatus,
    });

    try {
      const loginResponse = await loginOnline(normalizedIdentifier, trimmedPassword);
      setToken(loginResponse.accessToken);

      const account = await fetchCurrentAccount();
      const localUser = await ensureLocalUserRecord({
        account,
        normalizedIdentifier,
        password: trimmedPassword,
      });
      const syncedAt = new Date().toISOString();
      const storesPayload = await fetchStoresCatalog();
      const stores = Array.isArray(storesPayload)
        ? storesPayload.map((store) => normalizePreviewStore(store, syncedAt))
        : [];
      const userScopedState = await resolveUserScopedState(localUser.id, stores);

      return {
        userId: localUser.id,
        stores,
        preferredStoreId: userScopedState.currentStoreId,
      };
    } catch (error) {
      const message = extractErrorMessage(error);
      set({ errorMessage: message });
      throw new Error(message);
    } finally {
      clearToken();
      set({
        isSyncingApp: false,
        syncProgressScope: null,
        syncProgressLabel: null,
        syncProgressDetail: null,
      });
    }
  },

  syncFromLogin: async (identifier, password, storeId) => {
    const normalizedIdentifier = normalizeIdentifier(identifier);
    const trimmedPassword = password.trim();

    if (!normalizedIdentifier || !trimmedPassword) {
      set({ errorMessage: 'Informe login/email e senha antes de sincronizar.' });
      return false;
    }

    const connectivityStatus =
      get().connectivityStatus === 'unknown'
        ? await resolveConnectivityStatus().catch(() => 'unknown' as ConnectivityStatus)
        : get().connectivityStatus;

    if (connectivityStatus !== 'online') {
      set({
        connectivityStatus,
        errorMessage: 'A sincronizacao inicial pela tela de login exige internet disponivel.',
      });
      return false;
    }

    set({
      isSyncingApp: true,
      syncProgressScope: 'sync.users',
      syncProgressLabel: 'Usuarios',
      syncProgressDetail: 'Atualizando usuarios autorizados antes da sincronizacao inicial.',
      errorMessage: null,
      connectivityStatus,
    });

    try {
      const loginResponse = await loginOnline(normalizedIdentifier, trimmedPassword);
      setToken(loginResponse.accessToken);

      const syncStateBefore = await getUsersSyncState();
      try {
        await get().syncUsers();
      } catch (syncError) {
        if (!syncStateBefore.usersSynced) {
          throw new Error(
            `Falha na sincronizacao de usuarios. ${extractErrorMessage(syncError)}`,
          );
        }
      }

      const account = await fetchCurrentAccount();
      const localUser = await ensureLocalUserRecord({
        account,
        normalizedIdentifier,
        password: trimmedPassword,
      });

      await runGlobalSync({
        userId: localUser.id,
        storeId,
        triggerSource: 'login_sync',
        onProgress: ({ scope, label, detail }) => {
          set({
            syncProgressScope: scope,
            syncProgressLabel: label,
            syncProgressDetail: detail,
          });
        },
      });

      return true;
    } catch (error) {
      set({ errorMessage: extractErrorMessage(error) });
      return false;
    } finally {
      clearToken();
      const syncState = await refreshUsersSyncState();
      set({
        isSyncingApp: false,
        syncProgressScope: null,
        syncProgressLabel: null,
        syncProgressDetail: null,
        usersSynced: syncState.usersSynced,
        usersSyncVersion: syncState.usersSyncVersion,
        usersLastSyncedAt: syncState.usersLastSyncedAt,
      });
    }
  },

  setCurrentStoreId: async (storeId) => {
    const currentUser = get().currentUser;
    if (!currentUser) {
      throw new Error('Nenhum usuario autenticado para alterar a loja atual.');
    }

    if (
      storeId != null &&
      !get().availableStores.some((store) => store.id === storeId)
    ) {
      throw new Error('A loja selecionada nao esta disponivel para este usuario.');
    }

    await setCurrentStoreForUser(currentUser.id, storeId);
    set({ currentStoreId: storeId });
  },

  setAutoTransmitEnabled: async (enabled) => {
    const currentUser = get().currentUser;
    if (!currentUser) {
      throw new Error('Nenhum usuario autenticado para alterar a configuracao global de transmissao.');
    }

    await setAutoTransmitEnabledForUser(currentUser.id, enabled);
    set({ autoTransmitEnabled: enabled });
  },

  setAppTheme: async (theme) => {
    const currentUser = get().currentUser;
    if (!currentUser) {
      throw new Error('Nenhum usuario autenticado para alterar o tema do app.');
    }

    await setAppThemeForUser(currentUser.id, theme);
    set({ appTheme: theme });
  },

  login: async (identifier: string, password: string) => {
    const normalizedIdentifier = normalizeIdentifier(identifier);
    const trimmedPassword = password.trim();

    if (!normalizedIdentifier || !trimmedPassword) {
      set({ errorMessage: 'Informe login/email e senha.', isLoggingIn: false });
      return;
    }

    set({
      isLoggingIn: true,
      errorMessage: null,
    });

    const startedAt = new Date().toISOString();

    try {
      const connectivityStatus = await resolveConnectivityStatus().catch(
        () => 'unknown' as ConnectivityStatus,
      );
      set({ connectivityStatus });

      if (connectivityStatus === 'online') {
        const loginResponse = await loginOnline(normalizedIdentifier, trimmedPassword);
        setToken(loginResponse.accessToken);

        const syncStateBefore = await getUsersSyncState();
        try {
          await get().syncUsers();
        } catch (syncError) {
          if (!syncStateBefore.usersSynced) {
            clearToken();
            throw new Error(
              `Falha na sincronizacao inicial de usuarios. ${extractErrorMessage(syncError)}`,
            );
          }
        }

        const account = await fetchCurrentAccount();
        const localUser = await ensureLocalUserRecord({
          account,
          normalizedIdentifier,
          password: trimmedPassword,
        });

        const tokenExpiresAt = resolveTokenExpiration(loginResponse.accessToken);
        await saveSession({
          userId: localUser.id,
          token: loginResponse.accessToken,
          tokenExpiresAt,
          mode: 'online',
          lastLoginAt: startedAt,
        });
        await touchUserLastLogin(localUser.id, startedAt);
        const earlyUserSettings = await loadUserScopedSettings(localUser.id);

        const updatedUser = await getUserById(localUser.id);
        set({
          status: 'authenticated',
          sessionMode: 'online',
          currentUser: updatedUser ?? localUser,
          appTheme: earlyUserSettings.appTheme,
          errorMessage: null,
          appReadinessStatus: 'loading',
          appReadinessErrorKind: null,
          appReadinessMessage: null,
          appLastPreparedAt: null,
        });

        await get().prepareApp('post_login');
      } else {
        const syncState = await getUsersSyncState();
        if (!syncState.usersSynced) {
          throw new Error(
            'Conexao com a internet e necessaria para a sincronizacao inicial dos usuarios.',
          );
        }

        const localUser = await getUserByIdentifier(normalizedIdentifier);
        if (!localUser) {
          throw new Error('Usuario nao encontrado na base local.');
        }

        const passwordMatches = await comparePassword(trimmedPassword, localUser.passwordHash);
        if (!passwordMatches) {
          throw new Error('Senha invalida.');
        }

        await saveSession({
          userId: localUser.id,
          token: null,
          tokenExpiresAt: null,
          mode: 'offline',
          lastLoginAt: startedAt,
        });
        await touchUserLastLogin(localUser.id, startedAt);
        const earlyUserSettings = await loadUserScopedSettings(localUser.id);

        clearToken();
        const updatedUser = await getUserById(localUser.id);

        set({
          status: 'authenticated',
          sessionMode: 'offline',
          currentUser: updatedUser ?? localUser,
          appTheme: earlyUserSettings.appTheme,
          errorMessage: null,
          appReadinessStatus: 'loading',
          appReadinessErrorKind: null,
          appReadinessMessage: null,
          appLastPreparedAt: null,
        });

        await get().prepareApp('post_login');
      }
    } catch (error) {
      clearToken();
      set({
        status: 'unauthenticated',
        currentUser: null,
        sessionMode: null,
        errorMessage: extractErrorMessage(error),
        ...resetAuthenticatedContextState(),
      });
    } finally {
      const syncState = await refreshUsersSyncState();

      set({
        isLoggingIn: false,
        usersSynced: syncState.usersSynced,
        usersSyncVersion: syncState.usersSyncVersion,
        usersLastSyncedAt: syncState.usersLastSyncedAt,
      });
    }
  },

  logout: async () => {
    await clearSession();
    clearToken();
    set({
      status: 'unauthenticated',
      currentUser: null,
      sessionMode: null,
      errorMessage: null,
      isSyncingApp: false,
      syncProgressScope: null,
      syncProgressLabel: null,
      syncProgressDetail: null,
      ...resetAuthenticatedContextState(),
    });
  },
}));
