export type ConnectivityStatus = 'online' | 'offline' | 'unknown';
export type AuthStatus = 'bootstrapping' | 'authenticated' | 'unauthenticated';
export type SessionMode = 'online' | 'offline';

export type BasicPermission = {
  code: string;
};

export type RemoteSyncUser = {
  id: number;
  name: string;
  email: string;
  login: string;
  passwordHash: string;
  permissions: BasicPermission[];
  updatedAt: string;
};

export type RemoteSyncPayload = {
  users: RemoteSyncUser[];
  syncVersion: number;
  syncedAt: string;
};

export type LoginResponse = {
  accessToken: string;
};

export type AccountMeResponse = {
  id: number;
  name: string;
  email: string;
  activeStatus: boolean;
  notifyCostCenterType: boolean;
  createdAt: string;
  codigoUsuarioVrMaster?: number | null;
};

export type LocalAuthUser = {
  id: number;
  name: string;
  email: string | null;
  login: string;
  loginNormalized: string;
  passwordHash: string;
  permissions: BasicPermission[];
  updatedAt: string;
  syncedAt: string;
  lastLoginAt: string | null;
};

export type LocalAuthSession = {
  userId: number;
  token: string | null;
  tokenExpiresAt: string | null;
  mode: SessionMode;
  lastLoginAt: string;
  createdAt: string;
  updatedAt: string;
};

export type LocalSessionWithUser = {
  session: LocalAuthSession;
  user: LocalAuthUser;
};

export type UsersSyncState = {
  usersSynced: boolean;
  usersSyncVersion: number;
  usersLastSyncedAt: string | null;
};

export type JwtAccessToken = {
  exp?: number;
};
