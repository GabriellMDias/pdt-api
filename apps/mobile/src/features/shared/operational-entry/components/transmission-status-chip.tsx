import { StyleSheet, Text, View } from 'react-native';
import { useThemedStyles, type AppTheme } from '@/src/theme/theme-provider';
import type { TransmissionBadgeEntry } from '@/src/features/shared/operational-entry/components/transmission-status-badge';
import { radii, spacing, typography } from '@/src/theme/tokens';

type TransmissionStatusChipProps = {
  status: TransmissionBadgeEntry['syncStatus'];
  serverAckStatus?: string | null;
};

function resolveStatusPresentation(
  status: TransmissionBadgeEntry['syncStatus'],
  serverAckStatus?: string | null,
) {
  if (status === 'sent') {
    return {
      label: serverAckStatus === 'duplicate' ? 'Conciliado' : 'Transmitido',
      tone: 'success' as const,
    };
  }

  if (status === 'sending') {
    return {
      label: 'Enviando',
      tone: 'info' as const,
    };
  }

  if (status === 'error_permanent') {
    return {
      label: 'Erro permanente',
      tone: 'warning' as const,
    };
  }

  if (status === 'error_temporary') {
    return {
      label: 'Pendente reenvio',
      tone: 'warning' as const,
    };
  }

  return {
    label: 'Pendente',
    tone: 'error' as const,
  };
}

export function TransmissionStatusChip({
  status,
  serverAckStatus,
}: TransmissionStatusChipProps) {
  const styles = useThemedStyles(createStyles);
  const presentation = resolveStatusPresentation(status, serverAckStatus);

  return (
    <View
      style={[
        styles.base,
        presentation.tone === 'success'
          ? styles.success
          : presentation.tone === 'info'
            ? styles.info
            : presentation.tone === 'warning'
              ? styles.warning
              : styles.error,
      ]}
    >
      <Text style={styles.label}>{presentation.label}</Text>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    base: {
      borderRadius: radii.pill,
      borderWidth: 1,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xxs,
      alignSelf: 'flex-start',
    },
    success: {
      backgroundColor: theme.colors.badge.success.background,
      borderColor: theme.colors.badge.success.border,
    },
    info: {
      backgroundColor: theme.colors.badge.info.background,
      borderColor: theme.colors.badge.info.border,
    },
    warning: {
      backgroundColor: theme.colors.badge.warning.background,
      borderColor: theme.colors.badge.warning.border,
    },
    error: {
      backgroundColor: theme.colors.badge.error.background,
      borderColor: theme.colors.badge.error.border,
    },
    label: {
      ...typography.textStyles.caption,
      color: theme.colors.text.primary,
      fontSize: 10,
      lineHeight: 12,
      fontWeight: '700',
    },
  });
