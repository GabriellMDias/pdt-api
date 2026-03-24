import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useDeferredValue, useEffect, useRef, useState } from 'react';
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
import { flushPendingSyncOutbox } from '@/src/features/mobile-sync/services/mobile-sync-service';
import { OperationalFab } from '@/src/features/shared/operational-entry/components/operational-fab';
import {
  exportOperationalRoutineTxt,
} from '@/src/features/shared/operational-export/services/operational-txt-export.service';
import { TransmissionHeader } from '@/src/features/shared/operational-entry/components/transmission-header';
import {
  playOperationalErrorAsync,
  playOperationalSuccessAsync,
  warmupOperationalFeedbackAsync,
} from '@/src/features/shared/services/operational-feedback.service';
import {
  countLocalProducaoEntries,
  createLocalProducaoEntry,
  getLocalProducedCatalogProductBySelection,
  getProductionRecipesLastSyncedAt,
  listLocalProducaoEntries,
  listLocalProductionRecipeSelections,
  removeLocalProducaoEntry,
} from '@/src/features/producao/data/producao-db';
import { ProducaoListItem } from '@/src/features/producao/components/producao-list-item';
import { ProducaoRecipeModal } from '@/src/features/producao/components/producao-recipe-modal';
import type {
  LocalProducaoCatalogProduct,
  LocalProducaoEntry,
  LocalProductionRecipeSelection,
} from '@/src/features/producao/types';
import {
  normalizeManualNumberInput,
  parseInputNumber,
} from '@/src/features/shared/stock-movement/utils';
import { useQuantityDecimalRevalidation } from '@/src/features/shared/stock-movement/hooks/use-quantity-decimal-revalidation';
import { spacing, typography } from '@/src/theme/tokens';
import { useAppTheme, useThemedStyles, type AppTheme } from '@/src/theme/theme-provider';

const PAGE_SIZE = 80;

function deriveErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Nao foi possivel concluir a operacao.';
}

export function ProducaoScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const currentUser = useAuthStore((state) => state.currentUser);
  const currentStoreId = useAuthStore((state) => state.currentStoreId);
  const availableStores = useAuthStore((state) => state.availableStores);
  const connectivityStatus = useAuthStore((state) => state.connectivityStatus);
  const sessionMode = useAuthStore((state) => state.sessionMode);
  const autoTransmitEnabled = useAuthStore((state) => state.autoTransmitEnabled);

  const [entries, setEntries] = useState<LocalProducaoEntry[]>([]);
  const [recipeSelections, setRecipeSelections] = useState<LocalProductionRecipeSelection[]>([]);
  const [catalogLastSyncedAt, setCatalogLastSyncedAt] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isExportingEntries, setIsExportingEntries] = useState(false);
  const [isSyncingEntries, setIsSyncingEntries] = useState(false);
  const [recipeModalVisible, setRecipeModalVisible] = useState(false);
  const [recipeSelectAutoOpenToken, setRecipeSelectAutoOpenToken] = useState(0);
  const [selectedRecipeKey, setSelectedRecipeKey] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<LocalProducaoCatalogProduct | null>(null);
  const [quantityInput, setQuantityInput] = useState('');
  const [modalFeedbackMessage, setModalFeedbackMessage] = useState<string | null>(null);
  const [modalFeedbackTone, setModalFeedbackTone] = useState<
    'info' | 'success' | 'warning' | 'error'
  >('info');
  const [isSaving, setIsSaving] = useState(false);
  const reopenSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentOffsetRef = useRef(0);
  const hasMoreRef = useRef(true);
  const currentSearchRef = useRef('');

  const canPushEvents = sessionMode === 'online' && connectivityStatus === 'online';
  const currentStore =
    currentStoreId != null
      ? availableStores.find((store) => store.id === currentStoreId) ?? null
      : null;
  const selectedRecipe =
    selectedRecipeKey != null
      ? recipeSelections.find((selection) => selection.key === selectedRecipeKey) ?? null
      : null;

  const loadEntriesPage = useCallback(
    async (mode: 'reset' | 'append') => {
      if (!currentUser || !currentStoreId) {
        setEntries([]);
        setRecipeSelections([]);
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
        const [nextEntries, nextTotalCount, nextRecipeSelections, nextCatalogLastSyncedAt] =
          await Promise.all([
            listLocalProducaoEntries({
              userId: currentUser.id,
              storeId: currentStoreId,
              search: currentSearchRef.current,
              limit: PAGE_SIZE,
              offset,
            }),
            countLocalProducaoEntries({
              userId: currentUser.id,
              storeId: currentStoreId,
              search: currentSearchRef.current,
            }),
            mode === 'reset'
              ? listLocalProductionRecipeSelections(currentStoreId)
              : Promise.resolve<LocalProductionRecipeSelection[] | null>(null),
            mode === 'reset'
              ? getProductionRecipesLastSyncedAt(currentUser.id, currentStoreId)
              : Promise.resolve(null),
          ]);

        if (mode === 'reset') {
          setRecipeSelections(nextRecipeSelections ?? []);
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

  useEffect(() => {
    void warmupOperationalFeedbackAsync();

    return () => {
      if (reopenSearchTimeoutRef.current) {
        clearTimeout(reopenSearchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadProducedProduct() {
      if (!currentStoreId || !selectedRecipe) {
        setSelectedProduct(null);
        return;
      }

      const product = await getLocalProducedCatalogProductBySelection({
        storeId: currentStoreId,
        recipeId: selectedRecipe.recipeId,
        productId: selectedRecipe.productId,
      });

      if (!cancelled) {
        setSelectedProduct(product);
      }
    }

    void loadProducedProduct();

    return () => {
      cancelled = true;
    };
  }, [currentStoreId, selectedRecipe]);

  const handleInvalidQuantityForSelectedRecipe = useCallback((message: string) => {
    setModalFeedbackTone('warning');
    setModalFeedbackMessage(message);
  }, []);

  useQuantityDecimalRevalidation({
    enabled: selectedRecipe != null,
    allowDecimal: selectedRecipe?.decimalAllowed ?? false,
    quantityInput,
    setQuantityInput,
    onInvalid: handleInvalidQuantityForSelectedRecipe,
  });

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
        eventTypePrefix: 'production.',
        scope: 'production.push',
        triggerSource,
        batchLimit: 100,
      });

      await resetAndReloadEntries();

      if (result.eventCount === 0) {
        Alert.alert('Sem pendencias', 'Nao ha pendencias de producao para transmitir na loja atual.');
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
        routineKey: 'producao',
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

  function resetModalState() {
    if (reopenSearchTimeoutRef.current) {
      clearTimeout(reopenSearchTimeoutRef.current);
      reopenSearchTimeoutRef.current = null;
    }
    setSelectedRecipeKey(null);
    setSelectedProduct(null);
    setQuantityInput('');
    setModalFeedbackMessage(null);
    setModalFeedbackTone('info');
  }

  const scheduleRecipeSearchReopen = useCallback((delay = 110) => {
    if (reopenSearchTimeoutRef.current) {
      clearTimeout(reopenSearchTimeoutRef.current);
    }

    reopenSearchTimeoutRef.current = setTimeout(() => {
      setRecipeSelectAutoOpenToken((current) => current + 1);
      reopenSearchTimeoutRef.current = null;
    }, delay);
  }, []);

  function handleOpenRecipeModal() {
    if (!currentStoreId) {
      Alert.alert(
        'Loja atual nao definida',
        'Sincronize o app e escolha a loja atual na Home ou em Configuracoes antes de lancar producao.',
      );
      return;
    }

    if (recipeSelections.length === 0) {
      Alert.alert(
        'Receitas indisponiveis',
        'Nao ha receitas de producao sincronizadas para a loja atual.',
      );
      return;
    }

    resetModalState();
    setRecipeModalVisible(true);
    scheduleRecipeSearchReopen();
  }

  function handleCloseRecipeModal() {
    setRecipeModalVisible(false);
    resetModalState();
  }

  async function handleSaveProduction() {
    if (!currentUser || !currentStoreId || !selectedRecipe) {
      return;
    }

    const parsedQuantity = parseInputNumber(quantityInput);
    if (parsedQuantity <= 0) {
      setModalFeedbackTone('warning');
      setModalFeedbackMessage('Informe uma quantidade valida para salvar a producao.');
      await playOperationalErrorAsync();
      return;
    }

    const resolvedProduct =
      selectedProduct ??
      (await getLocalProducedCatalogProductBySelection({
        storeId: currentStoreId,
        recipeId: selectedRecipe.recipeId,
        productId: selectedRecipe.productId,
      }));

    if (!resolvedProduct) {
      setModalFeedbackTone('warning');
      setModalFeedbackMessage(
        'O produto produzido desta receita nao foi encontrado no catalogo local atual.',
      );
      await playOperationalErrorAsync();
      return;
    }

    if (isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      setModalFeedbackMessage(null);

      await createLocalProducaoEntry({
        userId: currentUser.id,
        storeId: currentStoreId,
        selection: selectedRecipe,
        product: resolvedProduct,
        quantityInput: parsedQuantity,
      });

      await playOperationalSuccessAsync();
      await resetAndReloadEntries();

      let nextTone: 'warning' = 'warning';
      let nextMessage: string | null = null;

      if (autoTransmitEnabled && canPushEvents) {
        try {
          const result = await flushPendingSyncOutbox({
            userId: currentUser.id,
            storeId: currentStoreId,
            eventTypePrefix: 'production.',
            scope: 'production.push',
            triggerSource: 'auto_after_create',
            batchLimit: 100,
          });

          await resetAndReloadEntries();

          if (result.temporaryErrors > 0 || result.permanentErrors > 0) {
            nextMessage = 'Alguns itens ainda seguem pendentes na outbox.';
          }
        } catch (error) {
          nextMessage = deriveErrorMessage(error);
        }
      }

      if (nextMessage) {
        setModalFeedbackTone(nextTone);
        setModalFeedbackMessage(nextMessage);
      } else {
        setModalFeedbackMessage(null);
      }
      setSelectedRecipeKey(null);
      setSelectedProduct(null);
      setQuantityInput('');
      scheduleRecipeSearchReopen();
    } catch (error) {
      setModalFeedbackTone('error');
      setModalFeedbackMessage(deriveErrorMessage(error));
      await playOperationalErrorAsync();
    } finally {
      setIsSaving(false);
    }
  }

  const handleRemoveEntry = useCallback((entry: LocalProducaoEntry) => {
    void (async () => {
      try {
        await removeLocalProducaoEntry(entry.eventId);
        await resetAndReloadEntries();
      } catch (error) {
        Alert.alert('Erro', deriveErrorMessage(error));
      }
    })();
  }, [resetAndReloadEntries]);

  const renderEntry = useCallback(
    ({ item }: { item: LocalProducaoEntry }) => (
      <View style={styles.listItemWrap}>
        <ProducaoListItem entry={item} onRemove={handleRemoveEntry} />
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
        label="Filtrar lancamentos"
        leftSlot={<MaterialIcons color={theme.colors.text.muted} name="search" size={18} />}
        placeholder="Codigo ou descricao do produto"
        returnKeyType="search"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <Text style={styles.searchSummary}>
        {searchQuery.trim()
          ? `Exibindo ${entries.length} de ${totalCount} lancamento(s) filtrados`
          : `Exibindo ${entries.length} de ${totalCount} lancamento(s)`}
      </Text>
    </View>
  );

  return (
    <>
      <FeatureScreenLayout
        contentContainerStyle={styles.body}
        onBackPress={() => router.back()}
        padded={false}
        title="Producao"
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
                      ? 'Nenhum lancamento encontrado'
                      : 'Nenhum lancamento de producao'
                    : 'Selecione a loja na sincronizacao'}
                </Text>
                <Text style={styles.emptyText}>
                  {currentStore
                    ? searchQuery.trim()
                      ? 'Nenhum lancamento corresponde ao filtro informado.'
                      : 'Use o botao + para selecionar a receita e informar a quantidade produzida.'
                    : 'A producao usa a loja atual do app. Sincronize pela Home ou pelas Configuracoes para definir a loja.'}
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

        <OperationalFab onPress={handleOpenRecipeModal} />
      </FeatureScreenLayout>

      <ProducaoRecipeModal
        feedbackMessage={modalFeedbackMessage}
        feedbackTone={modalFeedbackTone}
        quantityInput={quantityInput}
        recipeSelections={recipeSelections}
        saving={isSaving}
        selectedRecipeKey={selectedRecipeKey}
        selectedRecipeAllowsDecimal={selectedRecipe?.decimalAllowed ?? false}
        selectAutoOpenToken={recipeSelectAutoOpenToken}
        visible={recipeModalVisible}
        onChangeQuantity={(value) => {
          setQuantityInput(
            normalizeManualNumberInput(value, selectedRecipe?.decimalAllowed ?? false),
          );
          setModalFeedbackMessage(null);
        }}
        onClose={handleCloseRecipeModal}
        onConfirm={() => {
          void handleSaveProduction();
        }}
        onSelectRecipe={(selectionKey) => {
          setSelectedRecipeKey(selectionKey);
          setSelectedProduct(null);
          setModalFeedbackMessage(null);
        }}
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
