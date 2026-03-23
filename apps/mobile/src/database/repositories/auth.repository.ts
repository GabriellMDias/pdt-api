import type {
  AuthSessionRow,
  AuthSessionUpsertInput,
  AuthUserRow,
  AuthUserUpsertInput,
  DatabaseExecutor,
} from '@/src/database/types';
import { runInTransaction } from '@/src/database/client';
import { getReadyDatabase } from '@/src/database/repositories/shared';

async function resolveExecutor(db?: DatabaseExecutor): Promise<DatabaseExecutor> {
  return db ?? (await getReadyDatabase());
}

export async function replaceAuthUsersFromSync(
  users: readonly AuthUserUpsertInput[],
): Promise<void> {
  const db = await getReadyDatabase();
  const syncedUserIds = users.map((user) => user.id);

  await runInTransaction(db, async () => {
    for (const user of users) {
      await upsertAuthUser(user, db);
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
  });
}

export async function upsertAuthUser(
  input: AuthUserUpsertInput,
  db?: DatabaseExecutor,
): Promise<void> {
  const executor = await resolveExecutor(db);

  await executor.runAsync(
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
      input.id,
      input.name,
      input.email,
      input.login,
      input.loginNormalized,
      input.passwordHash,
      input.permissionsJson,
      input.updatedAt,
      input.syncedAt,
      input.id,
    ],
  );
}

export async function getAuthUserRowById(
  userId: number,
  db?: DatabaseExecutor,
): Promise<AuthUserRow | null> {
  const executor = await resolveExecutor(db);
  return executor.getFirstAsync<AuthUserRow>(
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
}

export async function getAuthUserRowByIdentifier(
  normalizedIdentifier: string,
  db?: DatabaseExecutor,
): Promise<AuthUserRow | null> {
  const executor = await resolveExecutor(db);
  return executor.getFirstAsync<AuthUserRow>(
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
    [normalizedIdentifier, normalizedIdentifier],
  );
}

export async function upsertAuthSession(
  input: AuthSessionUpsertInput,
  db?: DatabaseExecutor,
): Promise<void> {
  const executor = await resolveExecutor(db);
  const now = new Date().toISOString();

  await executor.runAsync(
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
      input.userId,
      input.token,
      input.tokenExpiresAt,
      input.mode,
      input.lastLoginAt,
      now,
      now,
    ],
  );
}

export async function clearAuthSession(db?: DatabaseExecutor): Promise<void> {
  const executor = await resolveExecutor(db);
  await executor.runAsync('DELETE FROM auth_sessions WHERE id = 1');
}

export async function getAuthSessionRow(
  db?: DatabaseExecutor,
): Promise<AuthSessionRow | null> {
  const executor = await resolveExecutor(db);
  return executor.getFirstAsync<AuthSessionRow>(
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
}

export async function touchAuthUserLastLogin(
  userId: number,
  lastLoginAt: string,
  db?: DatabaseExecutor,
): Promise<void> {
  const executor = await resolveExecutor(db);
  await executor.runAsync(
    `
      UPDATE auth_users
      SET last_login_at = ?
      WHERE id = ?
    `,
    [lastLoginAt, userId],
  );
}
