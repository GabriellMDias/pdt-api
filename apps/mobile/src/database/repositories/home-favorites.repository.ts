import type {
  DatabaseExecutor,
  HomeFavoriteInsertInput,
  HomeFavoriteRow,
} from '@/src/database/types';
import { runInTransaction } from '@/src/database/client';
import { getReadyDatabase } from '@/src/database/repositories/shared';

async function resolveExecutor(db?: DatabaseExecutor): Promise<DatabaseExecutor> {
  return db ?? (await getReadyDatabase());
}

export async function listHomeFavoriteRowsByUser(
  userId: number,
  db?: DatabaseExecutor,
): Promise<HomeFavoriteRow[]> {
  const executor = await resolveExecutor(db);
  return executor.getAllAsync<HomeFavoriteRow>(
    `
      SELECT
        id,
        user_id,
        route_key,
        label,
        icon,
        sort_order,
        created_at,
        updated_at
      FROM home_favorites
      WHERE user_id = ?
      ORDER BY sort_order ASC, id ASC
    `,
    [userId],
  );
}

export async function replaceHomeFavoriteRowsByUser(
  userId: number,
  favorites: readonly HomeFavoriteInsertInput[],
): Promise<void> {
  const db = await getReadyDatabase();

  await runInTransaction(db, async () => {
    await db.runAsync('DELETE FROM home_favorites WHERE user_id = ?', [userId]);

    for (const favorite of favorites) {
      await db.runAsync(
        `
          INSERT INTO home_favorites (
            user_id,
            route_key,
            label,
            icon,
            sort_order,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          favorite.userId,
          favorite.routeKey,
          favorite.label,
          favorite.icon,
          favorite.sortOrder,
          favorite.createdAt,
          favorite.updatedAt,
        ],
      );
    }
  });
}
