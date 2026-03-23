import type {
  DatabaseExecutor,
  UserPreferenceRow,
  UserPreferenceUpsertInput,
} from '@/src/database/types';
import { runInTransaction } from '@/src/database/client';
import { getReadyDatabase } from '@/src/database/repositories/shared';

async function resolveExecutor(db?: DatabaseExecutor): Promise<DatabaseExecutor> {
  return db ?? (await getReadyDatabase());
}

export async function getUserPreferenceRow(
  userId: number,
  preferenceKey: string,
  db?: DatabaseExecutor,
): Promise<UserPreferenceRow | null> {
  const executor = await resolveExecutor(db);
  return executor.getFirstAsync<UserPreferenceRow>(
    `
      SELECT
        id,
        user_id,
        preference_key,
        preference_value,
        created_at,
        updated_at
      FROM user_preferences
      WHERE user_id = ? AND preference_key = ?
      LIMIT 1
    `,
    [userId, preferenceKey],
  );
}

export async function upsertUserPreference(
  input: UserPreferenceUpsertInput,
  db?: DatabaseExecutor,
): Promise<void> {
  const executor = await resolveExecutor(db);
  await executor.runAsync(
    `
      INSERT INTO user_preferences (
        user_id,
        preference_key,
        preference_value,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, preference_key) DO UPDATE SET
        preference_value = excluded.preference_value,
        updated_at = excluded.updated_at
    `,
    [
      input.userId,
      input.preferenceKey,
      input.preferenceValue,
      input.createdAt,
      input.updatedAt,
    ],
  );
}

export async function deleteUserPreference(
  userId: number,
  preferenceKey: string,
  db?: DatabaseExecutor,
): Promise<void> {
  const executor = await resolveExecutor(db);
  await executor.runAsync(
    `
      DELETE FROM user_preferences
      WHERE user_id = ? AND preference_key = ?
    `,
    [userId, preferenceKey],
  );
}

export async function replaceUserPreferences(
  userId: number,
  inputs: readonly UserPreferenceUpsertInput[],
): Promise<void> {
  const db = await getReadyDatabase();

  await runInTransaction(db, async () => {
    await db.runAsync('DELETE FROM user_preferences WHERE user_id = ?', [userId]);

    for (const input of inputs) {
      await upsertUserPreference(input, db);
    }
  });
}
