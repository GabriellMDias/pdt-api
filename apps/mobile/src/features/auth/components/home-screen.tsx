import { AppBootstrapStateScreen } from '@/src/features/bootstrap/components/app-bootstrap-state-screen';
import { HomeShell } from '@/src/features/home/components/home-shell';
import { useAuthStore } from '@/src/features/auth/store/use-auth-store';

export function HomeScreen() {
  const appReadinessStatus = useAuthStore((state) => state.appReadinessStatus);
  const appReadinessErrorKind = useAuthStore((state) => state.appReadinessErrorKind);
  const appReadinessMessage = useAuthStore((state) => state.appReadinessMessage);
  const currentUserContext = useAuthStore((state) => state.currentUserContext);
  const availableStores = useAuthStore((state) => state.availableStores);
  const permissionScopes = useAuthStore((state) => state.permissionScopes);
  const prepareApp = useAuthStore((state) => state.prepareApp);
  const logout = useAuthStore((state) => state.logout);

  const hasReadySnapshot =
    currentUserContext !== null || availableStores.length > 0 || permissionScopes.length > 0;

  if (appReadinessStatus === 'loading' && !hasReadySnapshot) {
    return (
      <AppBootstrapStateScreen
        mode="loading"
        title="Preparando app para uso offline"
        description="Validando sessao, carregando contexto do usuario e sincronizando os dados mestres minimos."
      />
    );
  }

  if (appReadinessStatus === 'error' && !hasReadySnapshot) {
    return (
      <AppBootstrapStateScreen
        mode="error"
        title="Nao foi possivel preparar o app"
        description={appReadinessMessage ?? 'Tente novamente para concluir o bootstrap inicial.'}
        errorKind={appReadinessErrorKind}
        onRetry={() => {
          void prepareApp('retry');
        }}
        onLogout={() => {
          void logout();
        }}
      />
    );
  }

  return <HomeShell isRefreshing={appReadinessStatus === 'loading' && hasReadySnapshot} />;
}
