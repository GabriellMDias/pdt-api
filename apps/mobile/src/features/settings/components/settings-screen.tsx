import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Card, Select, type SelectOption } from "@/src/components/ui";
import { useAuthStore } from "@/src/features/auth/store/use-auth-store";
import { FeatureScreenLayout } from "@/src/features/shared/components/feature-screen-layout";
import {
  StoreSelectorModal,
  getSelectableSyncStores,
} from "@/src/features/sync/components/store-selector-modal";
import { DEV_LOCAL_SEED_ENABLED } from "@/src/features/dev-seed/config";
import type { AppThemeMode } from "@/src/theme/colors";
import { spacing, typography } from "@/src/theme/tokens";
import {
  useAppTheme,
  useThemedStyles,
  type AppTheme,
} from "@/src/theme/theme-provider";

export function SettingsScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const availableStores = useAuthStore((state) => state.availableStores);
  const currentStoreId = useAuthStore((state) => state.currentStoreId);
  const autoTransmitEnabled = useAuthStore(
    (state) => state.autoTransmitEnabled,
  );
  const appTheme = useAuthStore((state) => state.appTheme);
  const appLastPreparedAt = useAuthStore((state) => state.appLastPreparedAt);
  const errorMessage = useAuthStore((state) => state.errorMessage);
  const isSyncingApp = useAuthStore((state) => state.isSyncingApp);
  const syncProgressScope = useAuthStore((state) => state.syncProgressScope);
  const syncProgressLabel = useAuthStore((state) => state.syncProgressLabel);
  const syncProgressDetail = useAuthStore((state) => state.syncProgressDetail);
  const syncAppData = useAuthStore((state) => state.syncAppData);
  const setAutoTransmitEnabled = useAuthStore(
    (state) => state.setAutoTransmitEnabled,
  );
  const setAppTheme = useAuthStore((state) => state.setAppTheme);

  const [storeModalVisible, setStoreModalVisible] = useState(false);
  const [pendingStoreId, setPendingStoreId] = useState<number | null>(
    currentStoreId,
  );

  useEffect(() => {
    setPendingStoreId(currentStoreId);
  }, [currentStoreId]);

  const currentStore = useMemo(
    () => availableStores.find((store) => store.id === currentStoreId) ?? null,
    [availableStores, currentStoreId],
  );
  const selectableStores = useMemo(
    () => getSelectableSyncStores(availableStores),
    [availableStores],
  );
  const themeOptions = useMemo<SelectOption<AppThemeMode>[]>(
    () => [
      {
        value: "dark",
        label: "Dark",
        description: "Padrao operacional do app",
      },
      {
        value: "light",
        label: "Light",
        description: "Modo claro para teste e uso alternativo",
      },
    ],
    [],
  );

  async function handleConfirmSync() {
    if (!pendingStoreId) return;

    const synced = await syncAppData(pendingStoreId, "settings_sync");
    if (synced) {
      setStoreModalVisible(false);
    }
  }

  return (
    <>
      <FeatureScreenLayout
        contentContainerStyle={styles.screenContent}
        onBackPress={() => router.back()}
        scrollable
        title="Configuracoes"
      >
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Sincronizacao</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Loja atual</Text>
            <Text style={styles.infoValue}>
              {currentStore
                ? `${currentStore.id} - ${currentStore.description}`
                : "Nenhuma loja selecionada"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ultima sincronizacao global</Text>
            <Text style={styles.infoValue}>
              {appLastPreparedAt
                ? new Date(appLastPreparedAt).toLocaleString("pt-BR")
                : "Ainda nao sincronizado"}
            </Text>
          </View>

          <Button
            block
            disabled={selectableStores.length === 0}
            label="Sincronizar"
            loading={isSyncingApp}
            onPress={() => {
              setPendingStoreId(
                currentStoreId ?? selectableStores[0]?.id ?? null,
              );
              setStoreModalVisible(true);
            }}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Tema</Text>
          <Select
            helper="Dark e o padrao. Use Light para testar a base nova de tema."
            options={themeOptions}
            value={appTheme}
            onChange={(value) => {
              void setAppTheme(value);
            }}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Transmissao</Text>

          <View style={styles.toggleRow}>
            <View style={styles.toggleCopy}>
              <Text style={styles.toggleTitle}>
                Transmissao automatica do app
              </Text>
              <Text style={styles.toggleHelper}>
                Quando ativado, cada rotina pode tentar transmitir logo após
                salvar, sem depender exclusivamente do botao Transmitir.
              </Text>
            </View>

            <Switch
              thumbColor={
                autoTransmitEnabled
                  ? colors.text.onAccent
                  : isDark
                    ? "#F3F4F6"
                    : "#FFFFFF"
              }
              trackColor={{
                false: isDark ? "#6B7280" : "#9CA3AF",
                true: colors.brand.primary,
              }}
              value={autoTransmitEnabled}
              onValueChange={(value) => {
                void setAutoTransmitEnabled(value);
              }}
            />
          </View>
        </Card>

        {DEV_LOCAL_SEED_ENABLED ? (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Debug de performance</Text>
            <Text style={styles.cardText}>
              Gere massa local, acompanhe contagens, transmita por rotina e
              abra rapidamente as telas operacionais para testar volume.
            </Text>

            <Button
              block
              label="Abrir debug"
              onPress={() => {
                router.push("/debug-performance" as never);
              }}
            />
          </Card>
        ) : null}

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}
      </FeatureScreenLayout>

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
        visible={storeModalVisible}
        onClose={() => {
          setStoreModalVisible(false);
        }}
        onConfirm={() => {
          void handleConfirmSync();
        }}
        onSelectStore={setPendingStoreId}
      />
    </>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    screenContent: {
      gap: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    card: {
      gap: spacing.md,
    },
    cardTitle: {
      ...typography.textStyles.title,
      color: theme.colors.text.primary,
    },
    cardText: {
      ...typography.textStyles.body,
      color: theme.colors.text.secondary,
    },
    infoRow: {
      gap: 4,
    },
    infoLabel: {
      ...typography.textStyles.caption,
      color: theme.colors.text.muted,
      textTransform: "uppercase",
    },
    infoValue: {
      ...typography.textStyles.bodyStrong,
      color: theme.colors.text.primary,
    },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    toggleCopy: {
      flex: 1,
      gap: 4,
    },
    toggleTitle: {
      ...typography.textStyles.bodyStrong,
      color: theme.colors.text.primary,
    },
    toggleHelper: {
      ...typography.textStyles.caption,
      color: theme.colors.text.secondary,
    },
    footerText: {
      ...typography.textStyles.caption,
      color: theme.colors.text.muted,
    },
    errorText: {
      ...typography.textStyles.caption,
      color: theme.colors.badge.error.text,
    },
  });
