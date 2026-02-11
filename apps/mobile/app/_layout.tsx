import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import 'react-native-reanimated';
import { colors } from '@/src/theme/tokens';
import { useAuthStore } from '@/src/features/auth/store/use-auth-store';

export default function RootLayout() {
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const startNetworkMonitor = useAuthStore((state) => state.startNetworkMonitor);
  const stopNetworkMonitor = useAuthStore((state) => state.stopNetworkMonitor);
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    void bootstrap();
    void startNetworkMonitor();

    return () => {
      stopNetworkMonitor();
    };
  }, [bootstrap, startNetworkMonitor, stopNetworkMonitor]);

  if (status === 'bootstrapping') {
    return (
      <View style={styles.bootContainer}>
        <ActivityIndicator color={colors.surfaceLight} size="large" />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="home" />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}

const styles = StyleSheet.create({
  bootContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgDark,
  },
});
