import { Redirect } from 'expo-router';
import { useAuthStore } from '@/src/features/auth/store/use-auth-store';
import { ConsumoScreen } from '@/src/features/consumo/components/consumo-screen';

export default function ConsumoRoute() {
  const status = useAuthStore((state) => state.status);

  if (status !== 'authenticated') {
    return <Redirect href="/" />;
  }

  return <ConsumoScreen />;
}
