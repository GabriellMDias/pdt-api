import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { OperationalEntryCardShell } from '@/src/features/shared/operational-entry/components/operational-entry-card-shell';
import { formatSignedQuantity } from '@/src/features/balanco/utils';
import type { LocalBalancoEntry } from '@/src/features/balanco/types';
import { useThemedStyles, type AppTheme } from '@/src/theme/theme-provider';

type BalancoEntryListItemProps = {
  entry: LocalBalancoEntry;
  onRemove: (entry: LocalBalancoEntry) => void;
};

const movementLabels: Record<LocalBalancoEntry['movementType'], string> = {
  add: 'Adicionar',
  remove: 'Remover',
};

export const BalancoEntryListItem = memo(function BalancoEntryListItem({
  entry,
  onRemove,
}: BalancoEntryListItemProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <OperationalEntryCardShell
      deleteHelper="Deslize para a direita para remover este lancamento."
      deleteTitle="Excluir lancamento"
      entry={entry}
      onDelete={onRemove}
    >
      <View>
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
          Movimento: <Text style={styles.infoValue}>{movementLabels[entry.movementType]}</Text>
        </Text>
        <Text style={styles.infoText}>
          Quantidade: <Text style={styles.infoValue}>{formatSignedQuantity(entry.quantityInput)}</Text>
        </Text>
        <Text style={styles.infoText}>
          Embalagem: <Text style={styles.infoValue}>{formatSignedQuantity(entry.packageCount)}</Text>
        </Text>
        <Text style={styles.infoText}>
          Total: <Text style={styles.infoValue}>{formatSignedQuantity(entry.signedQuantity)}</Text>
        </Text>
        {entry.lastErrorMessage ? <Text style={styles.errorText}>{entry.lastErrorMessage}</Text> : null}
      </View>
    </OperationalEntryCardShell>
  );
});

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
