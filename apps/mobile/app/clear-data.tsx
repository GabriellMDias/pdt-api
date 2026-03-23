import { Redirect } from 'expo-router';
import { useAuthStore } from '@/src/features/auth/store/use-auth-store';
import { ClearDataScreen } from '@/src/features/clear-data/components/clear-data-screen';

export default function ClearDataRoute() {
  const status = useAuthStore((state) => state.status);

  if (status !== 'authenticated') {
    return <Redirect href="/" />;
  }

  return <ClearDataScreen />;
}
