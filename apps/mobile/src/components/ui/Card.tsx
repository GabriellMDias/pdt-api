import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { radii, spacing } from '@/src/theme/tokens';
import { useAppTheme, useThemedStyles } from '@/src/theme/theme-provider';

type CardVariant = 'default' | 'muted' | 'accent';

export type CardProps = PropsWithChildren<{
  variant?: CardVariant;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export function Card({ children, variant = 'default', padded = true, style }: CardProps) {
  const { colors, isDark } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const variantStyles: Record<CardVariant, ViewStyle> = {
    default: {
      backgroundColor: colors.background.surfaceAlt,
      borderColor: colors.border.default,
    },
    muted: {
      backgroundColor: colors.background.surface,
      borderColor: colors.border.subtle,
    },
    accent: {
      backgroundColor: colors.background.accent,
      borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.16)',
    },
  };

  return <View style={[styles.base, variantStyles[variant], padded && styles.padded, style]}>{children}</View>;
}

const createStyles = () => StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  padded: {
    padding: spacing.lg,
  },
});
