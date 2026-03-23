import { Redirect } from 'expo-router';
import { useAuthStore } from '@/src/features/auth/store/use-auth-store';
import { BalancoScreen } from '@/src/features/balanco/components/balanco-screen';

export default function BalancoRoute() {
  const status = useAuthStore((state) => state.status);

  if (status !== 'authenticated') {
    return <Redirect href="/" />;
  }

  return <BalancoScreen />;
}
