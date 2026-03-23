import { Redirect } from 'expo-router';
import { useAuthStore } from '@/src/features/auth/store/use-auth-store';
import { RuptureCollectScreen } from '@/src/features/rupture/components/rupture-collect-screen';

export default function RuptureCollectRoute() {
  const status = useAuthStore((state) => state.status);

  if (status !== 'authenticated') {
    return <Redirect href="/" />;
  }

  return <RuptureCollectScreen />;
}
