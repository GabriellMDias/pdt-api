import { Redirect, useLocalSearchParams } from 'expo-router';
import { HomePlaceholderScreen } from '@/src/features/home/components/home-placeholder-screen';
import { useAuthStore } from '@/src/features/auth/store/use-auth-store';

export default function MenuPlaceholderRoute() {
  const status = useAuthStore((state) => state.status);
  const params = useLocalSearchParams<{ title?: string; description?: string }>();

  if (status !== 'authenticated') {
    return <Redirect href="/" />;
  }

  const title = typeof params.title === 'string' && params.title.length > 0 ? params.title : 'Em breve';
  const description =
    typeof params.description === 'string' && params.description.length > 0
      ? params.description
      : 'Essa opcao da Home antiga ainda nao recebeu implementacao na arquitetura nova.';

  return <HomePlaceholderScreen description={description} title={title} />;
}
