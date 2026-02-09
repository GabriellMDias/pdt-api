import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import PrivateRoute from "./PrivateRoute";
import { AuthProvider } from '../context/AuthProvider';
import { NotificationsProvider } from '../context/NotificationsProvider';
import { useAuth } from '../hooks/useAuth';
import { protectedRoutes } from './protectedRoutes';
import { flattenRoutes } from './flattenRoutes';
import GoogleDriveOAuthCallbackPage from '../pages/configuracoes/acoes-agendadas/backup-google-drive/GoogleDriveOAuthCallbackPage';

function NotFoundRedirect() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? '/home' : '/'} replace />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationsProvider>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/oauth/google-drive/callback" element={<GoogleDriveOAuthCallbackPage />} />
            {flattenRoutes(protectedRoutes).map(route => (
              <Route
                key={route.path}
                path={route.path}
                element={
                  <PrivateRoute requiredPermissions={route.requiredPermissions}>
                    {route.element}
                  </PrivateRoute>
                }
              />
            ))}
            <Route path="*" element={<NotFoundRedirect />} />
          </Routes>
        </NotificationsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
