/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../../../components/Layout";
import { GridForm, type Column } from "../../../../components/crud/GridForm";
import PermissionGate from "../../../../components/PermissionGate";
import { useAuth } from "../../../../hooks/useAuth";

import { useJobsCrud } from "./hooks/useJobsCrud";
import type { Job, UpdateJobDto } from "./types";
import JobsForm from "./components/JobsForm";
import { scheduleToText } from "./helpers";
import { hasPermission, type PermissionBag } from "../../../../services/permission";
import { jobsApi } from "./api";
import { toast } from "react-toastify";

export default function JobsPage() {
  const { token, permissions, userId } = useAuth();
  const perms = useMemo(() => (permissions ?? []) as PermissionBag, [permissions]);
  const isAdmin = userId === 0;
  const navigate = useNavigate();

  const { fetchAll, updateItem } = useJobsCrud(token);

  const columns: Column<Job>[] = useMemo(() => [
    { key: "id", header: "ID", width: "80px" },
    { key: "name", header: "Nome", width: "320px" },
    { key: "enabled", header: "Ativo", width: "80px", render: (r) => r.enabled ? "Sim" : "Não" },
    { key: "schedule", header: "Agendamento", render: (r) => scheduleToText(r) },
  ], []);

  // Permissions helpers
  const canEdit   = isAdmin ? (() => true) : (() => hasPermission(perms, "dbScripts:editar"));

  const canViewLogs = isAdmin || hasPermission(perms, "code-jobs:consultar");
  const canRunNow   = isAdmin || hasPermission(perms, "code-jobs:executar");

  const Grid = (
    <GridForm<Job, UpdateJobDto>
      title=""
      idOf={(row) => row.id}
      columns={columns}
      fetchAll={async () => fetchAll()}
      createItem={async () => console.log("")}
      updateItem={updateItem}
      deleteItem={async () => console.log("")}
      renderForm={(props: any) => {
        const initial = props.initial
          ? { ...props.initial, description: props.initial.description ?? undefined }
          : undefined;
        return <JobsForm {...props} initial={initial} />;
      }}
      canCreate={false}
      canEdit={canEdit}
      canDelete={false}
      /** NOVO: ações do botão “Ações” */
      actionsForRow={(row) => {
        if (!row) return [];
        const items = [];
        if (canViewLogs) {
          items.push({
            key: "logs",
            label: "Visualizar Logs",
            onClick: () => navigate(`/configuracoes/acoesagendadas/jobs/${row.id}/runs`),
          });
        }
        if (canRunNow) {
          items.push({
            key: "run",
            label: "Executar agora",
            onClick: async () => {
              try {
                await jobsApi.runNow(row.id, token);
                // opcional: feedback simples
                 
                toast.success('Execução manual enviada.', {
                                        position: 'top-right',
                                        autoClose: 5000,
                                        hideProgressBar: false,
                                        pauseOnHover: true,
                                        draggable: true,
                                        theme: 'dark',})
              } catch (e: any) {
                toast.error(`Falha ao executar: ${e?.message ?? e}`, {
                  position: 'top-right',
                  autoClose: 5000,
                  hideProgressBar: false,
                  pauseOnHover: true,
                  draggable: true,
                  theme: 'dark',
                })
              }
            },
          });
        }
        return items;
      }}
    />
  );

  return (
    <Layout title="Acoes agendadas">
      {isAdmin ? (
        Grid
      ) : (
        <PermissionGate required="jobss:consultar">
          {Grid}
        </PermissionGate>
      )}
    </Layout>
  );
}
