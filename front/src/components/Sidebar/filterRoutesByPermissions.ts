import type { ProtectedRoute } from '../../routes/protectedRoutes';

export function filterRoutesByPermissions(
  routes: ProtectedRoute[],
  permissions: string[],
  userId: number | null
): ProtectedRoute[] {
  return routes
    .map(route => {
      const hasPath = !!route.path;

      const userHasPermission = hasPath
        ? !route.requiredPermissions || route.requiredPermissions.some(p => permissions.includes(p))
        : userId === 0 ? true : false;

      const filteredChildren = route.children
        ? filterRoutesByPermissions(route.children, permissions, userId)
        : [];

      const shouldIncludeThisRoute =
        route.showInSidebar !== false &&
        (userHasPermission || filteredChildren.length > 0);

      if (!shouldIncludeThisRoute) return null;

      return {
        ...route,
        ...(filteredChildren.length > 0 ? { children: filteredChildren } : {})
      };
    })
    .filter((r): r is ProtectedRoute => r !== null);
}
