export type PermissionGrant = { code: string; global: boolean; stores: number[] };
export type PermissionBag = Array<string | PermissionGrant>;

/**
 * Verifica se o usuário possui a permissão exigida.
 * Considera:
 *  - strings: match exato, "*" / "all" e prefixo:* (ex.: "users:*")
 *  - objetos: concedido se global=true OU stores.length>0 (ou storeId específico)
 *  - ignora storeId=0
 */
export function hasPermission(perms: PermissionBag, required: string, storeId?: number): boolean {
  if (!required) return true;
  if (!Array.isArray(perms) || perms.length === 0) return false;

  // 1) Strings (exatas/curingas)
  const strings = perms.filter(p => typeof p === "string") as string[];
  if (strings.includes(required) || strings.includes("*") || strings.includes("all")) return true;

  const i = required.indexOf(":");
  if (i > -1) {
    const prefix = required.slice(0, i);
    if (strings.includes(`${prefix}:*`)) return true;
  }

  // 2) Objetos { code, global, stores }
  const objs = perms.filter(p => typeof p === "object") as PermissionGrant[];
  const validStoreId = typeof storeId === "number" && storeId !== 0 ? storeId : undefined;

  return objs.some(p => {
    if (p.code !== required) return false;
    if (p.global) return true;
    if (!Array.isArray(p.stores) || p.stores.length === 0) return false;
    return validStoreId ? p.stores.includes(validStoreId) : p.stores.length > 0;
  });
}
