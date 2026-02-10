// src/pages/configuracoes/cadastro/users/components/UserForm.tsx
import React from "react";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { IconButton } from "../../../../../components/crud/primitives";
import DefaultCheckbox from "../../../../../components/inputs/DefaultCheckbox";
import { fieldControlBaseClass } from "../../../../../components/inputs/styles";
import type { ApiUserPayload } from "../types";

// O GridForm injeta essas props; mantemos tipagem flexivel
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function UserForm({
  initial,
  onCancel,
  onSubmit,
  submitting,
  isEdit,
  maySubmit,
}: any) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [email, setEmail] = React.useState(initial?.email ?? "");
  const [password, setPassword] = React.useState("");
  const [notifyCostCenterType, setNotifyCostCenterType] = React.useState(
    initial?.notifyCostCenterType ?? false,
  );
  const [activeStatus, setActiveStatus] = React.useState(
    initial?.activeStatus ?? true,
  );

  const canSubmitLocal = () => {
    if (!name.trim() || !email.trim()) return false;
    if (!isEdit && !password.trim()) return false;
    return true;
  };

  const disabled = submitting || !maySubmit || !canSubmitLocal();

  return (
    <form
      className="space-y-4 text-neutral-800 dark:text-neutral-100"
      autoComplete="off"
      onSubmit={async (e) => {
        e.preventDefault();
        if (disabled) return;
        const payload: ApiUserPayload = { name: name.trim(), email: email.trim() };
        payload.notifyCostCenterType = notifyCostCenterType;
        payload.activeStatus = activeStatus;
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
          <ChevronLeftIcon />
        </IconButton>

        <button
          className="cursor-pointer rounded-xl border border-pilar-green bg-pilar-green px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-pilar-green/90 disabled:cursor-not-allowed disabled:opacity-50"
          type="submit"
          disabled={disabled}
          title={isEdit ? "Salvar alterações" : "Cadastrar"}
        >
          {isEdit ? "Salvar alterações" : "Cadastrar"}
        </button>
      </div>

      {/* honeypots */}
      <input
        type="text"
        name="fake-username"
        autoComplete="username"
        className="hidden"
      />
      <input
        type="password"
        name="fake-password"
        autoComplete="new-password"
        className="hidden"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Nome</span>
          <input
            className={fieldControlBaseClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do usuário"
            autoComplete="off"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">E-mail</span>
          <input
            type="email"
            className={fieldControlBaseClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="exemplo@empresa.com"
            autoComplete="off"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Senha{" "}
            {isEdit && <em className="text-neutral-500 dark:text-neutral-400">(opcional ao editar)</em>}
          </span>
          <input
            type="password"
            className={fieldControlBaseClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isEdit ? "Deixe em branco para manter" : "Defina uma senha"}
            autoComplete="new-password"
            name="new-password"
            id="new-password"
          />
        </label>

        <DefaultCheckbox
          className="md:col-span-2"
          checked={notifyCostCenterType}
          onChange={(e) => setNotifyCostCenterType(e.target.checked)}
          label="Receber notificações de novos tipos de centro de custo"
        />

        <DefaultCheckbox
          className="md:col-span-2"
          checked={activeStatus}
          onChange={(e) => setActiveStatus(e.target.checked)}
          label="Usuário ativo"
        />
      </div>
    </form>
  );
}
