import { Redirect } from 'expo-router';
import { useAuthStore } from '@/src/features/auth/store/use-auth-store';
import { TrocaScreen } from '@/src/features/troca/components/troca-screen';

export default function TrocaRoute() {
  const status = useAuthStore((state) => state.status);

  if (status !== 'authenticated') {
    return <Redirect href="/" />;
  }

  return <TrocaScreen />;
}
