import {
  getAppMeta,
  setAppMeta,
  clearAuthSession,
  getAuthSessionRow,
  getAuthUserRowById,
  getAuthUserRowByIdentifier,
  replaceAuthUsersFromSync,
  touchAuthUserLastLogin,
  upsertAuthSession,
  upsertAuthUser,
} from '@/src/database/repositories';
import {
  USERS_LAST_SYNCED_AT_META_KEY,
  USERS_SYNCED_META_KEY,
  USERS_SYNC_VERSION_META_KEY,
} from '@/src/features/auth/constants';
import type {
  AuthSessionRow,
  AuthSessionUpsertInput,
  AuthUserRow,
  AuthUserUpsertInput,
} from '@/src/database/types';
import type {
  BasicPermission,
  LocalAuthSession,
  LocalAuthUser,
  LocalSessionWithUser,
  RemoteSyncUser,
  SessionMode,
  UsersSyncState,
} from '@/src/features/auth/types';

function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase();
}

function parsePermissions(raw: string): BasicPermission[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is BasicPermission => Boolean(item && typeof item.code === 'string'))
      .map((item) => ({ code: item.code }));
  } catch {
    return [];
  }
}

function mapUserRow(row: AuthUserRow): LocalAuthUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    login: row.login,
    loginNormalized: row.login_normalized,
    passwordHash: row.password_hash,
    permissions: parsePermissions(row.permissions_json),
    updatedAt: row.updated_at,
    syncedAt: row.synced_at,
    lastLoginAt: row.last_login_at,
  };
}

function mapSessionRow(row: AuthSessionRow): LocalAuthSession {
  return {
    userId: row.user_id,
    token: row.token,
    tokenExpiresAt: row.token_expires_at,
    mode: row.mode,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function setMeta(key: string, value: string): Promise<void> {
  await setAppMeta(key, value, new Date().toISOString());
}

async function getMeta(key: string): Promise<string | null> {
  const row = await getAppMeta(key);
  return row?.value ?? null;
}

function buildAuthUserUpsertInput(
  payload: {
    id: number;
    name: string;
    email: string | null;
    login: string;
    passwordHash: string;
    permissions: BasicPermission[];
    updatedAt: string;
    syncedAt: string;
  },
): AuthUserUpsertInput {
  return {
    id: payload.id,
    name: payload.name,
    email: payload.email,
    login: payload.login,
    loginNormalized: normalizeIdentifier(payload.login),
    passwordHash: payload.passwordHash,
    permissionsJson: JSON.stringify(payload.permissions ?? []),
    updatedAt: payload.updatedAt,
    syncedAt: payload.syncedAt,
  };
}

export async function getUsersSyncState(): Promise<UsersSyncState> {
  const [syncedRaw, versionRaw, syncedAtRaw] = await Promise.all([
    getMeta(USERS_SYNCED_META_KEY),
    getMeta(USERS_SYNC_VERSION_META_KEY),
    getMeta(USERS_LAST_SYNCED_AT_META_KEY),
  ]);

  const usersSynced = syncedRaw === '1';
  const usersSyncVersion = Number(versionRaw ?? 0) || 0;

  return {
    usersSynced,
    usersSyncVersion,
    usersLastSyncedAt: syncedAtRaw,
  };
}

export async function markUsersSynced(version: number, syncedAt: string): Promise<void> {
  await Promise.all([
    setMeta(USERS_SYNCED_META_KEY, '1'),
    setMeta(USERS_SYNC_VERSION_META_KEY, String(version)),
    setMeta(USERS_LAST_SYNCED_AT_META_KEY, syncedAt),
  ]);
}

export async function upsertUsersFromSync(
  users: RemoteSyncUser[],
  syncedAt: string,
): Promise<void> {
  const upsertInputs = users.map((user) => {
    const login = user.login?.trim() || user.email?.trim() || String(user.id);

    return buildAuthUserUpsertInput({
      id: user.id,
      name: user.name,
      email: user.email,
      login,
      passwordHash: user.passwordHash,
      permissions: user.permissions ?? [],
      updatedAt: user.updatedAt || syncedAt,
      syncedAt,
    });
  });

  await replaceAuthUsersFromSync(upsertInputs);
}

export async function upsertSingleUser(payload: {
  id: number;
  name: string;
  email: string | null;
  login: string;
  passwordHash: string;
  permissions: BasicPermission[];
  updatedAt: string;
  syncedAt: string;
}): Promise<void> {
  await upsertAuthUser(buildAuthUserUpsertInput(payload));
}

export async function getUserById(userId: number): Promise<LocalAuthUser | null> {
  const row = await getAuthUserRowById(userId);
  return row ? mapUserRow(row) : null;
}

export async function getUserByIdentifier(identifier: string): Promise<LocalAuthUser | null> {
  const row = await getAuthUserRowByIdentifier(normalizeIdentifier(identifier));
  return row ? mapUserRow(row) : null;
}

export async function saveSession(payload: {
  userId: number;
  token: string | null;
  tokenExpiresAt: string | null;
  mode: SessionMode;
  lastLoginAt: string;
}): Promise<void> {
  const sessionInput: AuthSessionUpsertInput = {
    userId: payload.userId,
    token: payload.token,
    tokenExpiresAt: payload.tokenExpiresAt,
    mode: payload.mode,
    lastLoginAt: payload.lastLoginAt,
  };

  await upsertAuthSession(sessionInput);
}

export async function clearSession(): Promise<void> {
  await clearAuthSession();
}

export async function getSessionWithUser(): Promise<LocalSessionWithUser | null> {
  const session = await getAuthSessionRow();
  if (!session) return null;

  const user = await getAuthUserRowById(session.user_id);
  if (!user) return null;

  return {
    session: mapSessionRow(session),
    user: mapUserRow(user),
  };
}

export async function touchUserLastLogin(userId: number, lastLoginAt: string): Promise<void> {
  await touchAuthUserLastLogin(userId, lastLoginAt);
}
