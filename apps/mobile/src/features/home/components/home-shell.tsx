import { AntDesign, Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getHomeNavigationItemByKey, homeNavigationGroups } from '@/src/features/home/home-navigation';
import { HomeBottomActions } from '@/src/features/home/components/home-bottom-actions';
import { HomeBrandPanel } from '@/src/features/home/components/home-brand-panel';
import { HomeFavoritesRail } from '@/src/features/home/components/home-favorites-rail';
import { HomeHeader } from '@/src/features/home/components/home-header';
import { HomeSidebar } from '@/src/features/home/components/home-sidebar';
import { useHomeFavorites } from '@/src/features/home/hooks/use-home-favorites';
import {
  StoreSelectorModal,
  getSelectableSyncStores,
} from '@/src/features/sync/components/store-selector-modal';
import type { HomeNavigationItem } from '@/src/features/home/types';
import { useAuthStore } from '@/src/features/auth/store/use-auth-store';
import { useAppTheme, useThemedStyles, type AppTheme } from '@/src/theme/theme-provider';

function navigateToItem(
  router: ReturnType<typeof useRouter>,
  item: HomeNavigationItem,
) {
  if (item.target.type === 'route') {
    router.push(item.target.href);
    return;
  }

  router.push({
    pathname: '/menu-placeholder',
    params: {
      title: item.target.title,
      description: item.target.description,
    },
  });
}

type HomeShellProps = {
  isRefreshing?: boolean;
};

export function HomeShell({ isRefreshing = false }: HomeShellProps) {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const drawerAnimation = useRef(new Animated.Value(0)).current;
  const menuAnimation = useRef(new Animated.Value(0)).current;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [pendingStoreId, setPendingStoreId] = useState<number | null>(null);

  const currentUser = useAuthStore((state) => state.currentUser);
  const currentUserContext = useAuthStore((state) => state.currentUserContext);
  const sessionMode = useAuthStore((state) => state.sessionMode);
  const connectivityStatus = useAuthStore((state) => state.connectivityStatus);
  const currentStoreId = useAuthStore((state) => state.currentStoreId);
  const isSyncingApp = useAuthStore((state) => state.isSyncingApp);
  const syncProgressScope = useAuthStore((state) => state.syncProgressScope);
  const syncProgressLabel = useAuthStore((state) => state.syncProgressLabel);
  const syncProgressDetail = useAuthStore((state) => state.syncProgressDetail);
  const errorMessage = useAuthStore((state) => state.errorMessage);
  const usersSynced = useAuthStore((state) => state.usersSynced);
  const usersLastSyncedAt = useAuthStore((state) => state.usersLastSyncedAt);
  const availableStores = useAuthStore((state) => state.availableStores);
  const appLastPreparedAt = useAuthStore((state) => state.appLastPreparedAt);
  const syncAppData = useAuthStore((state) => state.syncAppData);
  const logout = useAuthStore((state) => state.logout);

  const drawerWidth = Math.min(width * 0.75, 360);
  const sheetHeight = Math.min(Math.max(height * 0.7, 380), 560);
  const currentUserName = currentUserContext?.name ?? currentUser?.name ?? 'Usuario';
  const currentStore = useMemo(
    () =>
      currentStoreId != null
        ? availableStores.find((store) => store.id === currentStoreId) ?? null
        : null,
    [availableStores, currentStoreId],
  );
  const selectableStores = useMemo(
    () => getSelectableSyncStores(availableStores),
    [availableStores],
  );
  const { favorites, loading: favoritesLoading } = useHomeFavorites(currentUser?.id ?? null);

  useEffect(() => {
    Animated.timing(drawerAnimation, {
      toValue: drawerOpen ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [drawerAnimation, drawerOpen]);

  useEffect(() => {
    Animated.timing(menuAnimation, {
      toValue: menuOpen ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [menuAnimation, menuOpen]);

  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const handleNavigationItem = (item: HomeNavigationItem) => {
    if (drawerOpen) {
      closeDrawer();
      return;
    }

    closeMenu();
    navigateToItem(router, item);
  };

  const handleShortcutPress = (itemKey: string) => {
    const target = getHomeNavigationItemByKey(itemKey)?.item;
    if (!target) return;
    handleNavigationItem(target);
  };

  const openFavoritesEditor = () => {
    closeDrawer();
    closeMenu();
    router.push('/home-favorites');
  };

  const openSettings = () => {
    closeDrawer();
    closeMenu();
    router.push('/settings' as never);
  };

  const openSyncModal = () => {
    closeDrawer();
    closeMenu();

    if (sessionMode !== 'online' || connectivityStatus !== 'online') {
      Alert.alert(
        'Sincronizacao exige sessao online',
        'Entre novamente com internet disponivel para executar a sincronizacao global do app.',
      );
      return;
    }

    if (selectableStores.length === 0) {
      Alert.alert(
        'Sincronizacao indisponivel',
        'Nenhuma loja foi carregada para este usuario. Refaça o login online e tente novamente.',
      );
      return;
    }

    setPendingStoreId(currentStoreId ?? selectableStores[0]?.id ?? null);
    setSyncModalVisible(true);
  };

  const handleSync = async () => {
    if (!pendingStoreId) return;

    const synced = await syncAppData(pendingStoreId, 'sidebar_sync');
    if (synced) {
      setSyncModalVisible(false);
    }
  };

  const handleGroupSelect = (groupId: number) => {
    closeDrawer();
    closeMenu();

    if (groupId === 1) {
      router.replace('/home');
      return;
    }

    router.replace({
      pathname: '/home-group/[groupId]',
      params: { groupId: String(groupId) },
    });
  };

  return (
    <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.container}>
      <HomeHeader
        leading="menu"
        onLeadingPress={() => {
          closeMenu();
          setDrawerOpen((current) => !current);
        }}
        title="PdT Mobile"
      />

      <View style={styles.mainArea}>
        <View style={styles.favoritesRail}>
          <HomeFavoritesRail
            onAddPress={() => {
              openFavoritesEditor();
            }}
            loading={favoritesLoading}
            onShortcutPress={handleShortcutPress}
            shortcuts={favorites}
          />
        </View>

        <HomeBrandPanel />
      </View>

      <HomeBottomActions
        animation={menuAnimation}
        groups={homeNavigationGroups}
        onSelectGroup={handleGroupSelect}
        onToggle={() => {
          closeDrawer();
          setMenuOpen((current) => !current);
        }}
        open={menuOpen}
        selectedGroupId={1}
        sheetHeight={sheetHeight}
      />

      <HomeSidebar
        actions={[
          {
            key: 'config',
            label: 'Configuracoes',
            onPress: () => {
              openSettings();
            },
          },
          {
            key: 'sync',
            label: 'Sincronizar',
            icon: <AntDesign color={colors.text.muted} name="sync" size={30} />,
            onPress: () => {
              openSyncModal();
            },
          },
          {
            key: 'favorites',
            label: 'Editar Favoritos',
            icon: <AntDesign color={colors.text.muted} name="star" size={30} />,
            onPress: () => {
              openFavoritesEditor();
            },
          },
          {
            key: 'clear-data',
            label: 'Limpar Dados',
            icon: <AntDesign color={colors.text.muted} name="delete" size={30} />,
            onPress: () => {
              closeDrawer();
              closeMenu();
              router.push('/clear-data' as never);
            },
          },
          {
            key: 'logout',
            label: 'Sair',
            icon: <Feather color={colors.text.muted} name="log-out" size={26} />,
            onPress: () => {
              closeDrawer();
              closeMenu();
              void logout();
            },
            tone: 'warning',
          },
        ]}
        animation={drawerAnimation}
        codigoUsuarioVrMaster={currentUserContext?.codigoUsuarioVrMaster ?? null}
        connectivityStatus={connectivityStatus}
        currentStoreLabel={
          currentStore ? `${currentStore.id} - ${currentStore.description}` : 'Nao definida'
        }
        lastPreparedAt={usersSynced ? usersLastSyncedAt ?? appLastPreparedAt : appLastPreparedAt}
        onClose={closeDrawer}
        onSettingsPress={() => {
          openSettings();
        }}
        open={drawerOpen}
        sessionMode={sessionMode}
        userDisplayName={currentUserName}
        width={drawerWidth}
      />

      {isRefreshing ? (
        <View pointerEvents="none" style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.text.onAccent} size="small" />
            <Text style={styles.loadingLabel}>Atualizando dados mestres...</Text>
          </View>
        </View>
      ) : null}

      <StoreSelectorModal
        confirmLabel="Sincronizar"
        description="Escolha a loja que deve virar o contexto atual do app apos a sincronizacao."
        errorMessage={errorMessage}
        loading={isSyncingApp}
        progressScope={syncProgressScope}
        progressDetail={syncProgressDetail}
        progressLabel={syncProgressLabel}
        selectedStoreId={pendingStoreId}
        stores={selectableStores}
        title="Selecionar loja"
        visible={syncModalVisible}
        onClose={() => {
          setSyncModalVisible(false);
        }}
        onConfirm={() => {
          void handleSync();
        }}
        onSelectStore={setPendingStoreId}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.app,
  },
  mainArea: {
    flex: 1,
    backgroundColor: theme.colors.background.app,
    position: 'relative',
  },
  favoritesRail: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.overlay.soft,
    zIndex: 30,
  },
  loadingCard: {
    minWidth: 220,
    borderRadius: 16,
    backgroundColor: theme.colors.brand.primary,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingLabel: {
    color: theme.colors.text.onAccent,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
});
