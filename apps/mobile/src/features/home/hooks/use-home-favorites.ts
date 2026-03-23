import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { HomeFavoriteShortcut } from '@/src/features/home/types';
import { listHomeFavoritesForUser } from '@/src/features/home/services/home-favorites.service';

type UseHomeFavoritesResult = {
  favorites: HomeFavoriteShortcut[];
  loading: boolean;
  errorMessage: string | null;
  reload: () => Promise<void>;
};

export function useHomeFavorites(userId: number | null): UseHomeFavoritesResult {
  const [favorites, setFavorites] = useState<HomeFavoriteShortcut[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadFavorites = useCallback(async () => {
    if (!userId) {
      setFavorites([]);
      setErrorMessage(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const nextFavorites = await listHomeFavoritesForUser(userId);
      setFavorites(nextFavorites);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel carregar os favoritos.';
      setErrorMessage(message);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void loadFavorites();
    }, [loadFavorites]),
  );

  return {
    favorites,
    loading,
    errorMessage,
    reload: loadFavorites,
  };
}
