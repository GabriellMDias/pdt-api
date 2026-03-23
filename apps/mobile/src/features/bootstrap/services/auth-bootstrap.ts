import { AxiosError } from 'axios';
import * as Network from 'expo-network';
import { clearToken, setToken } from '@/src/core/security/token-vault';
import {
  clearSession,
  getSessionWithUser,
  getUsersSyncState,
} from '@/src/features/auth/data/auth-db';
import type {
  ConnectivityStatus,
  LocalSessionWithUser,
  UsersSyncState,
} from '@/src/features/auth/types';

export type StoredAuthBootstrapResult = {
  connectivityStatus: ConnectivityStatus;
  usersSyncState: UsersSyncState;
  sessionWithUser: LocalSessionWithUser | null;
};

function isExpired(dateIso: string | null): boolean {
  if (!dateIso) return false;
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() <= Date.now();
}

export function extractErrorMessage(error: unknown): string {
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

export async function resolveConnectivityStatus(): Promise<ConnectivityStatus> {
  const networkState = await Network.getNetworkStateAsync();
  const connected = Boolean(networkState.isConnected);
  const internetReachable = networkState.isInternetReachable !== false;
  return connected && internetReachable ? 'online' : 'offline';
}

export async function resolveStoredAuthBootstrap(): Promise<StoredAuthBootstrapResult> {
  const [usersSyncState, connectivityStatus, sessionWithUser] = await Promise.all([
    getUsersSyncState(),
    resolveConnectivityStatus().catch(() => 'unknown' as ConnectivityStatus),
    getSessionWithUser(),
  ]);

  if (!sessionWithUser) {
    clearToken();
    return {
      connectivityStatus,
      usersSyncState,
      sessionWithUser: null,
    };
  }

  const { session } = sessionWithUser;

  if (session.mode === 'online' && !session.token) {
    await clearSession();
    clearToken();
    return {
      connectivityStatus,
      usersSyncState,
      sessionWithUser: null,
    };
  }

  if (session.mode === 'online' && isExpired(session.tokenExpiresAt)) {
    await clearSession();
    clearToken();
    return {
      connectivityStatus,
      usersSyncState,
      sessionWithUser: null,
    };
  }

  if (session.mode === 'online' && session.token) {
    setToken(session.token);
  } else {
    clearToken();
  }

  return {
    connectivityStatus,
    usersSyncState,
    sessionWithUser,
  };
}
