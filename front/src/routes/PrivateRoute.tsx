import { Navigate } from "react-router-dom";
import { useAuth } from '../hooks/useAuth';

interface PrivateRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
}

export default function PrivateRoute({ children, requiredPermissions }: PrivateRouteProps) {
  const { isAuthenticated, permissions, userId } = useAuth();

  // Não autenticado → redireciona pro login
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Possui restrição de permissões e não tem nenhuma delas → redireciona pro /home
  if (
    requiredPermissions &&
    !requiredPermissions.some(p => permissions.includes(p)) &&
    userId !== 0
  ) {
    return <Navigate to="/home" replace />;
  }

  return children;
}
