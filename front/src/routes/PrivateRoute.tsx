import { Navigate } from "react-router-dom";
import { useAuth } from '../hooks/useAuth';

type PermissionGrant = { code: string; global: boolean; stores: number[] };
type PermissionBag = Array<string | PermissionGrant>;

function hasPermission(perms: PermissionBag, required: string): boolean {
  if (!required) return true;
  if (!perms || perms.length === 0) return false;

  const strings = perms.filter(p => typeof p === 'string') as string[];
  if (strings.includes(required) || strings.includes('*') || strings.includes('all')) return true;

  const i = required.indexOf(':');
  if (i > -1) {
    const prefix = required.slice(0, i);
    if (strings.includes(`${prefix}:*`)) return true;
  }

  const objs = perms.filter(p => typeof p === 'object') as PermissionGrant[];
  // Guard de rota: considerar concedido se global=true OU stores.length>0
  return objs.some(p => p.code === required && (p.global || (Array.isArray(p.stores) && p.stores.length > 0)));
}

interface PrivateRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
}

export default function PrivateRoute({ children, requiredPermissions }: PrivateRouteProps) {
  const { isAuthenticated, permissions, userId } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (userId === 0) return children;

  const userPerms: PermissionBag = Array.isArray(permissions) ? permissions : [];

  if (
    requiredPermissions &&
    !requiredPermissions.some(p => hasPermission(userPerms, p))
  ) {
    return <Navigate to="/home" replace />;
  }

  return children;
}