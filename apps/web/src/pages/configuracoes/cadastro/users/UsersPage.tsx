// src/pages/configuracoes/cadastro/UsersPage.tsx
import { useMemo } from "react";
import { GridForm, type Column, type Id } from "../../../../components/crud/GridForm";
import Layout from "../../../../components/Layout";
import PermissionGate from "../../../../components/PermissionGate";
import { useAuth } from "../../../../hooks/useAuth";
import { hasPermission, type PermissionBag } from "../../../../services/permission";
import UserForm from "./components/UserForm";
import { useUsersCrud } from "./hooks/useUsersCrud";
import type { ApiUserPayload, User } from "./types";

export default function UsersPage() {
  const { token, permissions, userId } = useAuth();
  const perms = useMemo(() => (permissions ?? []) as PermissionBag, [permissions]);

  const { fetchAll, createItem, updateItem, deleteItem, fetchVrMasterUsers } = useUsersCrud(token);

  const columns: Column<User>[] = [
    { key: "id", header: "ID" },
    { key: "name", header: "Nome" },
    { key: "email", header: "E-mail" },
    {
      key: "codigoUsuarioVrMaster",
      header: "Codigo Usuario VRMaster",
      render: (row) => row.codigoUsuarioVrMaster ?? "-",
    },
    {
      key: "activeStatus",
      header: "Status",
      render: (row) => ((row.activeStatus ?? true) ? "Ativo" : "Inativo"),
    },
    {
      key: "notifyCostCenterType",
      header: "Notif. Centro Custo",
      render: (row) => (row.notifyCostCenterType ? "Sim" : "Não"),
    },
  ];

  // Gates considerando admin (userId === 0) e permissões estruturadas
  const isAdmin = userId === 0;

  const canCreate = isAdmin || hasPermission(perms, "users:incluir");
  const canEdit = isAdmin ? () => true : () => hasPermission(perms, "users:editar");
  const canDelete = (row?: User) => {
    if (!row || row.id === 0) return false;
    return isAdmin || hasPermission(perms, "users:excluir");
  };

  const grid = (
    <GridForm<User, ApiUserPayload, ApiUserPayload>
      title=""
      idOf={(u) => u.id}
      columns={columns}
      fetchAll={async () => fetchAll()}
      createItem={(data) => createItem(data)}
      updateItem={(id: Id, data) => updateItem(id, data)}
      deleteItem={(id: Id) => deleteItem(id)}
      renderForm={(p) => <UserForm {...p} fetchVrMasterUsers={fetchVrMasterUsers} />}
      searchPlaceholder="Buscar por nome ou e-mail..."
      canCreate={canCreate}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  );

  return (
    <Layout title="Usuários">
      {isAdmin ? grid : <PermissionGate required="users:consultar">{grid}</PermissionGate>}
    </Layout>
  );
}
