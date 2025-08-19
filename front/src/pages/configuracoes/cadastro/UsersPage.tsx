import React, { useCallback } from "react";
import Layout from "../../../components/Layout";
import { GridForm, type Column, type Id } from "../../../components/crud/GridForm";
import { IconButton } from "../../../components/crud/primitives";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { useAuth } from "../../../hooks/useAuth";
import PermissionGate from "../../../components/PermissionGate";

// --- Tipos
interface User { id: number; name: string; email: string }
interface ApiUserPayload { name: string; email: string; password?: string }

const API_BASE = ""; // same-origin; ajuste se necessário

function authHeaders(token?: string | null): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function api<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function UsersPage() {
  const { token, permissions, userId } = useAuth();
  const has = (perm: string) => !!permissions?.includes(perm);

  const fetchAll = useCallback(async () => {
    return api<User[]>(`${API_BASE}/api/users`, { headers: authHeaders(token) });
  }, [token]);

  const createItem = useCallback(async (data: ApiUserPayload) => {
    await api(`${API_BASE}/api/users`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    });
  }, [token]);

  const updateItem = useCallback(async (id: Id, data: ApiUserPayload) => {
    await api(`${API_BASE}/api/users/${id}`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    });
  }, [token]);

  const deleteItem = useCallback(async (id: Id) => {
    await api(`${API_BASE}/api/users/${id}`, {
      method: "DELETE",
      headers: authHeaders(token),
    });
  }, [token]);

  const columns: Column<User>[] = [
    { key: "id", header: "ID" },
    { key: "name", header: "Nome" },
    { key: "email", header: "E-mail" },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function UserForm({ initial, onCancel, onSubmit, submitting, isEdit, maySubmit }: any) {
    const [name, setName] = React.useState(initial?.name ?? "");
    const [email, setEmail] = React.useState(initial?.email ?? "");
    const [password, setPassword] = React.useState("");

    const canSubmitLocal = () => {
      if (!name.trim() || !email.trim()) return false;
      if (!isEdit && !password.trim()) return false;
      return true;
    };

    const disabled = submitting || !maySubmit || !canSubmitLocal();

    return (
      <form
        className="space-y-4"
        autoComplete="off"
        onSubmit={async (e) => {
          e.preventDefault();
          if (disabled) return;
          const payload: ApiUserPayload = { name: name.trim(), email: email.trim() };
          if (password.trim()) payload.password = password.trim();
          await onSubmit(payload, initial?.id);
        }}
      >
        <div className="flex items-center gap-3 pt-2">
          <IconButton
            variant="default"
            onClick={onCancel}
            disabled={submitting}
            title="Cancelar"
            className="cursor-pointer"
          >
            <ChevronLeftIcon/>
          </IconButton>
          <button
            className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
            type="submit"
            disabled={disabled}
            title={isEdit ? "Salvar alterações" : "Cadastrar"}
          >
            {isEdit ? "Salvar alterações" : "Cadastrar"}
          </button>
        </div>

        {/* honeypots */}
        <input type="text" name="fake-username" autoComplete="username" className="hidden" />
        <input type="password" name="fake-password" autoComplete="new-password" className="hidden" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1 block text-sm text-neutral-300">Nome</span>
            <input
              className="w-full rounded-xl border border-neutral-700 bg-neutral-900 p-3 outline-none focus:ring-2 focus:ring-blue-600"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do usuário"
              autoComplete="off"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-neutral-300">E-mail</span>
            <input
              type="email"
              className="w-full rounded-xl border border-neutral-700 bg-neutral-900 p-3 outline-none focus:ring-2 focus:ring-blue-600"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemplo@empresa.com"
              autoComplete="off"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm text-neutral-300">
              Senha {isEdit && <em className="text-neutral-400">(opcional ao editar)</em>}
            </span>
            <input
              type="password"
              className="w-full rounded-xl border border-neutral-700 bg-neutral-900 p-3 outline-none focus:ring-2 focus:ring-blue-600"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEdit ? "Deixe em branco para manter" : "Defina uma senha"}
              autoComplete="new-password"
              name="new-password"
              id="new-password"
            />
          </label>
        </div>
      </form>
    );
  }

  // === Definição dos gates considerando o admin (userId === 0) ===
  const isAdmin = userId === 0;

  const canCreate = isAdmin ? true : has("users:incluir");
  const canEdit   = isAdmin ? (() => true) : (() => has("users:editar"));
  // Admin NÃO pode excluir (regra solicitada)
  const canDelete = isAdmin ? (() => true) : (() => has("users:excluir"));

  const Grid = (
    <GridForm<User, ApiUserPayload, ApiUserPayload>
      title="Cadastro de Usuários"
      idOf={(u) => u.id}
      columns={columns}
      fetchAll={async () => fetchAll()}
      createItem={createItem}
      updateItem={updateItem}
      deleteItem={deleteItem}
      renderForm={(p) => <UserForm {...p} />}
      searchPlaceholder="Buscar por nome ou e-mail..."
      // GATES finais
      canCreate={canCreate}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  );

  return (
    <Layout title="Usuários">
      {isAdmin ? (
        // Admin bypass: sem checar permissão de consulta
        Grid
      ) : (
        <PermissionGate required="users:consultar">
          {Grid}
        </PermissionGate>
      )}
    </Layout>
  );
}
