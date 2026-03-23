import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { layout, radii, spacing, typography } from '@/src/theme/tokens';
import { useAppTheme, useThemedStyles } from '@/src/theme/theme-provider';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'warning';
type ButtonSize = 'sm' | 'md' | 'lg';

type VariantStyles = {
  container: ViewStyle;
  label: TextStyle;
  pressed?: ViewStyle;
};

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  sm: {
    minHeight: layout.buttonHeights.sm,
    paddingHorizontal: spacing.md,
  },
  md: {
    minHeight: layout.buttonHeights.md,
    paddingHorizontal: spacing.lg,
  },
  lg: {
    minHeight: layout.buttonHeights.lg,
    paddingHorizontal: spacing.xl,
  },
};

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  children?: ReactNode;
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  loading?: boolean;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
};

export function Button({
  children,
  label,
  variant = 'primary',
  size = 'md',
  block = false,
  loading = false,
  disabled,
  leftSlot,
  rightSlot,
  style,
  labelStyle,
  ...pressableProps
}: ButtonProps) {
  const { colors, isDark } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const variantStyles: Record<ButtonVariant, VariantStyles> = {
    primary: {
      container: {
        backgroundColor: colors.brand.primary,
        borderColor: colors.brand.primary,
      },
      label: {
        color: colors.text.onAccent,
      },
      pressed: {
        backgroundColor: colors.brand.primaryHover,
      },
    },
    secondary: {
      container: {
        backgroundColor: colors.background.surfaceLight,
        borderColor: colors.background.surfaceLight,
      },
      label: {
        color: colors.brand.primary,
      },
      pressed: {
        opacity: 0.92,
      },
    },
    ghost: {
      container: {
        backgroundColor: 'transparent',
        borderColor: colors.border.default,
      },
      label: {
        color: colors.text.primary,
      },
      pressed: {
        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(17,24,39,0.06)',
      },
    },
    warning: {
      container: {
        backgroundColor: colors.brand.secondary,
        borderColor: colors.brand.secondary,
      },
      label: {
        color: colors.text.onAccent,
      },
      pressed: {
        opacity: 0.92,
      },
    },
  };
  const isDisabled = disabled || loading;
  const tone = variantStyles[variant];
  const textContent =
    label ?? (typeof children === 'string' || typeof children === 'number' ? String(children) : null);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        tone.container,
        block && styles.block,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        pressed && !isDisabled && tone.pressed,
        style,
      ]}
      {...pressableProps}
    >
      {loading ? <ActivityIndicator color={tone.label.color ?? colors.text.onAccent} /> : null}
      {leftSlot ? <View style={styles.slot}>{leftSlot}</View> : null}
      {textContent ? (
        <Text style={[styles.label, tone.label, labelStyle]}>{textContent}</Text>
      ) : (
        children
      )}
      {rightSlot ? <View style={styles.slot}>{rightSlot}</View> : null}
    </Pressable>
  );
}

const createStyles = () => StyleSheet.create({
  base: {
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  block: {
    width: '100%',
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
  label: {
    ...typography.textStyles.button,
  },
  slot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
