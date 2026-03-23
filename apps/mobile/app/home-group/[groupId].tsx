import { Redirect, useLocalSearchParams } from 'expo-router';
import { HomeGroupScreen } from '@/src/features/home/components/home-group-screen';
import { useAuthStore } from '@/src/features/auth/store/use-auth-store';

function parseGroupId(rawValue: string | string[] | undefined) {
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function HomeGroupRoute() {
  const status = useAuthStore((state) => state.status);
  const params = useLocalSearchParams<{ groupId?: string | string[] }>();
  const groupId = parseGroupId(params.groupId);

  if (status !== 'authenticated') {
    return <Redirect href="/" />;
  }

  if (!groupId) {
    return <Redirect href="/home" />;
  }

  return <HomeGroupScreen groupId={groupId} />;
}
