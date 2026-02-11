import { create } from 'zustand';
import { AxiosError } from 'axios';
import { jwtDecode } from 'jwt-decode';
import * as Network from 'expo-network';
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

type AuthStoreState = {
  status: AuthStatus;
  connectivityStatus: ConnectivityStatus;
  isLoggingIn: boolean;
  isSyncingUsers: boolean;
  errorMessage: string | null;
  usersSynced: boolean;
  usersSyncVersion: number;
  usersLastSyncedAt: string | null;
  sessionMode: SessionMode | null;
  currentUser: LocalAuthUser | null;
  bootstrap: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  syncUsers: () => Promise<void>;
  startNetworkMonitor: () => Promise<void>;
  stopNetworkMonitor: () => void;
};

function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase();
}

function isExpired(dateIso: string | null): boolean {
  if (!dateIso) return false;
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() <= Date.now();
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

function extractErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const apiMessage = error.response?.data?.message;
    if (Array.isArray(apiMessage)) return apiMessage.join('\n');
    if (typeof apiMessage === 'string' && apiMessage.trim()) return apiMessage;
    if (error.message.trim()) return error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Nao foi possivel concluir a operacao.';
}

async function resolveConnectivityStatus(): Promise<ConnectivityStatus> {
  const networkState = await Network.getNetworkStateAsync();
  const connected = Boolean(networkState.isConnected);
  const internetReachable = networkState.isInternetReachable !== false;
  return connected && internetReachable ? 'online' : 'offline';
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

let networkSubscription: { remove: () => void } | null = null;

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  status: 'bootstrapping',
  connectivityStatus: 'unknown',
  isLoggingIn: false,
  isSyncingUsers: false,
  errorMessage: null,
  usersSynced: false,
  usersSyncVersion: 0,
  usersLastSyncedAt: null,
  sessionMode: null,
  currentUser: null,

  bootstrap: async () => {
    set({ status: 'bootstrapping', errorMessage: null });

    try {
      const [syncState, connectivityStatus, sessionWithUser] = await Promise.all([
        getUsersSyncState(),
        resolveConnectivityStatus().catch(() => 'unknown' as ConnectivityStatus),
        getSessionWithUser(),
      ]);

      const nextBaseState: Partial<AuthStoreState> = {
        connectivityStatus,
        usersSynced: syncState.usersSynced,
        usersSyncVersion: syncState.usersSyncVersion,
        usersLastSyncedAt: syncState.usersLastSyncedAt,
      };

      if (!sessionWithUser) {
        clearToken();
        set({
          ...nextBaseState,
          status: 'unauthenticated',
          currentUser: null,
          sessionMode: null,
        });
        return;
      }

      const { session, user } = sessionWithUser;

      if (session.mode === 'online' && !session.token) {
        await clearSession();
        clearToken();
        set({
          ...nextBaseState,
          status: 'unauthenticated',
          currentUser: null,
          sessionMode: null,
        });
        return;
      }

      if (session.mode === 'online' && isExpired(session.tokenExpiresAt)) {
        await clearSession();
        clearToken();
        set({
          ...nextBaseState,
          status: 'unauthenticated',
          currentUser: null,
          sessionMode: null,
        });
        return;
      }

      if (session.mode === 'online' && session.token) {
        setToken(session.token);
      } else {
        clearToken();
      }

      set({
        ...nextBaseState,
        status: 'authenticated',
        currentUser: user,
        sessionMode: session.mode,
      });

      if (session.mode === 'online' && connectivityStatus === 'online') {
        void get().syncUsers().catch(() => undefined);
      }
    } catch (error) {
      clearToken();
      set({
        status: 'unauthenticated',
        currentUser: null,
        sessionMode: null,
        errorMessage: extractErrorMessage(error),
      });
    }
  },

  startNetworkMonitor: async () => {
    if (networkSubscription) return;

    const initialStatus = await resolveConnectivityStatus().catch(() => 'unknown' as ConnectivityStatus);
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
      const remoteUsers = Array.isArray(payload.users) ? payload.users.map(normalizeRemoteUser) : [];

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
      const connectivityStatus = await resolveConnectivityStatus().catch(() => 'unknown' as ConnectivityStatus);
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
        let localUser = await getUserById(account.id);

        if (!localUser) {
          const fallbackHash = await hashPassword(trimmedPassword);
          const fallbackLogin = account.email || normalizedIdentifier;
          const nowIso = new Date().toISOString();

          await upsertSingleUser({
            id: account.id,
            name: account.name,
            email: account.email || null,
            login: fallbackLogin,
            passwordHash: fallbackHash,
            permissions: [],
            updatedAt: nowIso,
            syncedAt: nowIso,
          });

          localUser = await getUserById(account.id);
        }

        if (!localUser) {
          throw new Error('Nao foi possivel persistir o usuario localmente.');
        }

        const tokenExpiresAt = resolveTokenExpiration(loginResponse.accessToken);
        await saveSession({
          userId: localUser.id,
          token: loginResponse.accessToken,
          tokenExpiresAt,
          mode: 'online',
          lastLoginAt: startedAt,
        });
        await touchUserLastLogin(localUser.id, startedAt);

        const updatedUser = await getUserById(localUser.id);
        set({
          status: 'authenticated',
          sessionMode: 'online',
          currentUser: updatedUser ?? localUser,
          errorMessage: null,
        });
      } else {
        const syncState = await getUsersSyncState();
        if (!syncState.usersSynced) {
          throw new Error(
            'É necessário conexão com a internet para sincronização inicial dos usuários.',
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

        clearToken();
        const updatedUser = await getUserById(localUser.id);

        set({
          status: 'authenticated',
          sessionMode: 'offline',
          currentUser: updatedUser ?? localUser,
          errorMessage: null,
        });
      }
    } catch (error) {
      clearToken();
      set({
        status: 'unauthenticated',
        currentUser: null,
        sessionMode: null,
        errorMessage: extractErrorMessage(error),
      });
    } finally {
      const syncState = await getUsersSyncState().catch(
        () =>
          ({
            usersSynced: false,
            usersSyncVersion: 0,
            usersLastSyncedAt: null,
          }) satisfies UsersSyncState,
      );

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
    });
  },
}));
