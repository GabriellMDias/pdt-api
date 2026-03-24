import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useDeferredValue, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Input } from '@/src/components/ui';
import { useAuthStore } from '@/src/features/auth/store/use-auth-store';
import { FeatureScreenLayout } from '@/src/features/shared/components/feature-screen-layout';
import {
  exportOperationalRoutineTxt,
} from '@/src/features/shared/operational-export/services/operational-txt-export.service';
import { flushPendingSyncOutbox } from '@/src/features/mobile-sync/services/mobile-sync-service';
import {
  countLocalRuptureEntries,
  getRuptureCatalogLastSyncedAt,
  listLocalRuptureEntries,
  removeLocalRuptureEntry,
} from '@/src/features/rupture/data/rupture-db';
import { RuptureFab } from '@/src/features/rupture/components/rupture-fab';
import { RuptureListItem } from '@/src/features/rupture/components/rupture-list-item';
import { RuptureShelfModal } from '@/src/features/rupture/components/rupture-shelf-modal';
import { TransmissionHeader } from '@/src/features/shared/operational-entry/components/transmission-header';
import type { LocalRuptureEntry } from '@/src/features/rupture/types';
import { spacing, typography } from '@/src/theme/tokens';
import { useAppTheme, useThemedStyles, type AppTheme } from '@/src/theme/theme-provider';

const PAGE_SIZE = 80;

function deriveErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Nao foi possivel concluir a operacao.';
}

export function RuptureScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const currentUser = useAuthStore((state) => state.currentUser);
  const currentStoreId = useAuthStore((state) => state.currentStoreId);
  const availableStores = useAuthStore((state) => state.availableStores);
  const connectivityStatus = useAuthStore((state) => state.connectivityStatus);
  const sessionMode = useAuthStore((state) => state.sessionMode);

  const [entries, setEntries] = useState<LocalRuptureEntry[]>([]);
  const [catalogLastSyncedAt, setCatalogLastSyncedAt] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isExportingEntries, setIsExportingEntries] = useState(false);
  const [isSyncingEntries, setIsSyncingEntries] = useState(false);
  const [shelfModalVisible, setShelfModalVisible] = useState(false);
  const [shelfCode, setShelfCode] = useState('');
  const currentOffsetRef = useRef(0);
  const hasMoreRef = useRef(true);
  const currentSearchRef = useRef('');

  const canPushEvents = sessionMode === 'online' && connectivityStatus === 'online';
  const currentStore =
    currentStoreId != null
      ? availableStores.find((store) => store.id === currentStoreId) ?? null
      : null;

  const loadEntriesPage = useCallback(
    async (mode: 'reset' | 'append') => {
      if (!currentUser || !currentStoreId) {
        setEntries([]);
        setCatalogLastSyncedAt(null);
        setTotalCount(0);
        setIsLoading(false);
        setIsLoadingMore(false);
        return;
      }

      const offset = mode === 'reset' ? 0 : currentOffsetRef.current;
      if (mode === 'append' && !hasMoreRef.current) {
        return;
      }

      if (mode === 'reset') {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const [nextEntries, nextTotalCount, nextCatalogLastSyncedAt] = await Promise.all([
          listLocalRuptureEntries({
            userId: currentUser.id,
            storeId: currentStoreId,
            search: currentSearchRef.current,
            limit: PAGE_SIZE,
            offset,
          }),
          countLocalRuptureEntries({
            userId: currentUser.id,
            storeId: currentStoreId,
            search: currentSearchRef.current,
          }),
          mode === 'reset'
            ? getRuptureCatalogLastSyncedAt(currentUser.id, currentStoreId)
            : Promise.resolve(null),
        ]);

        if (mode === 'reset') {
          setCatalogLastSyncedAt(nextCatalogLastSyncedAt);
        }

        setTotalCount(nextTotalCount);
        currentOffsetRef.current = offset + nextEntries.length;
        hasMoreRef.current = currentOffsetRef.current < nextTotalCount;
        setEntries((current) => (mode === 'reset' ? nextEntries : [...current, ...nextEntries]));
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [currentStoreId, currentUser],
  );

  const resetAndReloadEntries = useCallback(async () => {
    currentOffsetRef.current = 0;
    hasMoreRef.current = true;
    await loadEntriesPage('reset');
  }, [loadEntriesPage]);

  useFocusEffect(
    useCallback(() => {
      currentSearchRef.current = deferredSearch.trim();
      currentOffsetRef.current = 0;
      hasMoreRef.current = true;
      void loadEntriesPage('reset');
    }, [deferredSearch, loadEntriesPage]),
  );

  const handleLoadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMoreRef.current) {
      return;
    }

    void loadEntriesPage('append');
  }, [isLoading, isLoadingMore, loadEntriesPage]);

  async function handleTransmit(triggerSource: string) {
    if (!currentUser || !currentStoreId) return;

    if (!canPushEvents) {
      Alert.alert(
        'Transmissao indisponivel',
        'Erro ao comunicar com o servidor. Verifique a internet e tente novamente.',
      );
      return;
    }

    try {
      setIsSyncingEntries(true);

      const result = await flushPendingSyncOutbox({
        userId: currentUser.id,
        storeId: currentStoreId,
        eventTypePrefix: 'rupture.',
        scope: 'rupture.push',
        triggerSource,
        batchLimit: 100,
      });

      await resetAndReloadEntries();

      if (result.eventCount === 0) {
        Alert.alert(
          'Sem pendencias',
          'Nao ha pendencias de ruptura para transmitir na loja atual.',
        );
        return;
      }

      if (result.temporaryErrors > 0 || result.permanentErrors > 0) {
        Alert.alert(
          'Transmissao concluida com pendencias',
          `Processados: ${result.processed}. Conciliados: ${result.duplicates}. Temporarios: ${result.temporaryErrors}. Permanentes: ${result.permanentErrors}.`,
        );
      }
    } catch (error) {
      Alert.alert('Erro', deriveErrorMessage(error));
      await resetAndReloadEntries();
    } finally {
      setIsSyncingEntries(false);
    }
  }

  async function handleExport() {
    if (!currentUser || !currentStoreId) {
      Alert.alert('Exportacao indisponivel', 'Selecione a loja atual antes de exportar o TXT.');
      return;
    }

    try {
      setIsExportingEntries(true);
      const result = await exportOperationalRoutineTxt({
        routineKey: 'rupture',
        userId: currentUser.id,
        storeId: currentStoreId,
      });

      Alert.alert(
        'TXT exportado',
        `${result.recordCount} registro(s) exportado(s) em ${result.fileName}.`,
      );
    } catch (error) {
      Alert.alert('Erro', deriveErrorMessage(error));
    } finally {
      setIsExportingEntries(false);
    }
  }

  function handleOpenShelfModal() {
    if (!currentStoreId) {
      Alert.alert(
        'Loja atual nao definida',
        'Sincronize o app e escolha a loja atual na Home ou em Configuracoes antes de coletar ruptura.',
      );
      return;
    }

    setShelfCode('');
    setShelfModalVisible(true);
  }

  function handleConfirmShelf() {
    const trimmedShelfCode = shelfCode.trim();
    if (!trimmedShelfCode || !currentStoreId) {
      Alert.alert('Prateleira obrigatoria', 'Informe a prateleira antes de iniciar a coleta.');
      return;
    }

    setShelfModalVisible(false);
    setShelfCode('');
    router.push({
      pathname: '/rupture-collect',
      params: {
        shelfCode: trimmedShelfCode,
        storeId: String(currentStoreId),
      },
    });
  }

  const handleRemoveEntry = useCallback((entry: LocalRuptureEntry) => {
    void (async () => {
      try {
        await removeLocalRuptureEntry(entry.eventId);
        await resetAndReloadEntries();
      } catch (error) {
        Alert.alert('Erro', deriveErrorMessage(error));
      }
    })();
  }, [resetAndReloadEntries]);

  const renderEntry = useCallback(
    ({ item }: { item: LocalRuptureEntry }) => (
      <View style={styles.listItemWrap}>
        <RuptureListItem entry={item} onRemove={handleRemoveEntry} />
      </View>
    ),
    [handleRemoveEntry, styles.listItemWrap],
  );

  const listHeader = (
    <View style={styles.headerWrap}>
      <TransmissionHeader
        currentStoreLabel={
          currentStore
            ? `Loja atual: ${currentStore.id} - ${currentStore.description}`
            : 'Loja atual: nenhuma loja sincronizada'
        }
        exportButtonDisabled={isLoading || isExportingEntries || totalCount === 0}
        exportButtonLoading={isExportingEntries}
        lastSyncedAt={catalogLastSyncedAt}
        onExport={() => {
          void handleExport();
        }}
        transmitButtonLoading={isSyncingEntries}
        onTransmit={() => {
          void handleTransmit('manual');
        }}
      />

      <Input
        autoCapitalize="characters"
        autoCorrect={false}
        containerStyle={styles.searchField}
        label="Filtrar coletas"
        leftSlot={<FontAwesome color={theme.colors.text.muted} name="search" size={16} />}
        placeholder="Codigo, descricao, EAN ou prateleira"
        returnKeyType="search"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <Text style={styles.searchSummary}>
        {searchQuery.trim()
          ? `Exibindo ${entries.length} de ${totalCount} coleta(s) filtradas`
          : `Exibindo ${entries.length} de ${totalCount} coleta(s)`}
      </Text>
    </View>
  );

  return (
    <>
      <FeatureScreenLayout
        contentContainerStyle={styles.body}
        onBackPress={() => router.back()}
        padded={false}
        title="Ruptura"
      >
        <FlatList
          contentContainerStyle={styles.listContent}
          data={entries}
          initialNumToRender={18}
          keyExtractor={(item) => item.eventId}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator color={theme.colors.brand.primaryStrong} size="large" />
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>
                  {currentStore
                    ? searchQuery.trim()
                      ? 'Nenhuma coleta encontrada'
                      : 'Nenhuma coleta de ruptura'
                    : 'Selecione a loja na sincronizacao'}
                </Text>
                <Text style={styles.emptyText}>
                  {currentStore
                    ? searchQuery.trim()
                      ? 'Nenhuma coleta corresponde ao filtro informado.'
                      : 'Use o botao + para informar a prateleira e iniciar a coleta de produtos.'
                    : 'A ruptura usa a loja atual do app. Sincronize pela Home ou pelas Configuracoes para definir a loja.'}
                </Text>
              </View>
            )
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color={theme.colors.brand.primaryStrong} size="small" />
              </View>
            ) : null
          }
          ListHeaderComponent={listHeader}
          maxToRenderPerBatch={24}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.45}
          removeClippedSubviews
          renderItem={renderEntry}
          windowSize={10}
        />

        <RuptureFab onPress={handleOpenShelfModal} />
      </FeatureScreenLayout>

      <RuptureShelfModal
        visible={shelfModalVisible}
        shelfCode={shelfCode}
        onChangeShelfCode={setShelfCode}
        onClose={() => {
          setShelfModalVisible(false);
        }}
        onConfirm={handleConfirmShelf}
      />

      <Modal animationType="fade" transparent visible={isSyncingEntries}>
        <View style={styles.modalOverlay}>
          <View style={styles.progressCard}>
            <MaterialIcons color={theme.colors.brand.primaryStrong} name="phonelink-ring" size={50} />
            <Text style={styles.progressTitle}>Transmitindo...</Text>
            <Text style={styles.progressText}>Transmitindo dados, aguarde!</Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    body: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingTop: 18,
      paddingBottom: 124,
    },
    headerWrap: {
      marginBottom: spacing.md,
      gap: spacing.sm,
    },
    searchField: {
      marginTop: spacing.xs,
    },
    searchSummary: {
      ...typography.textStyles.caption,
      color: theme.colors.text.muted,
    },
    listItemWrap: {
      marginBottom: 12,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 240,
      paddingHorizontal: spacing.lg,
      gap: spacing.xs,
    },
    emptyTitle: {
      color: theme.colors.text.primary,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '700',
      textAlign: 'center',
    },
    emptyText: {
      color: theme.colors.text.muted,
      fontSize: 13,
      lineHeight: 18,
      textAlign: 'center',
      maxWidth: 300,
    },
    footerLoader: {
      paddingVertical: spacing.md,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay.strong,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 25,
    },
    progressCard: {
      width: '100%',
      maxWidth: 320,
      backgroundColor: theme.colors.background.surface,
      borderRadius: 20,
      padding: 35,
      alignItems: 'center',
    },
    progressTitle: {
      marginTop: 8,
      marginBottom: 5,
      textAlign: 'center',
      fontWeight: '700',
      fontSize: 20,
      color: theme.colors.text.primary,
    },
    progressText: {
      color: theme.colors.text.secondary,
      marginBottom: 5,
      textAlign: 'center',
    },
  });
