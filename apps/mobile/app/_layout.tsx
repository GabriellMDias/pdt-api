import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { useAuthStore } from '@/src/features/auth/store/use-auth-store';
import { AppLoadingIndicator } from '@/src/features/bootstrap/components/app-loading-indicator';
import {
  AppThemeProvider,
  useAppTheme,
} from '@/src/theme/theme-provider';
import { AppUpdateCoordinator } from '@/src/features/app-update/components/app-update-coordinator';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={rootStyles.gestureRoot}>
      <AppThemeProvider>
        <RootNavigation />
      </AppThemeProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigation() {
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const startNetworkMonitor = useAuthStore((state) => state.startNetworkMonitor);
  const stopNetworkMonitor = useAuthStore((state) => state.stopNetworkMonitor);
  const status = useAuthStore((state) => state.status);
  const { isDark } = useAppTheme();

  useEffect(() => {
    void bootstrap();
    void startNetworkMonitor();

    return () => {
      stopNetworkMonitor();
    };
  }, [bootstrap, startNetworkMonitor, stopNetworkMonitor]);

  if (status === 'bootstrapping') {
    return (
      <>
        <AppLoadingIndicator />
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="home" />
        <Stack.Screen name="home-favorites" />
        <Stack.Screen name="home-group/[groupId]" />
        <Stack.Screen name="menu-placeholder" />
        <Stack.Screen name="clear-data" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="balanco" />
        <Stack.Screen name="balanco-items" />
        <Stack.Screen name="balanco-collect" />
        <Stack.Screen name="balanco-scan" />
        <Stack.Screen name="producao" />
        <Stack.Screen name="consumo" />
        <Stack.Screen name="consumo-collect" />
        <Stack.Screen name="consumo-scan" />
        <Stack.Screen name="troca" />
        <Stack.Screen name="troca-collect" />
        <Stack.Screen name="troca-scan" />
        <Stack.Screen name="rupture" />
        <Stack.Screen name="rupture-collect" />
        <Stack.Screen name="rupture-scan" />
        <Stack.Screen name="showcase" />
      </Stack>
      <AppUpdateCoordinator />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

const rootStyles = {
  gestureRoot: {
    flex: 1,
  },
};
