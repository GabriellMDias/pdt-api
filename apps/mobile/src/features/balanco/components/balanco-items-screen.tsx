import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
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
import { OperationalFab } from '@/src/features/shared/operational-entry/components/operational-fab';
import {
  exportOperationalRoutineTxt,
} from '@/src/features/shared/operational-export/services/operational-txt-export.service';
import { TransmissionHeader } from '@/src/features/shared/operational-entry/components/transmission-header';
import { flushPendingSyncOutbox } from '@/src/features/mobile-sync/services/mobile-sync-service';
import {
  countLocalBalancoEntriesByBalance,
  getBalanceCatalogLastSyncedAt,
  getLocalBalanceHeaderById,
  listLocalBalancoEntriesByBalance,
  removeLocalBalancoEntry,
} from '@/src/features/balanco/data/balanco-db';
import { BalancoEntryListItem } from '@/src/features/balanco/components/balanco-entry-list-item';
import type { LocalBalanceHeader, LocalBalancoEntry } from '@/src/features/balanco/types';
import {
  buildBalanceAggregateKeyPrefix,
  isOpenBalanceStatus,
  parsePositiveInt,
  parseSingleParam,
} from '@/src/features/balanco/utils';
import { useAppTheme, useThemedStyles, type AppTheme } from '@/src/theme/theme-provider';
import { spacing, typography } from '@/src/theme/tokens';

const PAGE_SIZE = 80;

function deriveErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Nao foi possivel concluir a operacao.';
}

export function BalancoItemsScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<{
    balanceId?: string | string[];
    storeId?: string | string[];
    balanceDescription?: string | string[];
    stockLabel?: string | string[];
    statusCode?: string | string[];
  }>();
  const currentUser = useAuthStore((state) => state.currentUser);
  const currentStoreId = useAuthStore((state) => state.currentStoreId);
  const availableStores = useAuthStore((state) => state.availableStores);
  const connectivityStatus = useAuthStore((state) => state.connectivityStatus);
  const sessionMode = useAuthStore((state) => state.sessionMode);

  const balanceId = parsePositiveInt(params.balanceId);
  const storeId = parsePositiveInt(params.storeId) ?? currentStoreId;
  const fallbackBalanceDescription = parseSingleParam(params.balanceDescription);
  const fallbackStockLabel = parseSingleParam(params.stockLabel);
  const rawStatusCode = parseSingleParam(params.statusCode);
  const fallbackStatusCode = rawStatusCode ? Number(rawStatusCode) : null;

  const [balanceHeader, setBalanceHeader] = useState<LocalBalanceHeader | null>(null);
  const [entries, setEntries] = useState<LocalBalancoEntry[]>([]);
  const [catalogLastSyncedAt, setCatalogLastSyncedAt] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isExportingEntries, setIsExportingEntries] = useState(false);
  const [isSyncingEntries, setIsSyncingEntries] = useState(false);
  const currentOffsetRef = useRef(0);
  const hasMoreRef = useRef(true);
  const currentSearchRef = useRef('');

  const canPushEvents = sessionMode === 'online' && connectivityStatus === 'online';
  const currentStore =
    storeId != null ? availableStores.find((store) => store.id === storeId) ?? null : null;

  const effectiveBalanceHeader = useMemo(() => {
    if (balanceHeader) {
      return balanceHeader;
    }

    if (!balanceId || !storeId) {
      return null;
    }

    return {
      id: balanceId,
      storeId,
      description: fallbackBalanceDescription || `Balanco ${balanceId}`,
      stockLabel: fallbackStockLabel || '-',
      statusCode: Number.isFinite(fallbackStatusCode ?? Number.NaN) ? fallbackStatusCode ?? 0 : 0,
      syncedAt: '',
      updatedAt: '',
    };
  }, [balanceHeader, balanceId, fallbackBalanceDescription, fallbackStatusCode, fallbackStockLabel, storeId]);

  const isBalanceOpen = isOpenBalanceStatus(effectiveBalanceHeader?.statusCode);

  const loadEntriesPage = useCallback(
    async (mode: 'reset' | 'append') => {
      if (!currentUser || !storeId || !balanceId) {
        setEntries([]);
        setTotalCount(0);
        setCatalogLastSyncedAt(null);
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
        const [header, lastSyncedAt, nextEntries, nextTotalCount] = await Promise.all([
          getLocalBalanceHeaderById({ balanceId, storeId }),
          getBalanceCatalogLastSyncedAt(currentUser.id, storeId),
          listLocalBalancoEntriesByBalance({
            userId: currentUser.id,
            storeId,
            balanceId,
            search: currentSearchRef.current,
            limit: PAGE_SIZE,
            offset,
          }),
          countLocalBalancoEntriesByBalance({
            userId: currentUser.id,
            storeId,
            balanceId,
            search: currentSearchRef.current,
          }),
        ]);

        setBalanceHeader(header);
        setCatalogLastSyncedAt(lastSyncedAt);
        setTotalCount(nextTotalCount);
        currentOffsetRef.current = offset + nextEntries.length;
        hasMoreRef.current = currentOffsetRef.current < nextTotalCount;
        setEntries((current) => (mode === 'reset' ? nextEntries : [...current, ...nextEntries]));
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [balanceId, currentUser, storeId],
  );

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
    if (!currentUser || !storeId || !balanceId) return;

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
        storeId,
        eventTypePrefix: 'balance.',
        aggregateKeyPrefix: buildBalanceAggregateKeyPrefix(balanceId),
        scope: 'balance.push',
        triggerSource,
        batchLimit: 100,
      });

      currentOffsetRef.current = 0;
      hasMoreRef.current = true;
      await loadEntriesPage('reset');

      if (result.eventCount === 0) {
        Alert.alert('Sem pendencias', 'Nao ha pendencias deste balanco para transmitir.');
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
      currentOffsetRef.current = 0;
      hasMoreRef.current = true;
      await loadEntriesPage('reset');
    } finally {
      setIsSyncingEntries(false);
    }
  }

  async function handleExport() {
    if (!currentUser || !storeId || !balanceId) {
      Alert.alert('Exportacao indisponivel', 'Nao foi possivel identificar o balanco atual.');
      return;
    }

    try {
      setIsExportingEntries(true);
      const result = await exportOperationalRoutineTxt({
        routineKey: 'balanco',
        userId: currentUser.id,
        storeId,
        balanceId,
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

  function handleRemoveEntry(entry: LocalBalancoEntry) {
    Alert.alert(
      'Excluir lancamento',
      `Deseja remover o lancamento do produto ${entry.productId}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await removeLocalBalancoEntry(entry.eventId);
                currentOffsetRef.current = 0;
                hasMoreRef.current = true;
                await loadEntriesPage('reset');
              } catch (error) {
                Alert.alert('Erro', deriveErrorMessage(error));
              }
            })();
          },
        },
      ],
    );
  }

  if (!currentUser || !storeId || !balanceId) {
    return (
      <FeatureScreenLayout
        contentContainerStyle={styles.body}
        onBackPress={() => router.back()}
        padded={false}
        title="Balanco"
      >
        <View style={styles.invalidState}>
          <Text style={styles.invalidTitle}>Nao foi possivel abrir o balanco.</Text>
          <Text style={styles.invalidText}>
            Verifique se a loja atual e o numero do balanco estao definidos.
          </Text>
        </View>
      </FeatureScreenLayout>
    );
  }

  const listHeader = (
    <View style={styles.headerWrap}>
      <TransmissionHeader
        currentStoreLabel={
          effectiveBalanceHeader
            ? `Balanco ${effectiveBalanceHeader.id} - ${effectiveBalanceHeader.description}`
            : currentStore
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
          void handleTransmit('manual_balance_items');
        }}
      />

      <Input
        autoCapitalize="characters"
        autoCorrect={false}
        containerStyle={styles.searchField}
        label="Filtrar itens"
        leftSlot={<FontAwesome color={theme.colors.text.muted} name="search" size={16} />}
        placeholder="Codigo, descricao ou EAN"
        returnKeyType="search"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <Text style={styles.searchSummary}>
        {searchQuery.trim()
          ? `Exibindo ${entries.length} de ${totalCount} item(ns) filtrados`
          : `Exibindo ${entries.length} de ${totalCount} item(ns)`}
      </Text>
    </View>
  );

  return (
    <>
      <FeatureScreenLayout
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        onBackPress={() => router.back()}
        padded={false}
        title="Balanco"
      >
        <FlatList
          contentContainerStyle={styles.listContent}
          data={entries}
          initialNumToRender={18}
          keyExtractor={(item) => item.eventId}
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator color={theme.colors.brand.primaryStrong} size="large" />
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Nenhum item encontrado</Text>
                <Text style={styles.emptyText}>
                  {searchQuery.trim()
                    ? 'Nenhum item deste balanco corresponde ao filtro informado.'
                    : 'Use o botao + para iniciar a coleta de produtos deste balanco.'}
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
          renderItem={({ item }) => (
            <View style={styles.listItemWrap}>
              <BalancoEntryListItem entry={item} onRemove={handleRemoveEntry} />
            </View>
          )}
          windowSize={10}
        />

        {isBalanceOpen ? (
          <OperationalFab
            onPress={() => {
              router.push({
                pathname: '/balanco-collect' as Href,
                params: {
                  storeId: String(storeId),
                  balanceId: String(balanceId),
                },
              } as Href);
            }}
          />
        ) : null}
      </FeatureScreenLayout>

      <Modal animationType="fade" transparent visible={isSyncingEntries}>
        <View style={styles.modalOverlay}>
          <View style={styles.progressCard}>
            <MaterialIcons color={theme.colors.brand.primaryStrong} name="phonelink-ring" size={50} />
            <Text style={styles.progressTitle}>Transmitindo...</Text>
            <Text style={styles.progressText}>Transmitindo itens deste balanco, aguarde!</Text>
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
      paddingBottom: 112,
    },
    headerWrap: {
      marginBottom: spacing.md,
      gap: spacing.md,
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
      minHeight: 240,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.lg,
    },
    emptyTitle: {
      ...typography.textStyles.title,
      color: theme.colors.text.primary,
      textAlign: 'center',
    },
    emptyText: {
      ...typography.textStyles.body,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      maxWidth: 320,
    },
    footerLoader: {
      paddingVertical: spacing.md,
    },
    invalidState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
      gap: spacing.xs,
    },
    invalidTitle: {
      ...typography.textStyles.title,
      color: theme.colors.text.primary,
      textAlign: 'center',
    },
    invalidText: {
      ...typography.textStyles.body,
      color: theme.colors.text.secondary,
      textAlign: 'center',
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.overlay.strong,
      paddingHorizontal: 24,
    },
    progressCard: {
      width: '100%',
      maxWidth: 320,
      backgroundColor: theme.colors.background.surfaceAlt,
      borderRadius: 24,
      paddingHorizontal: 24,
      paddingVertical: 28,
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: theme.colors.border.default,
    },
    progressTitle: {
      color: theme.colors.text.primary,
      fontSize: 20,
      lineHeight: 24,
      fontWeight: '700',
    },
    progressText: {
      color: theme.colors.text.secondary,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    },
  });
