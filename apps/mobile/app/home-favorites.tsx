import { Redirect } from 'expo-router';
import { HomeFavoritesEditorScreen } from '@/src/features/home/components/home-favorites-editor-screen';
import { useAuthStore } from '@/src/features/auth/store/use-auth-store';

export default function HomeFavoritesRoute() {
  const status = useAuthStore((state) => state.status);

  if (status !== 'authenticated') {
    return <Redirect href="/" />;
  }

  return <HomeFavoritesEditorScreen />;
}
