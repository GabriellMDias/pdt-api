import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAppTheme, useThemedStyles, type AppTheme } from '@/src/theme/theme-provider';

export function AppLoadingIndicator() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <View style={styles.orb}>
        <ActivityIndicator color={colors.brand.primary} size="large" />
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background.app,
    },
    orb: {
      width: 88,
      height: 88,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border.subtle,
      backgroundColor: theme.colors.background.surfaceAlt,
    },
  });
