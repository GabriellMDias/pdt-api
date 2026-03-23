import { forwardRef, type ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { layout, radii, spacing, typography } from '@/src/theme/tokens';
import { useAppTheme, useThemedStyles, type AppTheme } from '@/src/theme/theme-provider';

export type InputProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  helperText?: string;
  errorText?: string;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    helperText,
    errorText,
    leftSlot,
    rightSlot,
    containerStyle,
    inputStyle,
    onBlur,
    onFocus,
    ...textInputProps
  },
  ref,
) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const hasLeftSlot = leftSlot !== undefined && leftSlot !== null;
  const hasRightSlot = rightSlot !== undefined && rightSlot !== null;

  return (
    <View style={[styles.field, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={[styles.inputShell, errorText && styles.inputShellError]}>
        {leftSlot ? <View style={styles.slot}>{leftSlot}</View> : null}

        <TextInput
          ref={ref}
          placeholderTextColor={textInputProps.placeholderTextColor ?? colors.text.placeholder}
          style={[styles.input, (hasLeftSlot || hasRightSlot) && styles.inputWithSlot, inputStyle]}
          onBlur={onBlur}
          onFocus={onFocus}
          {...textInputProps}
        />

        {rightSlot ? <View style={styles.slot}>{rightSlot}</View> : null}
      </View>

      {helperText || errorText ? (
        <Text style={[styles.helperText, errorText && styles.helperTextError]}>
          {errorText ?? helperText}
        </Text>
      ) : null}
    </View>
  );
});

const createStyles = (theme: AppTheme) => StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  label: {
    ...typography.textStyles.label,
    color: theme.colors.text.primary,
  },
  inputShell: {
    minHeight: layout.inputMinHeight,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    backgroundColor: theme.colors.background.surfaceMuted,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  inputShellError: {
    borderColor: theme.colors.status.error,
  },
  input: {
    ...typography.textStyles.body,
    color: theme.colors.text.primary,
    flex: 1,
    minHeight: layout.inputMinHeight,
  },
  inputWithSlot: {
    minHeight: layout.inputMinHeight - spacing.sm,
  },
  slot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperText: {
    ...typography.textStyles.caption,
    color: theme.colors.text.muted,
  },
  helperTextError: {
    color: theme.colors.badge.error.text,
  },
});
