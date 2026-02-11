import { Redirect } from 'expo-router';
import { HomeScreen } from '@/src/features/auth/components/home-screen';
import { useAuthStore } from '@/src/features/auth/store/use-auth-store';

export default function HomeRoute() {
  const status = useAuthStore((state) => state.status);

  if (status !== 'authenticated') {
    return <Redirect href="/" />;
  }

  return <HomeScreen />;
}
