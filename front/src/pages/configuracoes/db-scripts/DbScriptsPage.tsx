// src/pages/configuracoes/db-scripts/DbScriptsPage.tsx
import { useMemo } from "react";
import Layout from "../../../components/Layout";
import { GridForm, type Column } from "../../../components/crud/GridForm";
import PermissionGate from "../../../components/PermissionGate";
import { useAuth } from "../../../hooks/useAuth";

import { useDbScriptsCrud } from "./hooks/useDbScriptsCrud";
import type { CreateDbScriptDto, DbScript, UpdateDbScriptDto } from "./types";
import DbScriptForm from "./components/DbScriptForm";
import { scheduleToText } from "./helpers";
import { hasPermission } from "../cadastro/users/utils/permission";
import type { PermissionBag } from "../cadastro/users/types";

export default function DbScriptsPage() {
  const { token, permissions, userId } = useAuth();
  const perms = useMemo(() => (permissions ?? []) as PermissionBag, [permissions]);
  const isAdmin = userId === 0;

  const { fetchAll, createItem, updateItem, deleteItem } = useDbScriptsCrud(token);

  const columns: Column<DbScript>[] = useMemo(() => [
    { key: "id", header: "ID", width: "80px" },
    { key: "name", header: "Nome", width: "320px" },
    { key: "enabled", header: "Ativo", width: "80px", render: (r) => r.enabled ? "Sim" : "Não" },
    { key: "schedule", header: "Agendamento", render: (r) => scheduleToText(r) },
  ], []);

  // Permissions helpers
  const canCreate = isAdmin || hasPermission(perms, "dbScripts:incluir");
  const canEdit   = isAdmin ? (() => true) : (() => hasPermission(perms, "dbScripts:editar"));
  // Admin NÃO pode excluir (regra mantida)
  const canDelete = isAdmin ? (() => false) : (() => hasPermission(perms, "dbScripts:excluir"));

  const Grid = (
    <GridForm<DbScript, CreateDbScriptDto, UpdateDbScriptDto>
      title=""
      idOf={(row) => row.id}
      columns={columns}
      fetchAll={async () => fetchAll()}
      createItem={createItem}
      updateItem={updateItem}
      deleteItem={deleteItem}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      renderForm={(props: any) => {
        const initial = props.initial
        ? { ...props.initial, description: props.initial.description ?? undefined }
        : undefined;
        return <DbScriptForm {...props} initial={initial} />;
      }}
      canCreate={canCreate}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  );

  return (
    <Layout title="Ações agendadas">
      {isAdmin ? (
        Grid
      ) : (
        <PermissionGate required="dbScripts:consultar">
          {Grid}
        </PermissionGate>
      )}
    </Layout>
  );
}
