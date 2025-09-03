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
export default function DbScriptsPage() {
  const { token, permissions, userId } = useAuth();
  const isAdmin = userId === 0;

  const { fetchAll, createItem, updateItem, deleteItem } = useDbScriptsCrud(token);

  const columns: Column<DbScript>[] = useMemo(() => [
    { key: "id", header: "ID", width: "80px" },
    { key: "name", header: "Nome", width: "320px" },
    { key: "enabled", header: "Ativo", width: "80px", render: (r) => r.enabled ? "Sim" : "Não" },
    { key: "schedule", header: "Agendamento", render: (r) => scheduleToText(r) },
  ], []);

  // Permissions helpers
  const can = (code: string) => isAdmin || !!permissions?.some(p => p.code === code);

  const Grid = (
    <GridForm<DbScript, CreateDbScriptDto, UpdateDbScriptDto>
      title=""
      idOf={(row) => row.id}
      columns={columns}
      fetchAll={async () => fetchAll()}
      createItem={createItem}
      updateItem={updateItem}
      deleteItem={deleteItem}
      renderForm={(props) => <DbScriptForm {...props} />}
      canCreate={can("dbScripts:incluir")}
      canEdit={can("dbScripts:editar")}
      canDelete={can("dbScripts:excluir")}
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
