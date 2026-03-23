import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Select, type SelectOption } from '@/src/components/ui';
import type { LocalMasterStore } from '@/src/features/bootstrap/types';
import {
  resolveSyncProgressSteps,
  type SyncProgressScope,
} from '@/src/features/sync/constants/sync-progress';
import { spacing, typography } from '@/src/theme/tokens';
import { useThemedStyles, type AppTheme } from '@/src/theme/theme-provider';

export function getSelectableSyncStores<
  T extends Pick<LocalMasterStore, 'id' | 'description' | 'storeName' | 'activeStatus'>,
>(stores: readonly T[]): T[] {
  return stores.filter((store) => store.id > 0 && store.activeStatus !== false);
}

type StoreSelectorModalProps = {
  visible: boolean;
  title: string;
  description?: string | null;
  errorMessage?: string | null;
  stores: readonly Pick<LocalMasterStore, 'id' | 'description' | 'storeName' | 'activeStatus'>[];
  selectedStoreId: number | null;
  confirmLabel?: string;
  loading?: boolean;
  progressScope?: SyncProgressScope | null;
  progressLabel?: string | null;
  progressDetail?: string | null;
  onSelectStore: (storeId: number) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function StoreSelectorModal({
  visible,
  title,
  description,
  errorMessage,
  stores,
  selectedStoreId,
  confirmLabel = 'Sincronizar',
  loading = false,
  progressScope,
  progressLabel,
  progressDetail,
  onSelectStore,
  onClose,
  onConfirm,
}: StoreSelectorModalProps) {
  const styles = useThemedStyles(createStyles);
  const selectableStores = getSelectableSyncStores(stores);
  const selectedStore =
    selectableStores.find((store) => store.id === selectedStoreId) ?? null;
  const progressSteps = resolveSyncProgressSteps(progressScope ?? null);
  const currentStepIndex = progressScope
    ? progressSteps.findIndex((step) => step.scope === progressScope)
    : -1;
  const storeOptions: SelectOption<number>[] = selectableStores.map((store) => ({
    value: store.id,
    label: `${store.id} - ${store.description}`,
    description: store.storeName || store.description,
  }));

  return (
    <Modal animationType="fade" transparent visible={visible}>
      <View style={styles.overlay}>
        {!loading ? <Pressable onPress={onClose} style={StyleSheet.absoluteFill} /> : null}

        <View style={styles.card}>
          {loading ? (
            <>
              <Text style={styles.title}>Sincronizando...</Text>
              {selectedStore ? (
                <Text style={styles.description}>
                  Loja {selectedStore.id} - {selectedStore.description}
                </Text>
              ) : null}

              <View style={styles.progressBox}>
                <ActivityIndicator size="large" />
                <Text style={styles.progressLabel}>Sincronizando agora</Text>
                <Text style={styles.progressValue}>
                  {progressLabel ?? 'Preparando os dados do app...'}
                </Text>
                {progressDetail ? (
                  <Text style={styles.progressDetail}>{progressDetail}</Text>
                ) : null}
              </View>

              <View style={styles.stepsList}>
                {progressSteps.map((step, index) => {
                  const isCurrent = index === currentStepIndex;
                  const isCompleted = currentStepIndex > -1 && index < currentStepIndex;

                  return (
                    <View
                      key={step.scope}
                      style={[
                        styles.stepRow,
                        isCurrent && styles.stepRowCurrent,
                        isCompleted && styles.stepRowCompleted,
                      ]}
                    >
                      <View
                        style={[
                          styles.stepBullet,
                          isCurrent && styles.stepBulletCurrent,
                          isCompleted && styles.stepBulletCompleted,
                        ]}
                      />
                      <Text
                        style={[
                          styles.stepLabel,
                          isCurrent && styles.stepLabelCurrent,
                          isCompleted && styles.stepLabelCompleted,
                        ]}
                      >
                        {step.label}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <Text style={styles.progressHelper}>
                Mantenha o app aberto ate a conclusao desta etapa.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.title}>{title}</Text>
              {description ? <Text style={styles.description}>{description}</Text> : null}
              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

              <Select
                emptyMessage="Nenhuma loja valida esta disponivel para sincronizacao."
                helper="Somente lojas validas para o contexto atual aparecem aqui."
                label="Loja"
                options={storeOptions}
                placeholder="Selecionar loja"
                value={selectedStoreId}
                onChange={onSelectStore}
              />

              <View style={styles.actions}>
                <Button
                  block
                  label="Cancelar"
                  style={styles.secondaryAction}
                  variant="ghost"
                  onPress={onClose}
                />
                <Button
                  block
                  disabled={selectedStoreId == null || selectableStores.length === 0}
                  label={confirmLabel}
                  loading={loading}
                  style={styles.primaryAction}
                  onPress={onConfirm}
                />
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay.strong,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    backgroundColor: theme.colors.background.surfaceAlt,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  title: {
    ...typography.textStyles.title,
    color: theme.colors.text.primary,
  },
  description: {
    ...typography.textStyles.body,
    color: theme.colors.text.secondary,
  },
  errorText: {
    ...typography.textStyles.caption,
    color: theme.colors.badge.error.text,
  },
  progressBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    backgroundColor: theme.colors.background.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  progressLabel: {
    ...typography.textStyles.caption,
    color: theme.colors.text.muted,
    textTransform: 'uppercase',
  },
  progressValue: {
    ...typography.textStyles.bodyStrong,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  progressDetail: {
    ...typography.textStyles.caption,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  progressHelper: {
    ...typography.textStyles.caption,
    color: theme.colors.text.muted,
    textAlign: 'center',
  },
  stepsList: {
    gap: spacing.xs,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
    backgroundColor: theme.colors.background.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  stepRowCurrent: {
    borderColor: theme.colors.brand.primaryStrong,
    backgroundColor: theme.isDark ? 'rgba(0,85,59,0.18)' : 'rgba(0,85,59,0.08)',
  },
  stepRowCompleted: {
    borderColor: theme.colors.badge.success.border,
    backgroundColor: theme.colors.badge.success.background,
  },
  stepBullet: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.text.muted,
  },
  stepBulletCurrent: {
    backgroundColor: theme.colors.brand.primaryStrong,
  },
  stepBulletCompleted: {
    backgroundColor: theme.colors.badge.success.text,
  },
  stepLabel: {
    ...typography.textStyles.caption,
    color: theme.colors.text.secondary,
    flex: 1,
  },
  stepLabelCurrent: {
    color: theme.colors.text.primary,
    fontWeight: '700',
  },
  stepLabelCompleted: {
    color: theme.colors.badge.success.text,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryAction: {
    flex: 1,
  },
  primaryAction: {
    flex: 1,
  },
});
