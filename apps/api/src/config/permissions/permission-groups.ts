const PREFIX_GROUP_MAP: Record<string, string> = {
  users: "configuracoes/cadastro/usuarios",
  permissions: "configuracoes/permissoes",
  parameters: "configuracoes/parametros",
  dbScripts: "configuracoes/acoes-agendadas/scripts-bd",
  codeJobs: "configuracoes/acoes-agendadas/jobs",
  dre: "administrativo/dre",
  "cost-center-comparative": "administrativo/gestao-a-vista",
  "curva-abc": "administrativo/curva-abc",
  ruptura: "administrativo/ruptura-interna",
  expense: "administrativo/despesas",
  "stock-analysis": "estoque/analises",
  sped: "fiscal/obrigacoes/sped",
  "top-restrictions": "fiscal/restricoes-top",
  "accounting-reconc": "contabil/conciliacao-contabil",
};

export function permissionPrefix(code: string): string {
  const idx = code.indexOf(":");
  return idx > -1 ? code.slice(0, idx) : code;
}

export function getPermissionGroupPath(code: string): string {
  const prefix = permissionPrefix(code);
  return PREFIX_GROUP_MAP[prefix] ?? `geral/${prefix || "outros"}`;
}
