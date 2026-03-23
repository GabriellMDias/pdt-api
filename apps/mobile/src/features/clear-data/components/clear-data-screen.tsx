import { AntDesign, Feather, MaterialIcons } from '@expo/vector-icons';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Button, Card } from '@/src/components/ui';
import { useAuthStore } from '@/src/features/auth/store/use-auth-store';
import { clearDataRoutineDefinitions } from '@/src/features/clear-data/config';
import { clearSelectedOperationalData } from '@/src/features/clear-data/services/clear-data.service';
import type { ClearDataRoutineDefinition } from '@/src/features/clear-data/types';
import type { ClearDataRoutineKey } from '@/src/database/repositories';
import { FeatureScreenLayout } from '@/src/features/shared/components/feature-screen-layout';
import { spacing, typography } from '@/src/theme/tokens';
import { useAppTheme, useThemedStyles, type AppTheme } from '@/src/theme/theme-provider';

function toggleRoutineKey(
  currentKeys: readonly ClearDataRoutineKey[],
  routineKey: ClearDataRoutineKey,
) {
  if (currentKeys.includes(routineKey)) {
    return currentKeys.filter((key) => key !== routineKey);
  }

  return [...currentKeys, routineKey];
}

function buildConfirmationMessage(payload: {
  selectedLabels: readonly string[];
  storeLabel: string;
  userLabel: string;
}) {
  return [
    `As rotinas selecionadas serao limpas para ${payload.userLabel} na loja ${payload.storeLabel}.`,
    '',
    `Rotinas: ${payload.selectedLabels.join(', ')}`,
    '',
    'Serao removidos os lancamentos locais pendentes e transmitidos dessas rotinas, junto com os eventos correspondentes da fila de transmissao.',
    '',
    'Nao serao apagados catalogos, sessao, loja atual, favoritos, tema ou outras configuracoes do app.',
  ].join('\n');
}

export function ClearDataScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const currentUser = useAuthStore((state) => state.currentUser);
  const currentStoreId = useAuthStore((state) => state.currentStoreId);
  const currentUserContext = useAuthStore((state) => state.currentUserContext);
  const availableStores = useAuthStore((state) => state.availableStores);
  const [selectedRoutineKeys, setSelectedRoutineKeys] = useState<ClearDataRoutineKey[]>([]);
  const [isClearing, setIsClearing] = useState(false);

  const currentStore = useMemo(
    () =>
      currentStoreId != null
        ? availableStores.find((store) => store.id === currentStoreId) ?? null
        : null,
    [availableStores, currentStoreId],
  );
  const groupedDefinitions = useMemo(() => {
    const groupMap = new Map<string, ClearDataRoutineDefinition[]>();

    for (const definition of clearDataRoutineDefinitions) {
      const currentGroup = groupMap.get(definition.groupLabel) ?? [];
      currentGroup.push(definition);
      groupMap.set(definition.groupLabel, currentGroup);
    }

    return [...groupMap.entries()].map(([groupLabel, routines]) => ({
      groupLabel,
      routines,
    }));
  }, []);

  const selectedLabels = clearDataRoutineDefinitions
    .filter((definition) => selectedRoutineKeys.includes(definition.key))
    .map((definition) => definition.label);

  const userLabel =
    currentUserContext?.name ?? currentUser?.name ?? 'o usuario atual';
  const storeLabel = currentStore
    ? `${currentStore.id} - ${currentStore.description}`
    : 'nenhuma loja selecionada';

  async function executeClearData() {
    if (!currentUser || !currentStoreId) {
      Alert.alert(
        'Loja atual obrigatoria',
        'Escolha a loja atual antes de limpar o historico local.',
      );
      return;
    }

    if (selectedRoutineKeys.length === 0) {
      Alert.alert(
        'Selecione ao menos uma rotina',
        'Marque quais historicos devem ser removidos antes de continuar.',
      );
      return;
    }

    setIsClearing(true);

    try {
      const summary = await clearSelectedOperationalData({
        userId: currentUser.id,
        storeId: currentStoreId,
        routines: selectedRoutineKeys,
      });

      const message =
        summary.deletedEntries > 0
          ? `Historico local removido com sucesso. Foram apagados ${summary.deletedEntries} lancamento(s) e ${summary.deletedOutboxEvents} evento(s) da fila relacionados as rotinas selecionadas.`
          : 'Nao havia historico local das rotinas selecionadas para o usuario atual na loja atual.';

      Alert.alert('Limpar Dados', message, [
        {
          text: 'OK',
          onPress: () => {
            router.replace('/home');
          },
        },
      ]);
    } catch (error) {
      Alert.alert(
        'Erro ao limpar dados',
        error instanceof Error ? error.message : 'Nao foi possivel limpar os dados locais.',
      );
    } finally {
      setIsClearing(false);
    }
  }

  function handleConfirmClearData() {
    if (!currentStoreId) {
      Alert.alert(
        'Loja atual obrigatoria',
        'Escolha a loja atual antes de limpar o historico local.',
      );
      return;
    }

    if (selectedRoutineKeys.length === 0) {
      Alert.alert(
        'Selecione ao menos uma rotina',
        'Marque quais historicos devem ser removidos antes de continuar.',
      );
      return;
    }

    Alert.alert(
      'Excluir dados locais',
      buildConfirmationMessage({
        selectedLabels,
        storeLabel,
        userLabel,
      }),
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            void executeClearData();
          },
        },
      ],
    );
  }

  if (!currentUser) {
    return (
      <FeatureScreenLayout
        onBackPress={() => router.back()}
        scrollable
        title="Limpar Dados"
      >
        <Card>
          <Text style={styles.cardTitle}>Sessao indisponivel</Text>
          <Text style={styles.bodyText}>
            Entre novamente no app antes de usar a limpeza de historico local.
          </Text>
        </Card>
      </FeatureScreenLayout>
    );
  }

  return (
    <>
      <FeatureScreenLayout
        contentContainerStyle={styles.screenContent}
        onBackPress={() => router.back()}
        scrollable
        title="Limpar Dados"
      >
        <Card style={styles.infoCard}>
          <Text style={styles.cardTitle}>Escopo da limpeza</Text>
          <Text style={styles.bodyText}>
            A limpeza segue a ideia do legado, mas com escopo seguro: remove apenas o historico
            local do usuario atual na loja atual.
          </Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Usuario</Text>
            <Text style={styles.metaValue}>{userLabel}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Loja atual</Text>
            <Text style={styles.metaValue}>{storeLabel}</Text>
          </View>
        </Card>

        {groupedDefinitions.map((group) => (
          <Card key={group.groupLabel} style={styles.groupCard}>
            <Text style={styles.groupTitle}>{group.groupLabel}</Text>

            {group.routines.map((routine) => {
              const selected = selectedRoutineKeys.includes(routine.key);

              return (
                <Pressable
                  key={routine.key}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  style={({ pressed }) => [
                    styles.routineRow,
                    selected && styles.routineRowSelected,
                    pressed && styles.routineRowPressed,
                  ]}
                  onPress={() => {
                    setSelectedRoutineKeys((current) =>
                      toggleRoutineKey(current, routine.key),
                    );
                  }}
                >
                  <View style={styles.checkboxWrap}>
                    <Feather
                      color={
                        selected
                          ? theme.colors.brand.primaryStrong
                          : theme.colors.text.muted
                      }
                      name={selected ? 'check-square' : 'square'}
                      size={20}
                    />
                  </View>

                  <View style={styles.routineCopy}>
                    <Text style={styles.routineLabel}>{routine.label}</Text>
                    <Text style={styles.routineDescription}>{routine.description}</Text>
                  </View>
                </Pressable>
              );
            })}
          </Card>
        ))}

        <Card variant="muted" style={styles.scopeCard}>
          <Text style={styles.scopeTitle}>O que nao sera apagado</Text>
          <Text style={styles.scopeText}>
            Catalogos sincronizados, sessao/login, loja atual, tema, favoritos e demais
            configuracoes do usuario permanecem intactos.
          </Text>
        </Card>

        <View style={styles.footerActions}>
          <Button
            block
            disabled={selectedRoutineKeys.length === 0 || !currentStoreId}
            label="Excluir dados"
            leftSlot={<AntDesign color={theme.colors.text.onAccent} name="delete" size={18} />}
            loading={isClearing}
            variant="warning"
            onPress={handleConfirmClearData}
          />

          <Text style={styles.footerHint}>
            {selectedRoutineKeys.length > 0
              ? `${selectedRoutineKeys.length} rotina(s) selecionada(s)`
              : 'Selecione uma ou mais rotinas para continuar'}
          </Text>
        </View>
      </FeatureScreenLayout>

      <Modal animationType="fade" transparent visible={isClearing}>
        <View style={styles.modalOverlay}>
          <View style={styles.progressCard}>
            <MaterialIcons color={theme.colors.brand.primaryStrong} name="phonelink-ring" size={50} />
            <Text style={styles.progressTitle}>Limpando dados...</Text>
            <Text style={styles.progressText}>Removendo historico local, aguarde!</Text>
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
    groupCard: {
      gap: spacing.sm,
    },
    groupTitle: {
      ...typography.textStyles.title,
      color: theme.colors.text.primary,
    },
    routineRow: {
      flexDirection: 'row',
      gap: spacing.md,
      alignItems: 'flex-start',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border.default,
      backgroundColor: theme.colors.background.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    routineRowSelected: {
      borderColor: theme.colors.brand.primaryStrong,
      backgroundColor: theme.colors.background.surfaceAlt,
    },
    routineRowPressed: {
      opacity: 0.92,
    },
    checkboxWrap: {
      paddingTop: 2,
    },
    routineCopy: {
      flex: 1,
      gap: 4,
    },
    routineLabel: {
      ...typography.textStyles.bodyStrong,
      color: theme.colors.text.primary,
    },
    routineDescription: {
      ...typography.textStyles.caption,
      color: theme.colors.text.secondary,
    },
    scopeCard: {
      gap: spacing.xs,
    },
    scopeTitle: {
      ...typography.textStyles.bodyStrong,
      color: theme.colors.text.primary,
    },
    scopeText: {
      ...typography.textStyles.caption,
      color: theme.colors.text.secondary,
    },
    footerActions: {
      gap: spacing.sm,
      paddingBottom: spacing.lg,
    },
    footerHint: {
      ...typography.textStyles.caption,
      color: theme.colors.text.muted,
      textAlign: 'center',
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
