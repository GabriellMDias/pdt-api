// src/components/Sidebar/filterRoutesByPermissions.ts
import type { ProtectedRoute } from '../../routes/protectedRoutes';

// Compatível com permissões como string e/ou estruturadas {code, global, stores}
type PermissionGrant = { code: string; global: boolean; stores: number[] };
type PermissionBag = Array<string | PermissionGrant>;

function hasPermission(perms: PermissionBag, required: string): boolean {
  if (!required) return true;
  if (!Array.isArray(perms) || perms.length === 0) return false;

  // 1) Strings (exatas/curingas)
  const strings = perms.filter((p) => typeof p === 'string') as string[];
  if (strings.includes(required) || strings.includes('*') || strings.includes('all')) return true;
  const i = required.indexOf(':');
  if (i > -1) {
    const prefix = required.slice(0, i);
    if (strings.includes(`${prefix}:*`)) return true;
  }

  // 2) Objetos { code, global, stores }
  const objs = perms.filter((p) => typeof p === 'object') as PermissionGrant[];
  return objs.some(
    (p) => p.code === required && (p.global || (Array.isArray(p.stores) && p.stores.length > 0))
  );
}

export function filterRoutesByPermissions(
  routes: ProtectedRoute[],
  permissions: PermissionBag | undefined | null,
  userId: number | null
): ProtectedRoute[] {
  const userPerms: PermissionBag = Array.isArray(permissions) ? permissions : [];
  const isAdmin = userId === 0;

  return routes
    .map((route) => {
      const hasPath = Boolean(route.path);
      const req = route.requiredPermissions;

      const filteredChildren = route.children
        ? filterRoutesByPermissions(route.children, userPerms, userId)
        : [];

      let include = false;

      if (isAdmin) {
        include = route.showInSidebar !== false && (hasPath || filteredChildren.length > 0);
      } else if (hasPath) {
        const noPermNeeded = !req || req.length === 0;
        include =
          route.showInSidebar !== false &&
          (noPermNeeded || req!.some((r) => hasPermission(userPerms, r)));
      } else {
        include = route.showInSidebar !== false && filteredChildren.length > 0;
      }

      if (!include) return null;

      return {
        ...route,
        ...(filteredChildren.length > 0 ? { children: filteredChildren } : {}),
      };
    })
    .filter((r): r is ProtectedRoute => r !== null);
}
