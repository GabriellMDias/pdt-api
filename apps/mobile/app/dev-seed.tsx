import { Redirect } from 'expo-router';
import { useAuthStore } from '@/src/features/auth/store/use-auth-store';
import { DEV_LOCAL_SEED_ENABLED } from '@/src/features/dev-seed/config';

export default function DevSeedRoute() {
  const status = useAuthStore((state) => state.status);

  if (!DEV_LOCAL_SEED_ENABLED) {
    return <Redirect href="/settings" />;
  }

  if (status !== 'authenticated') {
    return <Redirect href="/" />;
  }

  return <Redirect href="/debug-performance" />;
}
