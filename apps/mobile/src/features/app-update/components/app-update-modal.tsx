import { Modal, ScrollView, StyleSheet, Text, View, type DimensionValue } from 'react-native';
import { Card, Button } from '@/src/components/ui';
import { spacing, typography } from '@/src/theme/tokens';
import { useAppTheme, useThemedStyles, type AppTheme } from '@/src/theme/theme-provider';
import type { AndroidReleaseMetadata, InstalledAndroidVersion } from '@/src/features/app-update/types';

type AppUpdateModalPhase =
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'error';

type AppUpdateModalProps = {
  visible: boolean;
  phase: AppUpdateModalPhase;
  latestRelease: AndroidReleaseMetadata | null;
  installedVersion: InstalledAndroidVersion | null;
  progress: number;
  errorMessage: string | null;
  onDismiss: () => void;
  onConfirmDownload: () => void;
  onRetryInstall: () => void;
  onOpenBrowser: () => void;
  onOpenUnknownSourcesSettings: () => void;
};

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function AppUpdateModal({
  visible,
  phase,
  latestRelease,
  installedVersion,
  progress,
  errorMessage,
  onDismiss,
  onConfirmDownload,
  onRetryInstall,
  onOpenBrowser,
  onOpenUnknownSourcesSettings,
}: AppUpdateModalProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);

  if (!latestRelease || !installedVersion) {
    return null;
  }

  const isRequired = latestRelease.required;
  const canDismiss = !isRequired && phase !== 'downloading';
  const progressPercent = `${Math.max(0, Math.min(100, Math.round(progress * 100)))}%`;
  const progressWidth = progressPercent as DimensionValue;

  let title = 'Atualizacao disponivel';
  let description =
    'Existe uma nova APK Android disponivel para este aparelho.';

  if (phase === 'downloading') {
    title = 'Baixando atualizacao';
    description = 'A APK esta sendo baixada para iniciar a instalacao em seguida.';
  } else if (phase === 'downloaded') {
    title = 'APK pronta para instalar';
    description =
      'O instalador do Android foi aberto. Se ele nao aparecer, toque em "Abrir instalador" novamente.';
  } else if (phase === 'error') {
    title = 'Nao foi possivel atualizar';
    description =
      'O download ou a abertura do instalador falhou. Voce pode tentar novamente ou usar o link publico da APK.';
  }

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={() => {
        if (canDismiss) {
          onDismiss();
        }
      }}
    >
      <View style={styles.overlay}>
        <Card style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Versao instalada</Text>
              <Text style={styles.infoValue}>
                {installedVersion.versionName} ({installedVersion.buildNumber || 'sem build'})
              </Text>
            </View>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Nova versao</Text>
              <Text style={styles.infoValue}>
                {latestRelease.versionName} ({latestRelease.buildNumber})
              </Text>
            </View>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Tamanho</Text>
              <Text style={styles.infoValue}>
                {formatFileSize(latestRelease.fileSizeBytes)}
              </Text>
            </View>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Publicada em</Text>
              <Text style={styles.infoValue}>
                {latestRelease.publishedAt
                  ? new Date(latestRelease.publishedAt).toLocaleString('pt-BR')
                  : 'Nao informado'}
              </Text>
            </View>
          </View>

          <View style={styles.changelogBlock}>
            <Text style={styles.changelogLabel}>Changelog</Text>
            <ScrollView contentContainerStyle={styles.changelogScrollContent} style={styles.changelogScroll}>
              <Text style={styles.changelogText}>
                {latestRelease.changelog?.trim() || 'Sem anotacoes para esta versao.'}
              </Text>
            </ScrollView>
          </View>

          {phase === 'downloading' ? (
            <View style={styles.progressBlock}>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: progressWidth,
                      backgroundColor: colors.brand.primary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressLabel}>{progressPercent}</Text>
            </View>
          ) : null}

          {phase === 'error' && errorMessage ? (
            <Text style={styles.errorMessage}>{errorMessage}</Text>
          ) : null}

          <View style={styles.actions}>
            {phase === 'available' ? (
              <>
                {canDismiss ? (
                  <Button block label="Agora nao" variant="ghost" onPress={onDismiss} />
                ) : null}
                <Button block label="Atualizar" onPress={onConfirmDownload} />
              </>
            ) : null}

            {phase === 'downloading' ? (
              <Button block disabled label="Baixando APK..." />
            ) : null}

            {phase === 'downloaded' ? (
              <>
                <Button
                  block
                  label="Abrir instalador"
                  onPress={onRetryInstall}
                />
                <Button
                  block
                  label="Baixar pelo navegador"
                  variant="ghost"
                  onPress={onOpenBrowser}
                />
                {canDismiss ? (
                  <Button block label="Fechar" variant="ghost" onPress={onDismiss} />
                ) : null}
              </>
            ) : null}

            {phase === 'error' ? (
              <>
                <Button block label="Tentar novamente" onPress={onConfirmDownload} />
                <Button
                  block
                  label="Abrir configuracao de instalacao"
                  variant="ghost"
                  onPress={onOpenUnknownSourcesSettings}
                />
                <Button
                  block
                  label="Baixar pelo navegador"
                  variant="ghost"
                  onPress={onOpenBrowser}
                />
                {canDismiss ? (
                  <Button block label="Fechar" variant="ghost" onPress={onDismiss} />
                ) : null}
              </>
            ) : null}
          </View>
        </Card>
      </View>
    </Modal>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay.strong,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    card: {
      width: '100%',
      maxWidth: 460,
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
    infoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    infoBlock: {
      flexBasis: '47%',
      minWidth: 140,
      borderWidth: 1,
      borderColor: theme.colors.border.default,
      borderRadius: 12,
      backgroundColor: theme.colors.background.surface,
      padding: spacing.sm,
      gap: spacing.xxs,
    },
    infoLabel: {
      ...typography.textStyles.caption,
      color: theme.colors.text.muted,
      textTransform: 'uppercase',
    },
    infoValue: {
      ...typography.textStyles.bodyStrong,
      color: theme.colors.text.primary,
    },
    changelogBlock: {
      gap: spacing.xs,
    },
    changelogLabel: {
      ...typography.textStyles.caption,
      color: theme.colors.text.muted,
      textTransform: 'uppercase',
    },
    changelogScroll: {
      maxHeight: 120,
      borderWidth: 1,
      borderColor: theme.colors.border.default,
      borderRadius: 12,
      backgroundColor: theme.colors.background.surface,
    },
    changelogScrollContent: {
      padding: spacing.sm,
    },
    changelogText: {
      ...typography.textStyles.body,
      color: theme.colors.text.secondary,
    },
    progressBlock: {
      gap: spacing.xs,
    },
    progressTrack: {
      height: 10,
      borderRadius: 999,
      overflow: 'hidden',
      backgroundColor: theme.colors.background.surface,
      borderWidth: 1,
      borderColor: theme.colors.border.default,
    },
    progressFill: {
      height: '100%',
      borderRadius: 999,
    },
    progressLabel: {
      ...typography.textStyles.caption,
      color: theme.colors.text.secondary,
      textAlign: 'right',
    },
    errorMessage: {
      ...typography.textStyles.caption,
      color: theme.colors.status.error,
    },
    actions: {
      gap: spacing.sm,
    },
  });
