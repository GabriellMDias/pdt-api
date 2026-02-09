// src/pages/configuracoes/cadastro/UsersPage.tsx
import { useMemo } from "react";
import Layout from "../../../../components/Layout";
import { GridForm, type Column, type Id } from "../../../../components/crud/GridForm";
import PermissionGate from "../../../../components/PermissionGate";
import { useAuth } from "../../../../hooks/useAuth";

import { useUsersCrud } from "./hooks/useUsersCrud";
import { hasPermission, type PermissionBag } from "../../../../services/permission";
import UserForm from "./components/UserForm";
import type { User, ApiUserPayload } from "./types";

export default function UsersPage() {
  const { token, permissions, userId } = useAuth();
  const perms = useMemo(() => (permissions ?? []) as PermissionBag, [permissions]);

  const { fetchAll, createItem, updateItem, deleteItem } = useUsersCrud(token);

  const columns: Column<User>[] = [
    { key: "id", header: "ID" },
    { key: "name", header: "Nome" },
    { key: "email", header: "E-mail" },
    {
      key: "notifyCostCenterType",
      header: "Notif. Centro Custo",
      render: (row) => (row.notifyCostCenterType ? "Sim" : "Não"),
    },
  ];

  // === Gates considerando admin (userId === 0) e permissões estruturadas ===
  const isAdmin = userId === 0;

  const canCreate = isAdmin || hasPermission(perms, "users:incluir");
  const canEdit   = isAdmin ? (() => true) : (() => hasPermission(perms, "users:editar"));
  // Admin NÃO pode excluir (regra mantida)
  const canDelete = isAdmin ? (() => false) : (() => hasPermission(perms, "users:excluir"));

  const Grid = (
    <GridForm<User, ApiUserPayload, ApiUserPayload>
      title=""
      idOf={(u) => u.id}
      columns={columns}
      fetchAll={async () => fetchAll()}
      createItem={(data) => createItem(data)}
      updateItem={(id: Id, data) => updateItem(id, data)}
      deleteItem={(id: Id) => deleteItem(id)}
      renderForm={(p) => <UserForm {...p} />}
      searchPlaceholder="Buscar por nome ou e-mail..."
      canCreate={canCreate}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  );

  return (
    <Layout title="Usuários">
      {isAdmin ? (
        Grid
      ) : (
        <PermissionGate required="users:consultar">
          {Grid}
        </PermissionGate>
      )}
    </Layout>
  );
}
