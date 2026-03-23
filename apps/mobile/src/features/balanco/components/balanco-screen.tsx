import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { type Href, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuthStore } from '@/src/features/auth/store/use-auth-store';
import { FeatureScreenLayout } from '@/src/features/shared/components/feature-screen-layout';
import { OperationalFab } from '@/src/features/shared/operational-entry/components/operational-fab';
import { TransmissionHeader } from '@/src/features/shared/operational-entry/components/transmission-header';
import { flushPendingSyncOutbox } from '@/src/features/mobile-sync/services/mobile-sync-service';
import {
  getBalanceCatalogLastSyncedAt,
  listLocalBalancoGroups,
  listLocalOpenBalanceHeaders,
  removeLocalBalancoEntriesByBalance,
} from '@/src/features/balanco/data/balanco-db';
import { BalancoGroupListItem } from '@/src/features/balanco/components/balanco-group-list-item';
import { BalancoSelectorModal } from '@/src/features/balanco/components/balanco-selector-modal';
import type { LocalBalancoGroup, LocalBalanceHeader } from '@/src/features/balanco/types';
import { useAppTheme, useThemedStyles, type AppTheme } from '@/src/theme/theme-provider';

function deriveErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Nao foi possivel concluir a operacao.';
}

async function loadBalancoSnapshot(userId: number, storeId: number) {
  const [groups, openBalances, catalogLastSyncedAt] = await Promise.all([
    listLocalBalancoGroups({ userId, storeId }),
    listLocalOpenBalanceHeaders(storeId),
    getBalanceCatalogLastSyncedAt(userId, storeId),
  ]);

  return {
    groups,
    openBalances,
    catalogLastSyncedAt,
  };
}

export function BalancoScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const currentUser = useAuthStore((state) => state.currentUser);
  const currentStoreId = useAuthStore((state) => state.currentStoreId);
  const availableStores = useAuthStore((state) => state.availableStores);
  const connectivityStatus = useAuthStore((state) => state.connectivityStatus);
  const sessionMode = useAuthStore((state) => state.sessionMode);

  const [groups, setGroups] = useState<LocalBalancoGroup[]>([]);
  const [openBalances, setOpenBalances] = useState<LocalBalanceHeader[]>([]);
  const [catalogLastSyncedAt, setCatalogLastSyncedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncingEntries, setIsSyncingEntries] = useState(false);
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [selectedBalanceId, setSelectedBalanceId] = useState<number | null>(null);

  const canPushEvents = sessionMode === 'online' && connectivityStatus === 'online';
  const currentStore =
    currentStoreId != null
      ? availableStores.find((store) => store.id === currentStoreId) ?? null
      : null;

  const selectedBalance = useMemo(
    () => openBalances.find((balance) => balance.id === selectedBalanceId) ?? null,
    [openBalances, selectedBalanceId],
  );

  const refreshSnapshot = useCallback(async () => {
    if (!currentUser || !currentStoreId) {
      setGroups([]);
      setOpenBalances([]);
      setCatalogLastSyncedAt(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const snapshot = await loadBalancoSnapshot(currentUser.id, currentStoreId);
      setGroups(snapshot.groups);
      setOpenBalances(snapshot.openBalances);
      setCatalogLastSyncedAt(snapshot.catalogLastSyncedAt);
      setSelectedBalanceId((current) =>
        current != null && snapshot.openBalances.some((balance) => balance.id === current)
          ? current
          : snapshot.openBalances[0]?.id ?? null,
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentStoreId, currentUser]);

  useFocusEffect(
    useCallback(() => {
      void refreshSnapshot();
    }, [refreshSnapshot]),
  );

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
        eventTypePrefix: 'balance.',
        scope: 'balance.push',
        triggerSource,
        batchLimit: 100,
      });

      await refreshSnapshot();

      if (result.eventCount === 0) {
        Alert.alert(
          'Sem pendencias',
          'Nao ha pendencias de balanco para transmitir na loja atual.',
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
      await refreshSnapshot();
    } finally {
      setIsSyncingEntries(false);
    }
  }

  function handleOpenSelector() {
    if (!currentStoreId) {
      Alert.alert(
        'Loja atual nao definida',
        'Sincronize o app e escolha a loja atual na Home ou em Configuracoes antes de coletar balanco.',
      );
      return;
    }

    if (openBalances.length === 0) {
      Alert.alert(
        'Balancos indisponiveis',
        'Nao ha balancos em aberto sincronizados para a loja atual.',
      );
      return;
    }

    setSelectedBalanceId((current) => current ?? openBalances[0]?.id ?? null);
    setSelectorVisible(true);
  }

  function handleConfirmBalance() {
    if (!currentStoreId || !selectedBalance) {
      Alert.alert('Balanco obrigatorio', 'Selecione um balanco em aberto para continuar.');
      return;
    }

    setSelectorVisible(false);
    router.push({
      pathname: '/balanco-collect' as Href,
      params: {
        storeId: String(currentStoreId),
        balanceId: String(selectedBalance.id),
      },
    } as Href);
  }

  function handleOpenGroup(group: LocalBalancoGroup) {
    router.push({
      pathname: '/balanco-items' as Href,
      params: {
        storeId: String(group.storeId),
        balanceId: String(group.balanceId),
        balanceDescription: group.balanceDescription,
        stockLabel: group.stockLabel,
        statusCode: group.statusCode != null ? String(group.statusCode) : '',
      },
    } as Href);
  }

  function handleRemoveGroup(group: LocalBalancoGroup) {
    Alert.alert(
      'Excluir lancamentos locais',
      `Deseja remover todos os lancamentos locais do balanco ${group.balanceId}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                if (!currentUser) {
                  return;
                }
                await removeLocalBalancoEntriesByBalance({
                  userId: currentUser.id,
                  storeId: group.storeId,
                  balanceId: group.balanceId,
                });
                await refreshSnapshot();
              } catch (error) {
                Alert.alert('Erro', deriveErrorMessage(error));
              }
            })();
          },
        },
      ],
    );
  }

  const listHeader = (
    <TransmissionHeader
      currentStoreLabel={
        currentStore
          ? `Loja atual: ${currentStore.id} - ${currentStore.description}`
          : 'Loja atual: nenhuma loja sincronizada'
      }
      lastSyncedAt={catalogLastSyncedAt}
      transmitButtonLoading={isSyncingEntries}
      onTransmit={() => {
        void handleTransmit('manual');
      }}
    />
  );

  return (
    <>
      <FeatureScreenLayout
        contentContainerStyle={styles.body}
        onBackPress={() => router.back()}
        padded={false}
        title="Balanco"
      >
        <FlatList
          contentContainerStyle={styles.listContent}
          data={groups}
          keyExtractor={(item) => `${item.storeId}:${item.balanceId}`}
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator color={theme.colors.brand.primaryStrong} size="large" />
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>
                  {currentStore ? 'Nenhum balanco coletado' : 'Selecione a loja na sincronizacao'}
                </Text>
                <Text style={styles.emptyText}>
                  {currentStore
                    ? 'Use o botao + para escolher um balanco em aberto e iniciar a coleta.'
                    : 'O balanco usa a loja atual do app. Sincronize pela Home ou pelas Configuracoes para definir a loja.'}
                </Text>
              </View>
            )
          }
          ListHeaderComponent={listHeader}
          renderItem={({ item }) => (
            <View style={styles.listItemWrap}>
              <BalancoGroupListItem
                group={item}
                onPress={handleOpenGroup}
                onRemove={handleRemoveGroup}
              />
            </View>
          )}
        />

        <OperationalFab onPress={handleOpenSelector} />
      </FeatureScreenLayout>

      <BalancoSelectorModal
        balances={openBalances}
        selectedBalanceId={selectedBalanceId}
        visible={selectorVisible}
        onChange={setSelectedBalanceId}
        onClose={() => {
          setSelectorVisible(false);
        }}
        onConfirm={handleConfirmBalance}
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
      paddingBottom: 112,
    },
    listItemWrap: {
      marginBottom: 14,
    },
    emptyState: {
      minHeight: 260,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
      gap: 8,
    },
    emptyTitle: {
      color: theme.colors.text.primary,
      fontSize: 18,
      lineHeight: 22,
      fontWeight: '700',
      textAlign: 'center',
    },
    emptyText: {
      color: theme.colors.text.secondary,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      maxWidth: 320,
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
