import { Redirect } from 'expo-router';
import { ShowcaseScreen } from '@/src/features/showcase/components/showcase-screen';
import { useAuthStore } from '@/src/features/auth/store/use-auth-store';

export default function ShowcaseRoute() {
  const status = useAuthStore((state) => state.status);

  if (status !== 'authenticated') {
    return <Redirect href="/" />;
  }

  return <ShowcaseScreen />;
}
