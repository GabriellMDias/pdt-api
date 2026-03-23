import { StyleSheet, Text, View } from 'react-native';
import { OperationalEntryCardShell } from '@/src/features/shared/operational-entry/components/operational-entry-card-shell';
import {
  type TransmissionBadgeEntry,
} from '@/src/features/shared/operational-entry/components/transmission-status-badge';
import { useThemedStyles, type AppTheme } from '@/src/theme/theme-provider';

type MovementListEntry = TransmissionBadgeEntry & {
  reasonDescription: string;
  productId: number;
  productDescription: string;
  barcode: string | null;
  signedQuantity: number;
  totalQuantity: number;
  lastErrorMessage: string | null;
};

type MovementListItemProps<TEntry extends MovementListEntry> = {
  entry: TEntry;
  reasonLabel: string;
  deleteTitle?: string;
  deleteHelper?: string;
  onRemove: (entry: TEntry) => void;
};

function formatSignedQuantity(entry: MovementListEntry) {
  return entry.signedQuantity.toLocaleString('pt-BR', {
    minimumFractionDigits: entry.totalQuantity % 1 === 0 ? 0 : 3,
    maximumFractionDigits: 3,
  });
}

export function MovementListItem<TEntry extends MovementListEntry>({
  entry,
  reasonLabel,
  deleteTitle = 'Excluir lancamento',
  deleteHelper = 'Deslize para a direita para remover este lancamento.',
  onRemove,
}: MovementListItemProps<TEntry>) {
  const styles = useThemedStyles(createStyles);

  return (
    <OperationalEntryCardShell
      deleteHelper={deleteHelper}
      deleteTitle={deleteTitle}
      entry={entry}
      onDelete={onRemove}
    >
      <View>
        <Text style={styles.infoText}>
          {reasonLabel}: <Text style={styles.infoValue}>{entry.reasonDescription}</Text>
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
          Quantidade Coletada: <Text style={styles.infoValue}>{formatSignedQuantity(entry)}</Text>
        </Text>
        {entry.lastErrorMessage ? <Text style={styles.errorText}>{entry.lastErrorMessage}</Text> : null}
      </View>
    </OperationalEntryCardShell>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
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
