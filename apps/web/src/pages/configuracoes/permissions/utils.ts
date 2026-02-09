import type { PermissionCatalogEntry, UserPermissionState } from "./types";

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

const PREFIX_GROUP_MAP: Record<string, string> = {
  users: "configuracoes/cadastro/usuarios",
  permissions: "configuracoes/permissoes",
  parameters: "configuracoes/parametros",
  dbScripts: "configuracoes/acoes-agendadas/scripts-bd",
  codeJobs: "configuracoes/acoes-agendadas/jobs",
  dre: "administrativo/dre",
  "cost-center-comparative": "administrativo/gestao-a-vista",
  ruptura: "administrativo/ruptura-interna",
  expense: "administrativo/despesas",
  "stock-analysis": "estoque/analises",
  sped: "fiscal/obrigacoes/sped",
  "top-restrictions": "fiscal/restricoes-top",
  "accounting-reconc": "contabil/conciliacao-contabil",
};

export function permissionPrefix(code: string): string {
  const i = code.indexOf(":");
  return i > -1 ? code.slice(0, i) : code;
}

export function groupPathFromCode(code: string): string {
  const prefix = permissionPrefix(code);
  return PREFIX_GROUP_MAP[prefix] ?? `geral/${prefix || "outros"}`;
}

export function getGroupPath(item: Pick<PermissionCatalogEntry, "code" | "groupPath">): string {
  return item.groupPath?.trim() || groupPathFromCode(item.code);
}

export function topGroupFromPath(groupPath: string): string {
  return groupPath.split("/")[0] || "geral";
}

// Mantido por compatibilidade local da tela.
export function codeGroup(code: string): string {
  return groupPathFromCode(code);
}

export function isEqualPerm(
  a?: { global: boolean; stores: number[] },
  b?: { global: boolean; stores: number[] }
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.global !== b.global) return false;
  if (a.stores.length !== b.stores.length) return false;
  const sa = [...a.stores].sort((x, y) => x - y);
  const sb = [...b.stores].sort((x, y) => x - y);
  for (let i = 0; i < sa.length; i++) {
    if (sa[i] !== sb[i]) return false;
  }
  return true;
}

export function diffPermissions(original: UserPermissionState, current: UserPermissionState): string[] {
  const codes = new Set([...Object.keys(original || {}), ...Object.keys(current || {})]);
  const changed: string[] = [];
  for (const c of codes) {
    if (!isEqualPerm(original[c], current[c])) changed.push(c);
  }
  return changed;
}
