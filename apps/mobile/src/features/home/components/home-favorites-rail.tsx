import { AntDesign } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getHomeNavigationItemByKey } from '@/src/features/home/home-navigation';
import type { HomeFavoriteShortcut } from '@/src/features/home/types';
import { radii, spacing, typography } from '@/src/theme/tokens';
import { useAppTheme, useThemedStyles, type AppTheme } from '@/src/theme/theme-provider';

type HomeFavoritesRailProps = {
  shortcuts: HomeFavoriteShortcut[];
  loading?: boolean;
  onShortcutPress: (itemKey: string) => void;
  onAddPress: () => void;
};

export function HomeFavoritesRail({
  shortcuts,
  loading = false,
  onShortcutPress,
  onAddPress,
}: HomeFavoritesRailProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingState}>
          <ActivityIndicator color="#888888" size="small" />
          <Text style={styles.emptyText}>Carregando favoritos...</Text>
        </View>
      </View>
    );
  }

  if (shortcuts.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Sem favoritos configurados</Text>
          <Pressable
            accessibilityRole="button"
            onPress={onAddPress}
            style={({ pressed }) => [styles.emptyAction, pressed && styles.favoriteCardPressed]}
          >
            <View style={styles.favoriteCircleAdd}>
              <AntDesign color={colors.text.muted} name="plus" size={40} />
            </View>
          </Pressable>
          <Text style={styles.emptyHint}>Toque no + para escolher os atalhos da Home.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        horizontal
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
      >
        {shortcuts.map((shortcut) => {
          const target = getHomeNavigationItemByKey(shortcut.itemKey)?.item;
          if (!target) return null;

          return (
            <Pressable
              key={shortcut.key}
              accessibilityRole="button"
              onPress={() => onShortcutPress(shortcut.itemKey)}
              style={({ pressed }) => [styles.favoriteCard, pressed && styles.favoriteCardPressed]}
            >
              <View style={styles.favoriteCircle}>{target.renderIcon(38, colors.text.muted)}</View>
              <Text numberOfLines={2} style={styles.favoriteLabel}>
                {shortcut.label}
              </Text>
            </Pressable>
          );
        })}

        <Pressable
          accessibilityRole="button"
          onPress={onAddPress}
          style={({ pressed }) => [styles.favoriteCard, pressed && styles.favoriteCardPressed]}
        >
          <View style={styles.favoriteCircleAdd}>
            <AntDesign color={colors.text.muted} name="plus" size={40} />
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    backgroundColor: theme.isDark ? '#373737' : theme.colors.background.surfaceMuted,
    paddingVertical: spacing.xs,
  },
  loadingState: {
    minHeight: 112,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyState: {
    minHeight: 112,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyAction: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.textStyles.caption,
    color: theme.colors.text.primary,
    fontWeight: '700',
  },
  emptyHint: {
    ...typography.textStyles.caption,
    color: theme.colors.text.muted,
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xs,
  },
  favoriteCard: {
    width: 80,
    margin: 10,
    alignItems: 'center',
    gap: spacing.xs,
  },
  favoriteCardPressed: {
    opacity: 0.88,
  },
  favoriteCircle: {
    width: 80,
    height: 80,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(17,24,39,0.03)',
  },
  favoriteCircleAdd: {
    width: 80,
    height: 80,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteLabel: {
    ...typography.textStyles.label,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '500',
    color: theme.colors.text.primary,
    textAlign: 'center',
    textTransform: 'uppercase',
    minHeight: 24,
  },
});
