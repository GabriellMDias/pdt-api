import { type RefObject } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppTheme, useThemedStyles, type AppTheme } from '@/src/theme/theme-provider';
import { radii, spacing, typography } from '@/src/theme/tokens';

type MovementMetricFieldProps = {
  label: string;
  value: string;
  editable?: boolean;
  keyboardType?: 'number-pad' | 'numeric' | 'decimal-pad';
  onChangeText?: (value: string) => void;
  onSubmitEditing?: () => void;
  inputRef?: RefObject<TextInput | null>;
};

export function MovementMetricField({
  label,
  value,
  editable = true,
  keyboardType = 'number-pad',
  onChangeText,
  onSubmitEditing,
  inputRef,
}: MovementMetricFieldProps) {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.metricField}>
      <Text style={styles.metricLabel}>{label}</Text>
      <TextInput
        ref={inputRef}
        editable={editable}
        keyboardType={keyboardType}
        placeholder={label}
        placeholderTextColor={
          editable ? theme.colors.text.placeholder : theme.colors.text.muted
        }
        style={[
          styles.metricInput,
          editable ? styles.metricInputEditable : styles.metricInputReadonly,
        ]}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
      />
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    metricField: {
      flex: 1,
      gap: spacing.xxs,
    },
    metricLabel: {
      ...typography.textStyles.caption,
      color: theme.colors.text.primary,
    },
    metricInput: {
      height: 56,
      borderRadius: radii.md,
      paddingHorizontal: spacing.sm,
      color: theme.colors.text.primary,
      fontSize: 15,
    },
    metricInputEditable: {
      borderWidth: 2,
      borderColor: theme.colors.border.strong,
      backgroundColor: theme.colors.background.surface,
    },
    metricInputReadonly: {
      borderWidth: 1,
      borderColor: theme.colors.border.default,
      backgroundColor: theme.colors.background.surfaceMuted,
      color: theme.colors.text.muted,
    },
  });
