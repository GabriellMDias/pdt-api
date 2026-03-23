import {
  getAppMeta,
  listHomeFavoriteRowsByUser,
  replaceHomeFavoriteRowsByUser,
  setAppMeta,
} from '@/src/database/repositories';
import {
  defaultFavoriteShortcuts,
  getHomeNavigationItemByKey,
  homeNavigationGroups,
} from '@/src/features/home/home-navigation';
import type {
  HomeFavoriteShortcut,
  HomeNavigationGroup,
  HomeNavigationItem,
} from '@/src/features/home/types';

function buildFavoritesInitializedMetaKey(userId: number) {
  return `home_favorites_initialized_user_${userId}`;
}

function listConfigurableItems() {
  return homeNavigationGroups.flatMap((group) => group.items);
}

function mapItemToShortcut(item: HomeNavigationItem): HomeFavoriteShortcut {
  return {
    key: `favorite-${item.key}`,
    label: item.label,
    itemKey: item.key,
  };
}

function mapItemToInsert(userId: number, item: HomeNavigationItem, sortOrder: number, now: string) {
  return {
    userId,
    routeKey: item.key,
    label: item.label,
    icon: item.key,
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };
}

async function ensureInitialized(userId: number): Promise<void> {
  const metaKey = buildFavoritesInitializedMetaKey(userId);
  const existingMeta = await getAppMeta(metaKey);
  if (existingMeta?.value === '1') {
    return;
  }

  const now = new Date().toISOString();
  const defaults = defaultFavoriteShortcuts
    .map((shortcut) => getHomeNavigationItemByKey(shortcut.itemKey)?.item ?? null)
    .filter((item): item is HomeNavigationItem => item !== null)
    .map((item, index) => mapItemToInsert(userId, item, index, now));

  await replaceHomeFavoriteRowsByUser(userId, defaults);
  await setAppMeta(metaKey, '1', now);
}

export async function listHomeFavoritesForUser(userId: number): Promise<HomeFavoriteShortcut[]> {
  await ensureInitialized(userId);

  const rows = await listHomeFavoriteRowsByUser(userId);

  return rows
    .map((row) => getHomeNavigationItemByKey(row.route_key)?.item ?? null)
    .filter((item): item is HomeNavigationItem => item !== null)
    .map(mapItemToShortcut);
}

export async function saveHomeFavoritesForUser(
  userId: number,
  routeKeys: readonly string[],
): Promise<HomeFavoriteShortcut[]> {
  const uniqueRouteKeys = Array.from(new Set(routeKeys));
  const now = new Date().toISOString();

  const favorites = uniqueRouteKeys
    .map((routeKey) => getHomeNavigationItemByKey(routeKey)?.item ?? null)
    .filter((item): item is HomeNavigationItem => item !== null)
    .map((item, index) => mapItemToInsert(userId, item, index, now));

  await replaceHomeFavoriteRowsByUser(userId, favorites);
  await setAppMeta(buildFavoritesInitializedMetaKey(userId), '1', now);

  return favorites.map((favorite) => ({
    key: `favorite-${favorite.routeKey}`,
    label: favorite.label,
    itemKey: favorite.routeKey,
  }));
}

export function listHomeFavoriteEditorGroups(): HomeNavigationGroup[] {
  return homeNavigationGroups.filter((group) => group.id !== 1 && group.items.length > 0);
}

export function listHomeFavoriteItems(): HomeNavigationItem[] {
  return listConfigurableItems();
}
