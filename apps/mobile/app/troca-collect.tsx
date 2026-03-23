import { Redirect } from 'expo-router';
import { useAuthStore } from '@/src/features/auth/store/use-auth-store';
import { TrocaCollectScreen } from '@/src/features/troca/components/troca-collect-screen';

export default function TrocaCollectRoute() {
  const status = useAuthStore((state) => state.status);

  if (status !== 'authenticated') {
    return <Redirect href="/" />;
  }

  return <TrocaCollectScreen />;
}
