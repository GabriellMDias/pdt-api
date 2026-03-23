import { StyleSheet, Text, View } from 'react-native';
import { OperationalEntryCardShell } from '@/src/features/shared/operational-entry/components/operational-entry-card-shell';
import type { LocalProducaoEntry } from '@/src/features/producao/types';
import { useThemedStyles, type AppTheme } from '@/src/theme/theme-provider';

type ProducaoListItemProps = {
  entry: LocalProducaoEntry;
  onRemove: (entry: LocalProducaoEntry) => void;
};

function formatProducedQuantity(value: number) {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 3,
    maximumFractionDigits: 3,
  });
}

export function ProducaoListItem({ entry, onRemove }: ProducaoListItemProps) {
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
          Receita: <Text style={styles.infoValue}>{entry.recipeDescription}</Text>
        </Text>
        <Text style={styles.infoText}>
          Codigo Interno: <Text style={styles.infoValue}>{entry.productId}</Text>
        </Text>
        <Text style={styles.infoText}>
          Produto: <Text style={styles.infoValue}>{entry.productDescription}</Text>
        </Text>
        <Text style={styles.infoText}>
          Quantidade Produzida:{' '}
          <Text style={styles.infoValue}>{formatProducedQuantity(entry.quantityInput)}</Text>
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
