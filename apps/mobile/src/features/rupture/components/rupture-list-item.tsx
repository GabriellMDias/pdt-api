import { StyleSheet, Text, View } from 'react-native';
import { SwipeDeleteCard } from '@/src/features/shared/operational-entry/components/swipe-delete-card';
import { TransmissionStatusBadge } from '@/src/features/shared/operational-entry/components/transmission-status-badge';
import type { LocalRuptureEntry } from '@/src/features/rupture/types';
import { useThemedStyles, type AppTheme } from '@/src/theme/theme-provider';

type RuptureListItemProps = {
  entry: LocalRuptureEntry;
  onRemove: (entry: LocalRuptureEntry) => void;
};

export function RuptureListItem({ entry, onRemove }: RuptureListItemProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <SwipeDeleteCard
      deleteHelper="Deslize para a direita para remover este item."
      deleteTitle="Excluir coleta"
      onDelete={() => {
        onRemove(entry);
      }}
    >
      <View style={styles.container}>
        <View style={styles.contentWrap}>
          <View style={styles.dataSection}>
            <Text style={styles.infoText}>
              Prateleira: <Text style={styles.infoValue}>{entry.shelfCode}</Text>
            </Text>
            <Text style={styles.infoText}>
              Codigo Interno: <Text style={styles.infoValue}>{entry.productId}</Text>
            </Text>
            <Text style={styles.infoText}>
              Produto: <Text style={styles.infoValue}>{entry.productDescription}</Text>
            </Text>
            <Text style={styles.infoText}>
              Codigo de Barras:{' '}
              <Text style={styles.infoValue}>{entry.barcode?.trim() ? entry.barcode : '-'}</Text>
            </Text>
            <Text style={styles.infoText}>
              Coleta: <Text style={styles.infoValue}>{new Date(entry.createdAt).toLocaleString()}</Text>
            </Text>
            {entry.lastErrorMessage ? (
              <Text style={styles.errorText}>{entry.lastErrorMessage}</Text>
            ) : null}
          </View>

          <TransmissionStatusBadge entry={entry} />
        </View>
      </View>
    </SwipeDeleteCard>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    minHeight: 150,
    borderColor: theme.colors.border.default,
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  contentWrap: {
    minHeight: 150,
    flexDirection: 'row',
  },
  dataSection: {
    flex: 1,
    backgroundColor: theme.colors.background.surfaceAlt,
    justifyContent: 'center',
    paddingLeft: 12,
    paddingRight: 44,
    paddingVertical: 14,
    borderRightColor: theme.colors.border.default,
    borderRightWidth: 1,
  },
  infoText: {
    fontSize: 10,
    lineHeight: 14,
    color: theme.colors.text.muted,
    marginBottom: 3,
  },
  infoValue: {
    color: theme.colors.text.primary,
  },
  errorText: {
    marginTop: 6,
    fontSize: 10,
    lineHeight: 14,
    color: theme.colors.badge.error.text,
  },
});
