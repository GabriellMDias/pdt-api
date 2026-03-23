import { Redirect } from 'expo-router';
import { SettingsScreen } from '@/src/features/settings/components/settings-screen';
import { useAuthStore } from '@/src/features/auth/store/use-auth-store';

export default function SettingsRoute() {
  const status = useAuthStore((state) => state.status);

  if (status !== 'authenticated') {
    return <Redirect href="/" />;
  }

  return <SettingsScreen />;
}
