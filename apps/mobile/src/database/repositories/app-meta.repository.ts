import type { AppMetaRow, DatabaseExecutor } from '@/src/database/types';
import { getReadyDatabase } from '@/src/database/repositories/shared';

async function resolveExecutor(db?: DatabaseExecutor): Promise<DatabaseExecutor> {
  return db ?? (await getReadyDatabase());
}

export async function getAppMeta(
  key: string,
  db?: DatabaseExecutor,
): Promise<AppMetaRow | null> {
  const executor = await resolveExecutor(db);
  return executor.getFirstAsync<AppMetaRow>(
    `
      SELECT key, value, updated_at
      FROM app_meta
      WHERE key = ?
      LIMIT 1
    `,
    [key],
  );
}

export async function setAppMeta(
  key: string,
  value: string,
  updatedAt: string,
  db?: DatabaseExecutor,
): Promise<void> {
  const executor = await resolveExecutor(db);
  await executor.runAsync(
    `
      INSERT INTO app_meta (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `,
    [key, value, updatedAt],
  );
}
