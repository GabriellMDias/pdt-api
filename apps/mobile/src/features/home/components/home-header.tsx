import { Entypo, Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { spacing, typography } from '@/src/theme/tokens';
import { useAppTheme, useThemedStyles, type AppTheme } from '@/src/theme/theme-provider';

type HomeHeaderProps = {
  title: string;
  leading: 'menu' | 'back';
  onLeadingPress: () => void;
};

export function HomeHeader({ title, leading, onLeadingPress }: HomeHeaderProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <Pressable accessibilityRole="button" hitSlop={10} onPress={onLeadingPress} style={styles.iconButton}>
        {leading === 'menu' ? (
          <Entypo color={colors.text.onAccent} name="menu" size={30} />
        ) : (
          <Ionicons color={colors.text.onAccent} name="chevron-back" size={28} />
        )}
      </Pressable>

      <Text numberOfLines={1} style={styles.title}>
        {title}
      </Text>

      <View style={styles.trailingSpacer} />
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    minHeight: 56,
    backgroundColor: theme.colors.brand.primary,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    ...typography.textStyles.bodyStrong,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    color: theme.colors.text.onAccent,
    marginHorizontal: spacing.sm,
  },
  trailingSpacer: {
    width: 40,
    height: 40,
  },
});
