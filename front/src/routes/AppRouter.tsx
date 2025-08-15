import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import PrivateRoute from "./PrivateRoute";
import { AuthProvider } from '../context/AuthProvider';
import { useAuth } from '../hooks/useAuth';
import { protectedRoutes } from './protectedRoutes';
import { flattenRoutes } from './flattenRoutes';

function NotFoundRedirect() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? '/home' : '/'} replace />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LoginPage />} />
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
      </AuthProvider>
    </BrowserRouter>
  );
}
