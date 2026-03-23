import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge } from '@/src/components/ui';
import type { HomeNavigationItem } from '@/src/features/home/types';
import { useAppTheme, useThemedStyles, type AppTheme } from '@/src/theme/theme-provider';
import { radii, spacing, typography } from '@/src/theme/tokens';

type HomeMenuCardProps = {
  item: HomeNavigationItem;
  onPress: () => void;
};

export function HomeMenuCard({ item, onPress }: HomeMenuCardProps) {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.iconShell}>{item.renderIcon(26, theme.colors.text.onAccent)}</View>

      <Text numberOfLines={2} style={styles.title}>
        {item.label}
      </Text>

      <Badge variant={item.status === 'available' ? 'success' : 'warning'}>
        {item.status === 'available' ? 'Disponivel' : 'Pendente'}
      </Badge>
    </Pressable>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 138,
    backgroundColor: theme.colors.background.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderRadius: radii.lg,
    padding: spacing.md,
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
    backgroundColor: theme.isDark ? '#3C3C37' : theme.colors.background.surfaceMuted,
  },
  iconShell: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.textStyles.bodyStrong,
    color: theme.colors.text.primary,
    minHeight: 44,
  },
});
