import { ensureDatabaseSchema } from '@/src/database/migrations';
import { getDatabase } from '@/src/database/client';
import {
  USERS_LAST_SYNCED_AT_META_KEY,
  USERS_SYNCED_META_KEY,
  USERS_SYNC_VERSION_META_KEY,
} from '@/src/features/auth/constants';
import type {
  BasicPermission,
  LocalAuthSession,
  LocalAuthUser,
  LocalSessionWithUser,
  RemoteSyncUser,
  SessionMode,
  UsersSyncState,
} from '@/src/features/auth/types';

type LocalAuthUserRow = {
  id: number;
  name: string;
  email: string | null;
  login: string;
  login_normalized: string;
  password_hash: string;
  permissions_json: string;
  updated_at: string;
  synced_at: string;
  last_login_at: string | null;
};

type LocalAuthSessionRow = {
  user_id: number;
  token: string | null;
  token_expires_at: string | null;
  mode: SessionMode;
  last_login_at: string;
  created_at: string;
  updated_at: string;
};

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

function mapUserRow(row: LocalAuthUserRow): LocalAuthUser {
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

function mapSessionRow(row: LocalAuthSessionRow): LocalAuthSession {
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

async function getReadyDatabase() {
  const db = await getDatabase();
  await ensureDatabaseSchema(db);
  return db;
}

async function setMeta(key: string, value: string): Promise<void> {
  const db = await getReadyDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `
      INSERT INTO app_meta (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `,
    [key, value, now],
  );
}

async function getMeta(key: string): Promise<string | null> {
  const db = await getReadyDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_meta WHERE key = ? LIMIT 1',
    [key],
  );
  return row?.value ?? null;
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

export async function upsertUsersFromSync(users: RemoteSyncUser[], syncedAt: string): Promise<void> {
  const db = await getReadyDatabase();
  const syncedUserIds = users.map((user) => user.id);

  await db.execAsync('BEGIN TRANSACTION');
  try {
    for (const user of users) {
      const login = user.login?.trim() || user.email?.trim() || String(user.id);
      const loginNormalized = normalizeIdentifier(login);
      const permissionsJson = JSON.stringify(user.permissions ?? []);
      const updatedAt = user.updatedAt || syncedAt;

      await db.runAsync(
        `
          INSERT INTO auth_users (
            id,
            name,
            email,
            login,
            login_normalized,
            password_hash,
            permissions_json,
            updated_at,
            synced_at,
            last_login_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(
            (SELECT last_login_at FROM auth_users WHERE id = ?),
            NULL
          ))
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            email = excluded.email,
            login = excluded.login,
            login_normalized = excluded.login_normalized,
            password_hash = excluded.password_hash,
            permissions_json = excluded.permissions_json,
            updated_at = excluded.updated_at,
            synced_at = excluded.synced_at
        `,
        [
          user.id,
          user.name,
          user.email,
          login,
          loginNormalized,
          user.passwordHash,
          permissionsJson,
          updatedAt,
          syncedAt,
          user.id,
        ],
      );
    }

    if (syncedUserIds.length > 0) {
      const placeholders = syncedUserIds.map(() => '?').join(', ');
      await db.runAsync(
        `DELETE FROM auth_users WHERE id NOT IN (${placeholders})`,
        syncedUserIds,
      );
    } else {
      await db.runAsync('DELETE FROM auth_users');
    }

    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
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
  const db = await getReadyDatabase();
  const loginNormalized = normalizeIdentifier(payload.login);
  const permissionsJson = JSON.stringify(payload.permissions ?? []);

  await db.runAsync(
    `
      INSERT INTO auth_users (
        id,
        name,
        email,
        login,
        login_normalized,
        password_hash,
        permissions_json,
        updated_at,
        synced_at,
        last_login_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(
        (SELECT last_login_at FROM auth_users WHERE id = ?),
        NULL
      ))
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        email = excluded.email,
        login = excluded.login,
        login_normalized = excluded.login_normalized,
        password_hash = excluded.password_hash,
        permissions_json = excluded.permissions_json,
        updated_at = excluded.updated_at,
        synced_at = excluded.synced_at
    `,
    [
      payload.id,
      payload.name,
      payload.email,
      payload.login,
      loginNormalized,
      payload.passwordHash,
      permissionsJson,
      payload.updatedAt,
      payload.syncedAt,
      payload.id,
    ],
  );
}

export async function getUserById(userId: number): Promise<LocalAuthUser | null> {
  const db = await getReadyDatabase();
  const row = await db.getFirstAsync<LocalAuthUserRow>(
    `
      SELECT
        id,
        name,
        email,
        login,
        login_normalized,
        password_hash,
        permissions_json,
        updated_at,
        synced_at,
        last_login_at
      FROM auth_users
      WHERE id = ?
      LIMIT 1
    `,
    [userId],
  );

  return row ? mapUserRow(row) : null;
}

export async function getUserByIdentifier(identifier: string): Promise<LocalAuthUser | null> {
  const db = await getReadyDatabase();
  const normalized = normalizeIdentifier(identifier);

  const row = await db.getFirstAsync<LocalAuthUserRow>(
    `
      SELECT
        id,
        name,
        email,
        login,
        login_normalized,
        password_hash,
        permissions_json,
        updated_at,
        synced_at,
        last_login_at
      FROM auth_users
      WHERE login_normalized = ?
         OR lower(COALESCE(email, '')) = ?
      LIMIT 1
    `,
    [normalized, normalized],
  );

  return row ? mapUserRow(row) : null;
}

export async function saveSession(payload: {
  userId: number;
  token: string | null;
  tokenExpiresAt: string | null;
  mode: SessionMode;
  lastLoginAt: string;
}): Promise<void> {
  const db = await getReadyDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    `
      INSERT INTO auth_sessions (
        id,
        user_id,
        token,
        token_expires_at,
        mode,
        last_login_at,
        created_at,
        updated_at
      )
      VALUES (1, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        user_id = excluded.user_id,
        token = excluded.token,
        token_expires_at = excluded.token_expires_at,
        mode = excluded.mode,
        last_login_at = excluded.last_login_at,
        updated_at = excluded.updated_at
    `,
    [
      payload.userId,
      payload.token,
      payload.tokenExpiresAt,
      payload.mode,
      payload.lastLoginAt,
      now,
      now,
    ],
  );
}

export async function clearSession(): Promise<void> {
  const db = await getReadyDatabase();
  await db.runAsync('DELETE FROM auth_sessions WHERE id = 1');
}

export async function getSessionWithUser(): Promise<LocalSessionWithUser | null> {
  const db = await getReadyDatabase();
  const session = await db.getFirstAsync<LocalAuthSessionRow>(
    `
      SELECT
        user_id,
        token,
        token_expires_at,
        mode,
        last_login_at,
        created_at,
        updated_at
      FROM auth_sessions
      WHERE id = 1
      LIMIT 1
    `,
  );

  if (!session) return null;

  const user = await getUserById(session.user_id);
  if (!user) return null;

  return {
    session: mapSessionRow(session),
    user,
  };
}

export async function touchUserLastLogin(userId: number, lastLoginAt: string): Promise<void> {
  const db = await getReadyDatabase();
  await db.runAsync(
    `
      UPDATE auth_users
      SET last_login_at = ?
      WHERE id = ?
    `,
    [lastLoginAt, userId],
  );
}
