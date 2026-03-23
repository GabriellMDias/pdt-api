import { AntDesign } from '@expo/vector-icons';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { HomeNavigationGroup } from '@/src/features/home/types';
import { radii, spacing, typography } from '@/src/theme/tokens';
import { useAppTheme, useThemedStyles, type AppTheme } from '@/src/theme/theme-provider';

type HomeBottomActionsProps = {
  open: boolean;
  animation: Animated.Value;
  sheetHeight: number;
  groups: HomeNavigationGroup[];
  selectedGroupId: number;
  onToggle: () => void;
  onSelectGroup: (groupId: number) => void;
};

export function HomeBottomActions({
  open,
  animation,
  sheetHeight,
  groups,
  selectedGroupId,
  onToggle,
  onSelectGroup,
}: HomeBottomActionsProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [sheetHeight - 58, 0],
  });

  return (
    <Animated.View style={[styles.container, { height: sheetHeight, transform: [{ translateY }] }]}>
      <Pressable accessibilityRole="button" onPress={onToggle} style={styles.menuButton}>
        <Text style={styles.menuText}>MENU</Text>
        <AntDesign color={colors.text.onAccent} name={open ? 'down' : 'up'} size={24} />
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.itemsContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.itemsScroll}
      >
        {groups.map((group) => {
          const selected = group.id === selectedGroupId;

          return (
            <View key={group.id} style={styles.itemContainer}>
              <Pressable
                accessibilityRole="button"
                onPress={() => onSelectGroup(group.id)}
                style={({ pressed }) => [
                  styles.itemButton,
                  selected && styles.itemButtonSelected,
                  pressed && styles.itemButtonPressed,
                ]}
              >
                <View style={styles.itemRow}>
                  {group.renderIcon(20, colors.text.onAccent)}
                  <Text style={styles.itemLabel}>{group.label}</Text>
                </View>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.brand.primary,
    alignItems: 'center',
    zIndex: 20,
  },
  menuButton: {
    position: 'absolute',
    top: -20,
    width: 100,
    height: 80,
    borderRadius: 50,
    backgroundColor: theme.colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    zIndex: 2,
  },
  menuText: {
    ...typography.textStyles.label,
    color: theme.colors.text.onAccent,
  },
  itemsScroll: {
    width: '75%',
    marginTop: 60,
  },
  itemsContent: {
    paddingBottom: spacing.xl,
  },
  itemContainer: {
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: theme.isDark ? '#888888' : 'rgba(255,255,255,0.35)',
  },
  itemButton: {
    height: 35,
    borderRadius: radii.lg,
    justifyContent: 'center',
  },
  itemButtonPressed: {
    opacity: 0.9,
  },
  itemButtonSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: '25%',
    gap: spacing.md,
  },
  itemLabel: {
    ...typography.textStyles.title,
    color: theme.colors.text.onAccent,
    fontSize: 20,
    lineHeight: 28,
  },
});
