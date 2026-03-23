import { Entypo } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import { useThemedStyles, type AppTheme } from '@/src/theme/theme-provider';

export function OperationalFab({ onPress }: { onPress: () => void }) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <Entypo color="white" name="plus" size={40} />
    </Pressable>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  button: {
    position: 'absolute',
    right: 2,
    bottom: 46,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.brand.primary,
    borderColor: theme.isDark ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.48)',
    borderWidth: 2,
    zIndex: 10,
    elevation: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },
  buttonPressed: {
    opacity: 0.88,
  },
});
