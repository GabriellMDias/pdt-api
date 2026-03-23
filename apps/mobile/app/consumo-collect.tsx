import { Redirect } from 'expo-router';
import { useAuthStore } from '@/src/features/auth/store/use-auth-store';
import { ConsumoCollectScreen } from '@/src/features/consumo/components/consumo-collect-screen';

export default function ConsumoCollectRoute() {
  const status = useAuthStore((state) => state.status);

  if (status !== 'authenticated') {
    return <Redirect href="/" />;
  }

  return <ConsumoCollectScreen />;
}
