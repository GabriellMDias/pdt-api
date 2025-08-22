// src/pages/configuracoes/cadastro/users/components/UserForm.tsx
import React from "react";
import { IconButton } from "../../../../../components/crud/primitives";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import type { ApiUserPayload } from "../types";

// O GridForm injeta essas props; mantemos tipagem flexível
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function UserForm({ initial, onCancel, onSubmit, submitting, isEdit, maySubmit }: any) {
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
