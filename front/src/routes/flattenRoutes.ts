// src/utils/flattenRoutes.ts
import type { ProtectedRoute } from './protectedRoutes';

export function flattenRoutes(routes: ProtectedRoute[]): ProtectedRoute[] {
  const result: ProtectedRoute[] = [];

  function recurse(routeList: ProtectedRoute[]) {
    for (const route of routeList) {
      if (route.path && route.element) {
        result.push(route);
      }
      if (route.children) {
        recurse(route.children);
      }
    }
  }

  recurse(routes);
  return result;
}
