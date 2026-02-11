import { Redirect } from 'expo-router';
import { LoginScreen } from '@/src/features/auth/components/login-screen';
import { useAuthStore } from '@/src/features/auth/store/use-auth-store';

export default function IndexRoute() {
  const status = useAuthStore((state) => state.status);

  if (status === 'authenticated') {
    return <Redirect href="/home" />;
  }

  return <LoginScreen />;
}
