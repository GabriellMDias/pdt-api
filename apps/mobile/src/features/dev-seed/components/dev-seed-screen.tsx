import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Button, Card, Select, type SelectOption } from '@/src/components/ui';
import { useAuthStore } from '@/src/features/auth/store/use-auth-store';
import {
  DEV_LOCAL_SEED_ENABLED,
  devSeedRoutineDefinitions,
  devSeedVolumeOptions,
} from '@/src/features/dev-seed/config';
import {
  getAllDevPerformanceCounts,
  transmitDevPerformanceRoutine,
} from '@/src/features/dev-seed/services/dev-performance.service';
import {
  clearAllLocalDevSeed,
  clearLocalDevSeed,
  generateAllLocalDevSeed,
  generateLocalDevSeed,
} from '@/src/features/dev-seed/services/dev-seed.service';
import type {
  DevPerformanceRoutineCounts,
  DevPerformanceTransmitResult,
  DevSeedBatchSummary,
  DevSeedCleanupResult,
  DevSeedRoutineKey,
  DevSeedRoutineResult,
  DevSeedVolume,
} from '@/src/features/dev-seed/types';
import { FeatureScreenLayout } from '@/src/features/shared/components/feature-screen-layout';
import { spacing, typography } from '@/src/theme/tokens';
import {
  useAppTheme,
  useThemedStyles,
  type AppTheme,
} from '@/src/theme/theme-provider';

type ActionLogTone = 'info' | 'success' | 'error';

type ActionLogEntry = {
  id: string;
  title: string;
  detail: string;
  durationMs: number | null;
  timestamp: string;
  tone: ActionLogTone;
};

const routineLabelByKey = Object.fromEntries(
  devSeedRoutineDefinitions.map((definition) => [definition.key, definition.label]),
) as Record<DevSeedRoutineKey, string>;

const emptyCountsByRoutine = Object.fromEntries(
  devSeedRoutineDefinitions.map((definition) => [
    definition.key,
    {
      routineKey: definition.key,
      total: 0,
      pending: 0,
      sent: 0,
      sending: 0,
      temporaryErrors: 0,
      permanentErrors: 0,
    } satisfies DevPerformanceRoutineCounts,
  ]),
) as Record<DevSeedRoutineKey, DevPerformanceRoutineCounts>;

function buildBatchMessage<T extends DevSeedRoutineResult | DevSeedCleanupResult>(
  payload: {
    results: readonly T[];
    errors: readonly DevSeedBatchSummary<T>['errors'][number][];
    mode: 'generate' | 'clear';
  },
) {
  const successLines = payload.results.map((result) => {
    if ('insertedEntries' in result) {
      return `${routineLabelByKey[result.routineKey]}: ${result.insertedEntries} lancamento(s) gerado(s)`;
    }

    return `${routineLabelByKey[result.routineKey]}: ${result.deletedEntries} lancamento(s) removido(s), ${result.deletedOutboxEvents} evento(s) removido(s) da fila`;
  });

  const errorLines = payload.errors.map(
    (error) => `${routineLabelByKey[error.routineKey]}: ${error.message}`,
  );

  const emptyMessage =
    payload.mode === 'generate'
      ? 'Nenhum seed foi gerado.'
      : 'Nenhum dado de seed foi encontrado para limpeza.';

  return [...successLines, ...(successLines.length > 0 && errorLines.length > 0 ? [''] : []), ...errorLines]
    .join('\n')
    .trim() || emptyMessage;
}

function formatDuration(durationMs: number | null) {
  if (durationMs == null) {
    return 'n/d';
  }

  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }

  return `${(durationMs / 1000).toFixed(2)} s`;
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleTimeString('pt-BR');
}

function buildTransmitMessage(result: DevPerformanceTransmitResult) {
  return [
    `Lotes: ${result.batchCount}`,
    `Eventos: ${result.eventCount}`,
    `Processados: ${result.processed}`,
    `Conciliados: ${result.duplicates}`,
    `Temporarios: ${result.temporaryErrors}`,
    `Permanentes: ${result.permanentErrors}`,
    `Duracao: ${formatDuration(result.durationMs)}`,
  ].join('\n');
}

function resolveRoutineRoute(routineKey: DevSeedRoutineKey): string {
  switch (routineKey) {
    case 'rupture':
      return '/rupture';
    case 'troca':
      return '/troca';
    case 'consumo':
      return '/consumo';
    case 'producao':
      return '/producao';
    case 'balanco':
      return '/balanco';
    default:
      return '/settings';
  }
}

export function DevSeedScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const currentUser = useAuthStore((state) => state.currentUser);
  const currentUserContext = useAuthStore((state) => state.currentUserContext);
  const currentStoreId = useAuthStore((state) => state.currentStoreId);
  const availableStores = useAuthStore((state) => state.availableStores);
  const connectivityStatus = useAuthStore((state) => state.connectivityStatus);
  const sessionMode = useAuthStore((state) => state.sessionMode);
  const [selectedVolume, setSelectedVolume] = useState<DevSeedVolume>(100);
  const [activeOperationLabel, setActiveOperationLabel] = useState<string | null>(
    null,
  );
  const [countsByRoutine, setCountsByRoutine] = useState(emptyCountsByRoutine);
  const [isRefreshingCounts, setIsRefreshingCounts] = useState(false);
  const [actionLogs, setActionLogs] = useState<ActionLogEntry[]>([]);

  const currentStore = useMemo(
    () =>
      currentStoreId != null
        ? (availableStores.find((store) => store.id === currentStoreId) ?? null)
        : null,
    [availableStores, currentStoreId],
  );
  const volumeOptions = useMemo<SelectOption<DevSeedVolume>[]>(
    () => [...devSeedVolumeOptions],
    [],
  );
  const canTransmit = sessionMode === 'online' && connectivityStatus === 'online';
  const totalEntriesAcrossRoutines = useMemo(
    () =>
      Object.values(countsByRoutine).reduce(
        (accumulator, counts) => accumulator + counts.total,
        0,
      ),
    [countsByRoutine],
  );

  const userLabel =
    currentUserContext?.name ?? currentUser?.name ?? 'o usuario atual';
  const storeLabel = currentStore
    ? `${currentStore.id} - ${currentStore.description}`
    : 'nenhuma loja selecionada';

  const appendLog = useCallback((entry: Omit<ActionLogEntry, 'id' | 'timestamp'>) => {
    const timestamp = new Date().toISOString();
    setActionLogs((current) => [
      {
        id: `${timestamp}:${current.length}`,
        timestamp,
        ...entry,
      },
      ...current,
    ].slice(0, 12));
  }, []);

  const refreshCounts = useCallback(async () => {
    if (!DEV_LOCAL_SEED_ENABLED || !currentUser || !currentStoreId) {
      setCountsByRoutine(emptyCountsByRoutine);
      return;
    }

    setIsRefreshingCounts(true);

    try {
      const counts = await getAllDevPerformanceCounts({
        userId: currentUser.id,
        storeId: currentStoreId,
      });

      setCountsByRoutine(
        counts.reduce<Record<DevSeedRoutineKey, DevPerformanceRoutineCounts>>(
          (accumulator, item) => {
            accumulator[item.routineKey] = item;
            return accumulator;
          },
          { ...emptyCountsByRoutine },
        ),
      );
    } finally {
      setIsRefreshingCounts(false);
    }
  }, [currentStoreId, currentUser]);

  useFocusEffect(
    useCallback(() => {
      void refreshCounts();
    }, [refreshCounts]),
  );

  function assertScopeReady() {
    if (!DEV_LOCAL_SEED_ENABLED) {
      Alert.alert(
        'Indisponivel',
        'O seed local de desenvolvimento nao esta habilitado nesta build.',
      );
      return false;
    }

    if (!currentUser || !currentStoreId) {
      Alert.alert(
        'Loja atual obrigatoria',
        'Entre no app e selecione a loja atual antes de gerar ou limpar seeds.',
      );
      return false;
    }

    return true;
  }

  async function handleGenerateRoutine(routineKey: DevSeedRoutineKey) {
    if (!assertScopeReady() || !currentUser || !currentStoreId) {
      return;
    }

    const routineLabel = routineLabelByKey[routineKey];
    const startedAt = Date.now();
    setActiveOperationLabel(`Gerando ${routineLabel.toLowerCase()} (${selectedVolume})...`);

    try {
      const result = await generateLocalDevSeed({
        routineKey,
        userId: currentUser.id,
        storeId: currentStoreId,
        volume: selectedVolume,
      });
      const durationMs = Date.now() - startedAt;

      await refreshCounts();
      appendLog({
        title: `${routineLabel}: seed concluido`,
        detail: `${result.insertedEntries} lancamento(s) gerado(s)`,
        durationMs,
        tone: 'success',
      });

      Alert.alert(
        'Seed concluido',
        `${routineLabel}: ${result.insertedEntries} lancamento(s) local(is) gerado(s) em ${formatDuration(durationMs)}.`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Nao foi possivel gerar o seed local.';
      appendLog({
        title: `${routineLabel}: erro ao gerar seed`,
        detail: message,
        durationMs: Date.now() - startedAt,
        tone: 'error',
      });
      Alert.alert('Erro ao gerar seed', message);
    } finally {
      setActiveOperationLabel(null);
    }
  }

  async function handleGenerateAll() {
    if (!assertScopeReady() || !currentUser || !currentStoreId) {
      return;
    }

    const startedAt = Date.now();
    setActiveOperationLabel(`Gerando seeds de todas as rotinas (${selectedVolume})...`);

    try {
      const summary = await generateAllLocalDevSeed({
        userId: currentUser.id,
        storeId: currentStoreId,
        volume: selectedVolume,
      });
      const durationMs = Date.now() - startedAt;

      await refreshCounts();
      appendLog({
        title: 'Todas as rotinas: seed concluido',
        detail: `${summary.results.length} rotina(s) processada(s), ${summary.errors.length} erro(s)`,
        durationMs,
        tone: summary.errors.length > 0 ? 'info' : 'success',
      });

      Alert.alert(
        'Seed concluido',
        `${buildBatchMessage({
          results: summary.results,
          errors: summary.errors,
          mode: 'generate',
        })}\n\nDuracao: ${formatDuration(durationMs)}`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Nao foi possivel gerar os dados locais de teste.';
      appendLog({
        title: 'Todas as rotinas: erro ao gerar seed',
        detail: message,
        durationMs: Date.now() - startedAt,
        tone: 'error',
      });
      Alert.alert('Erro ao gerar seeds', message);
    } finally {
      setActiveOperationLabel(null);
    }
  }

  async function handleClearRoutine(routineKey: DevSeedRoutineKey) {
    if (!assertScopeReady() || !currentUser || !currentStoreId) {
      return;
    }

    const routineLabel = routineLabelByKey[routineKey];
    const startedAt = Date.now();
    setActiveOperationLabel(`Limpando seed de ${routineLabel.toLowerCase()}...`);

    try {
      const result = await clearLocalDevSeed({
        routineKey,
        userId: currentUser.id,
        storeId: currentStoreId,
      });
      const durationMs = Date.now() - startedAt;

      await refreshCounts();
      appendLog({
        title: `${routineLabel}: limpeza concluida`,
        detail: `${result.deletedEntries} lancamento(s), ${result.deletedOutboxEvents} evento(s)`,
        durationMs,
        tone: 'success',
      });

      Alert.alert(
        'Limpeza concluida',
        `${routineLabel}: ${result.deletedEntries} lancamento(s) e ${result.deletedOutboxEvents} evento(s) da fila removidos em ${formatDuration(durationMs)}.`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Nao foi possivel limpar os dados de teste.';
      appendLog({
        title: `${routineLabel}: erro ao limpar seed`,
        detail: message,
        durationMs: Date.now() - startedAt,
        tone: 'error',
      });
      Alert.alert('Erro ao limpar seed', message);
    } finally {
      setActiveOperationLabel(null);
    }
  }

  async function handleClearAll() {
    if (!assertScopeReady() || !currentUser || !currentStoreId) {
      return;
    }

    const startedAt = Date.now();
    setActiveOperationLabel('Limpando todos os seeds locais...');

    try {
      const summary = await clearAllLocalDevSeed({
        userId: currentUser.id,
        storeId: currentStoreId,
      });
      const durationMs = Date.now() - startedAt;

      await refreshCounts();
      appendLog({
        title: 'Todas as rotinas: limpeza concluida',
        detail: `${summary.results.length} rotina(s) processada(s), ${summary.errors.length} erro(s)`,
        durationMs,
        tone: summary.errors.length > 0 ? 'info' : 'success',
      });

      Alert.alert(
        'Limpeza concluida',
        `${buildBatchMessage({
          results: summary.results,
          errors: summary.errors,
          mode: 'clear',
        })}\n\nDuracao: ${formatDuration(durationMs)}`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Nao foi possivel limpar os dados de teste.';
      appendLog({
        title: 'Todas as rotinas: erro ao limpar seed',
        detail: message,
        durationMs: Date.now() - startedAt,
        tone: 'error',
      });
      Alert.alert('Erro ao limpar seeds', message);
    } finally {
      setActiveOperationLabel(null);
    }
  }

  async function handleTransmitRoutine(routineKey: DevSeedRoutineKey) {
    if (!assertScopeReady() || !currentUser || !currentStoreId) {
      return;
    }

    if (!canTransmit) {
      Alert.alert(
        'Transmissao indisponivel',
        'Entre online e mantenha internet disponivel para testar a transmissao pela tela de debug.',
      );
      return;
    }

    const routineLabel = routineLabelByKey[routineKey];
    setActiveOperationLabel(`Transmitindo ${routineLabel.toLowerCase()}...`);

    try {
      const result = await transmitDevPerformanceRoutine({
        routineKey,
        userId: currentUser.id,
        storeId: currentStoreId,
      });

      await refreshCounts();
      appendLog({
        title: `${routineLabel}: transmissao concluida`,
        detail: `Processados ${result.processed}, conciliados ${result.duplicates}, eventos ${result.eventCount}`,
        durationMs: result.durationMs,
        tone:
          result.temporaryErrors > 0 || result.permanentErrors > 0
            ? 'info'
            : 'success',
      });

      Alert.alert('Transmissao concluida', buildTransmitMessage(result));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Nao foi possivel transmitir os eventos desta rotina.';
      appendLog({
        title: `${routineLabel}: erro na transmissao`,
        detail: message,
        durationMs: null,
        tone: 'error',
      });
      Alert.alert('Erro na transmissao', message);
    } finally {
      setActiveOperationLabel(null);
    }
  }

  function handleOpenRoutine(routineKey: DevSeedRoutineKey) {
    const routineLabel = routineLabelByKey[routineKey];
    appendLog({
      title: `${routineLabel}: abertura manual`,
      detail: 'Rota aberta a partir do painel de debug para teste visual e de scroll.',
      durationMs: null,
      tone: 'info',
    });
    router.push(resolveRoutineRoute(routineKey) as never);
  }

  return (
    <>
      <FeatureScreenLayout
        contentContainerStyle={styles.screenContent}
        onBackPress={() => router.back()}
        scrollable
        title="Debug de performance"
      >
        <Card style={styles.infoCard}>
          <Text style={styles.cardTitle}>Debug de performance</Text>
          <Text style={styles.bodyText}>
            Centraliza seed local, limpeza, contagem, transmissao e navegacao
            rapida para testes de volume. Disponivel apenas em ambiente de
            desenvolvimento.
          </Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Usuario</Text>
            <Text style={styles.metaValue}>{userLabel}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Loja atual</Text>
            <Text style={styles.metaValue}>{storeLabel}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Conectividade</Text>
            <Text style={styles.metaValue}>
              {sessionMode === 'online' ? 'Sessao online' : 'Sessao offline'} /{' '}
              {connectivityStatus}
            </Text>
          </View>

          <Select
            helper="O mesmo volume sera usado ao gerar seed por rotina ou para todas."
            label="Volume por rotina"
            options={volumeOptions}
            value={selectedVolume}
            onChange={(value) => {
              setSelectedVolume(value);
            }}
          />
        </Card>

        <Card style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Resumo geral</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{totalEntriesAcrossRoutines}</Text>
              <Text style={styles.metricLabel}>Total local</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>
                {Object.values(countsByRoutine).reduce(
                  (accumulator, item) => accumulator + item.pending,
                  0,
                )}
              </Text>
              <Text style={styles.metricLabel}>Pendentes</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>
                {Object.values(countsByRoutine).reduce(
                  (accumulator, item) => accumulator + item.sent,
                  0,
                )}
              </Text>
              <Text style={styles.metricLabel}>Transmitidos</Text>
            </View>
          </View>

          <View style={styles.footerActions}>
            <Button
              block
              label={isRefreshingCounts ? 'Atualizando contagens...' : 'Atualizar contagens'}
              loading={isRefreshingCounts}
              variant="secondary"
              onPress={() => {
                void refreshCounts();
              }}
            />
            <Button
              block
              label={`Gerar todas (${selectedVolume})`}
              onPress={() => {
                void handleGenerateAll();
              }}
            />
            <Button
              block
              label="Limpar todos os seeds"
              variant="warning"
              onPress={() => {
                void handleClearAll();
              }}
            />
          </View>

          <Text style={styles.footerHint}>
            A transmissao em lote usa a outbox real do app. Seeds entram como
            pendentes e podem ser medidos pelo tempo de envio.
          </Text>
        </Card>

        {devSeedRoutineDefinitions.map((definition) => {
          const counts = countsByRoutine[definition.key];

          return (
            <Card key={definition.key} style={styles.routineCard}>
              <View style={styles.routineHeader}>
                <Text style={styles.routineTitle}>{definition.label}</Text>
                <Text style={styles.routineDescription}>
                  {definition.description}
                </Text>
              </View>

              <View style={styles.summaryGrid}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{counts.total}</Text>
                  <Text style={styles.metricLabel}>Total</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{counts.pending}</Text>
                  <Text style={styles.metricLabel}>Pendentes</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{counts.sent}</Text>
                  <Text style={styles.metricLabel}>Transmitidos</Text>
                </View>
              </View>

              <View style={styles.statusRow}>
                <Text style={styles.statusText}>Em envio: {counts.sending}</Text>
                <Text style={styles.statusText}>
                  Temp.: {counts.temporaryErrors}
                </Text>
                <Text style={styles.statusText}>
                  Perm.: {counts.permanentErrors}
                </Text>
              </View>

              <View style={styles.actionRow}>
                <Button
                  label={`Gerar ${selectedVolume}`}
                  onPress={() => {
                    void handleGenerateRoutine(definition.key);
                  }}
                />
                <Button
                  label="Limpar seed"
                  variant="ghost"
                  onPress={() => {
                    void handleClearRoutine(definition.key);
                  }}
                />
              </View>

              <View style={styles.actionRow}>
                <Button
                  label="Abrir rotina"
                  variant="secondary"
                  onPress={() => {
                    handleOpenRoutine(definition.key);
                  }}
                />
                <Button
                  disabled={!canTransmit}
                  label="Transmitir"
                  variant="ghost"
                  onPress={() => {
                    void handleTransmitRoutine(definition.key);
                  }}
                />
              </View>
            </Card>
          );
        })}

        <Card style={styles.footerCard}>
          <Text style={styles.cardTitle}>Logs recentes</Text>
          {actionLogs.length === 0 ? (
            <Text style={styles.footerHint}>
              Ainda nao ha operacoes registradas nesta sessao de debug.
            </Text>
          ) : (
            <View style={styles.logList}>
              {actionLogs.map((log) => (
                <View
                  key={log.id}
                  style={[
                    styles.logItem,
                    log.tone === 'success' && styles.logItemSuccess,
                    log.tone === 'error' && styles.logItemError,
                  ]}
                >
                  <Text style={styles.logTitle}>{log.title}</Text>
                  <Text style={styles.logDetail}>{log.detail}</Text>
                  <Text style={styles.logMeta}>
                    {formatTimestamp(log.timestamp)} · {formatDuration(log.durationMs)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      </FeatureScreenLayout>

      <Modal animationType="fade" transparent visible={activeOperationLabel != null}>
        <View style={styles.modalOverlay}>
          <View style={styles.progressCard}>
            <MaterialIcons
              color={theme.colors.brand.primaryStrong}
              name="memory"
              size={46}
            />
            <Text style={styles.progressTitle}>Processando debug...</Text>
            <Text style={styles.progressText}>
              {activeOperationLabel ??
                'Aguarde enquanto o SQLite local e a fila de transmissao sao preparados.'}
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    screenContent: {
      gap: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    infoCard: {
      gap: spacing.md,
    },
    summaryCard: {
      gap: spacing.md,
    },
    cardTitle: {
      ...typography.textStyles.title,
      color: theme.colors.text.primary,
    },
    bodyText: {
      ...typography.textStyles.body,
      color: theme.colors.text.secondary,
    },
    metaRow: {
      gap: 4,
    },
    metaLabel: {
      ...typography.textStyles.caption,
      color: theme.colors.text.muted,
      textTransform: 'uppercase',
    },
    metaValue: {
      ...typography.textStyles.bodyStrong,
      color: theme.colors.text.primary,
    },
    routineCard: {
      gap: spacing.md,
    },
    routineHeader: {
      gap: spacing.xs,
    },
    routineTitle: {
      ...typography.textStyles.title,
      color: theme.colors.text.primary,
    },
    routineDescription: {
      ...typography.textStyles.body,
      color: theme.colors.text.secondary,
    },
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    metricCard: {
      minWidth: 90,
      flexGrow: 1,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border.default,
      backgroundColor: theme.colors.background.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: 4,
    },
    metricValue: {
      ...typography.textStyles.title,
      color: theme.colors.text.primary,
    },
    metricLabel: {
      ...typography.textStyles.caption,
      color: theme.colors.text.muted,
      textTransform: 'uppercase',
    },
    statusRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    statusText: {
      ...typography.textStyles.caption,
      color: theme.colors.text.secondary,
    },
    actionRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      flexWrap: 'wrap',
    },
    footerCard: {
      gap: spacing.md,
    },
    footerActions: {
      gap: spacing.sm,
    },
    footerHint: {
      ...typography.textStyles.caption,
      color: theme.colors.text.muted,
    },
    logList: {
      gap: spacing.sm,
    },
    logItem: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border.default,
      backgroundColor: theme.colors.background.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: 4,
    },
    logItemSuccess: {
      borderColor: theme.colors.badge.success.border,
      backgroundColor: theme.colors.badge.success.background,
    },
    logItemError: {
      borderColor: theme.colors.badge.error.border,
      backgroundColor: theme.colors.badge.error.background,
    },
    logTitle: {
      ...typography.textStyles.bodyStrong,
      color: theme.colors.text.primary,
    },
    logDetail: {
      ...typography.textStyles.caption,
      color: theme.colors.text.secondary,
    },
    logMeta: {
      ...typography.textStyles.caption,
      color: theme.colors.text.muted,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay.strong,
      justifyContent: 'center',
      alignItems: 'center',
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
