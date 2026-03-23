import { FontAwesome } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme, useThemedStyles, type AppTheme } from '@/src/theme/theme-provider';
import { spacing, typography } from '@/src/theme/tokens';
import type { StockMovementType } from '@/src/features/shared/stock-movement/types';

type MovementTypeToggleProps = {
  value: StockMovementType;
  onChange: (value: StockMovementType) => void;
  addLabel?: string;
  removeLabel?: string;
};

export function MovementTypeToggle({
  value,
  onChange,
  addLabel = 'Adicionar',
  removeLabel = 'Remover',
}: MovementTypeToggleProps) {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <Pressable onPress={() => onChange('add')} style={styles.option}>
        <FontAwesome
          color={theme.colors.brand.primaryStrong}
          name={value === 'add' ? 'dot-circle-o' : 'circle-o'}
          size={22}
        />
        <Text style={styles.optionLabel}>{addLabel}</Text>
      </Pressable>

      <Pressable onPress={() => onChange('remove')} style={styles.option}>
        <FontAwesome
          color={theme.colors.brand.primaryStrong}
          name={value === 'remove' ? 'dot-circle-o' : 'circle-o'}
          size={22}
        />
        <Text style={styles.optionLabel}>{removeLabel}</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-evenly',
      gap: spacing.lg,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    optionLabel: {
      ...typography.textStyles.body,
      color: theme.colors.text.secondary,
    },
  });
