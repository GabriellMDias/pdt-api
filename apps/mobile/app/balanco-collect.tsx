import { Redirect } from 'expo-router';
import { useAuthStore } from '@/src/features/auth/store/use-auth-store';
import { BalancoCollectScreen } from '@/src/features/balanco/components/balanco-collect-screen';

export default function BalancoCollectRoute() {
  const status = useAuthStore((state) => state.status);

  if (status !== 'authenticated') {
    return <Redirect href="/" />;
  }

  return <BalancoCollectScreen />;
}
