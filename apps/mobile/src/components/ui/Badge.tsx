import { Children, type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { radii, spacing, typography } from '@/src/theme/tokens';
import { useAppTheme, useThemedStyles } from '@/src/theme/theme-provider';

type BadgeVariant = 'neutral' | 'success' | 'info' | 'warning' | 'error' | 'accent';

export type BadgeProps = {
  children: ReactNode;
  variant?: BadgeVariant;
  style?: StyleProp<ViewStyle>;
};

function renderBadgeChildren(children: ReactNode, textColor: string) {
  const nodes = Children.toArray(children).filter(
    (node) => node !== null && node !== undefined && typeof node !== 'boolean',
  );

  if (nodes.length === 0) {
    return null;
  }

  if (nodes.every((node) => typeof node === 'string' || typeof node === 'number')) {
    return <Text style={[typography.textStyles.label, { color: textColor }]}>{nodes.join('')}</Text>;
  }

  return nodes.map((node, index) =>
    typeof node === 'string' || typeof node === 'number' ? (
      <Text key={`badge-text-${index}`} style={[typography.textStyles.label, { color: textColor }]}>
        {node}
      </Text>
    ) : (
      node
    ),
  );
}

export function Badge({ children, variant = 'neutral', style }: BadgeProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const variantStyles = {
    neutral: colors.badge.neutral,
    success: colors.badge.success,
    info: colors.badge.info,
    warning: colors.badge.warning,
    error: colors.badge.error,
    accent: colors.badge.accent,
  } as const;
  const tone = variantStyles[variant];

  return (
    <View style={[styles.base, { backgroundColor: tone.background, borderColor: tone.border }, style]}>
      {renderBadgeChildren(children, tone.text)}
    </View>
  );
}

const createStyles = () => StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  label: {
    ...typography.textStyles.label,
  },
});
