import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { OperationalEntryCardShell } from '@/src/features/shared/operational-entry/components/operational-entry-card-shell';
import type { LocalBalancoGroup } from '@/src/features/balanco/types';
import { formatBalanceStatus } from '@/src/features/balanco/utils';
import { useAppTheme, useThemedStyles, type AppTheme } from '@/src/theme/theme-provider';
import { spacing, typography } from '@/src/theme/tokens';

type BalancoGroupListItemProps = {
  group: LocalBalancoGroup;
  onPress: (group: LocalBalancoGroup) => void;
  onRemove: (group: LocalBalancoGroup) => void;
};

function formatEntriesSummary(group: LocalBalancoGroup) {
  return `${group.notTransmittedEntries} pendente(s) - ${group.totalEntries} coletado(s)`;
}

export function BalancoGroupListItem({
  group,
  onPress,
  onRemove,
}: BalancoGroupListItemProps) {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <OperationalEntryCardShell
      deleteHelper="Deslize para a direita para excluir os lancamentos locais deste balanco."
      deleteTitle="Excluir balanco local"
      entry={group}
      onDelete={onRemove}
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          onPress(group);
        }}
        style={({ pressed }) => [styles.pressable, pressed && styles.pressablePressed]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Balanco {group.balanceId}</Text>
            <Text style={styles.title}>{group.balanceDescription}</Text>
            <Text style={styles.subtitle}>Estoque: {group.stockLabel}</Text>
          </View>

          <Feather color={theme.colors.text.muted} name="chevron-right" size={18} />
        </View>

        <View style={styles.metricsRow}>
          <Text style={styles.infoText}>
            Status: <Text style={styles.infoValue}>{formatBalanceStatus(group.statusCode)}</Text>
          </Text>
          <Text style={styles.infoText}>
            Pendentes: <Text style={styles.infoValue}>{group.notTransmittedEntries}</Text>
          </Text>
          <Text style={styles.infoText}>
            Coletados: <Text style={styles.infoValue}>{group.totalEntries}</Text>
          </Text>
        </View>

        <Text style={styles.footer}>
          {formatEntriesSummary(group)}
          {group.lastEntryCreatedAt
            ? ` - Ultimo em ${new Date(group.lastEntryCreatedAt).toLocaleString('pt-BR')}`
            : ''}
        </Text>
      </Pressable>
    </OperationalEntryCardShell>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    pressable: {
      gap: spacing.sm,
    },
    pressablePressed: {
      opacity: 0.96,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.md,
      alignItems: 'flex-start',
    },
    headerCopy: {
      flex: 1,
      gap: spacing.xxs,
    },
    eyebrow: {
      ...typography.textStyles.caption,
      color: theme.colors.brand.primaryStrong,
      textTransform: 'uppercase',
    },
    title: {
      ...typography.textStyles.bodyStrong,
      color: theme.colors.text.primary,
    },
    subtitle: {
      ...typography.textStyles.caption,
      color: theme.colors.text.secondary,
    },
    metricsRow: {
      gap: spacing.xxs,
    },
    infoText: {
      fontSize: 10,
      lineHeight: 14,
      color: theme.colors.text.muted,
      marginBottom: 2,
    },
    infoValue: {
      color: theme.colors.text.primary,
    },
    footer: {
      ...typography.textStyles.caption,
      color: theme.colors.text.muted,
    },
  });
