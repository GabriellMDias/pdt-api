import { Redirect } from 'expo-router';
import { useAuthStore } from '@/src/features/auth/store/use-auth-store';
import { RuptureScreen } from '@/src/features/rupture/components/rupture-screen';

export default function RuptureRoute() {
  const status = useAuthStore((state) => state.status);

  if (status !== 'authenticated') {
    return <Redirect href="/" />;
  }

  return <RuptureScreen />;
}
