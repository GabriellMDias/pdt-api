import { Redirect } from 'expo-router';
import { useAuthStore } from '@/src/features/auth/store/use-auth-store';
import { BalancoItemsScreen } from '@/src/features/balanco/components/balanco-items-screen';

export default function BalancoItemsRoute() {
  const status = useAuthStore((state) => state.status);

  if (status !== 'authenticated') {
    return <Redirect href="/" />;
  }

  return <BalancoItemsScreen />;
}
