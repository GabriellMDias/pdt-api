import React from "react";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { IconButton } from "../../../../../components/crud/primitives";
import DefaultCheckbox from "../../../../../components/inputs/DefaultCheckbox";
import { fieldControlBaseClass } from "../../../../../components/inputs/styles";
import CodeDescriptionLookup from "../../../../../components/lookup/CodeDescriptionLookup";
import type { ApiUserPayload, VrMasterUser } from "../types";

type UserFormProps = {
  initial?: {
    id?: number | string;
    name?: string;
    email?: string;
    notifyCostCenterType?: boolean;
    activeStatus?: boolean;
    codigoUsuarioVrMaster?: number | null;
  };
  onCancel: () => void;
  onSubmit: (payload: ApiUserPayload, id?: number | string) => Promise<void>;
  submitting: boolean;
  isEdit: boolean;
  maySubmit: boolean;
  fetchVrMasterUsers?: () => Promise<VrMasterUser[]>;
};

export default function UserForm({
  initial,
  onCancel,
  onSubmit,
  submitting,
  isEdit,
  maySubmit,
  fetchVrMasterUsers,
}: UserFormProps) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [email, setEmail] = React.useState(initial?.email ?? "");
  const [password, setPassword] = React.useState("");
  const [notifyCostCenterType, setNotifyCostCenterType] = React.useState(
    initial?.notifyCostCenterType ?? false,
  );
  const [activeStatus, setActiveStatus] = React.useState(
    initial?.activeStatus ?? true,
  );
  const [codigoUsuarioVrMaster, setCodigoUsuarioVrMaster] = React.useState<
    number | null
  >(initial?.codigoUsuarioVrMaster ?? null);
  const [vrMasterUsers, setVrMasterUsers] = React.useState<VrMasterUser[]>([]);
  const [vrMasterCodeIsValid, setVrMasterCodeIsValid] = React.useState(true);
  const [loadingVrMasterUsers, setLoadingVrMasterUsers] = React.useState(false);
  const [vrMasterUsersError, setVrMasterUsersError] = React.useState<
    string | null
  >(null);

  React.useEffect(() => {
    let isMounted = true;

    if (!fetchVrMasterUsers) return () => {
      isMounted = false;
    };

    const loadVrMasterUsers = async () => {
      try {
        setLoadingVrMasterUsers(true);
        setVrMasterUsersError(null);
        const users = await fetchVrMasterUsers();
        if (!isMounted) return;
        setVrMasterUsers(users);
      } catch {
        if (!isMounted) return;
        setVrMasterUsersError("Nao foi possivel carregar os usuarios do VRMaster.");
      } finally {
        if (isMounted) setLoadingVrMasterUsers(false);
      }
    };

    loadVrMasterUsers();

    return () => {
      isMounted = false;
    };
  }, [fetchVrMasterUsers]);

  const canSubmitLocal = () => {
    if (!name.trim() || !email.trim()) return false;
    if (!isEdit && !password.trim()) return false;
    return true;
  };

  const disabled =
    submitting || !maySubmit || !canSubmitLocal() || !vrMasterCodeIsValid;

  const vrMasterOptions = React.useMemo(
    () =>
      vrMasterUsers.map((user) => ({
        code: user.id,
        description: `${user.login} - ${user.nome}`,
      })),
    [vrMasterUsers],
  );

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
        payload.codigoUsuarioVrMaster = codigoUsuarioVrMaster;
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
          title={isEdit ? "Salvar alteracoes" : "Cadastrar"}
        >
          {isEdit ? "Salvar alteracoes" : "Cadastrar"}
        </button>
      </div>

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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <label className="block lg:col-span-4">
          <span className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Nome
          </span>
          <input
            className={fieldControlBaseClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do usuario"
            autoComplete="off"
          />
        </label>

        <label className="block lg:col-span-4">
          <span className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            E-mail
          </span>
          <input
            type="email"
            className={fieldControlBaseClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="exemplo@empresa.com"
            autoComplete="off"
          />
        </label>

        <label className="block lg:col-span-4">
          <span className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Senha{" "}
            {isEdit && (
              <em className="text-neutral-500 dark:text-neutral-400">
                (opcional ao editar)
              </em>
            )}
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

        <label className="block lg:col-span-8">
          <span className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Codigo Usuario VRMaster
          </span>
          <CodeDescriptionLookup
            code={codigoUsuarioVrMaster}
            options={vrMasterOptions}
            onCodeChange={setCodigoUsuarioVrMaster}
            onValidityChange={setVrMasterCodeIsValid}
            disabled={loadingVrMasterUsers}
            codePlaceholder="Codigo"
            descriptionPlaceholder="Digite para buscar usuario..."
            invalidCodeMessage="Codigo informado nao existe para usuario VRMaster."
          />
          {loadingVrMasterUsers && (
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Carregando usuarios ativos do VRMaster...
            </p>
          )}
          {!loadingVrMasterUsers && vrMasterUsersError && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {vrMasterUsersError}
            </p>
          )}
        </label>

        <DefaultCheckbox
          className="lg:col-span-6"
          checked={notifyCostCenterType}
          onChange={(e) => setNotifyCostCenterType(e.target.checked)}
          label="Receber notificacoes de novos tipos de centro de custo"
        />

        <DefaultCheckbox
          className="lg:col-span-6"
          checked={activeStatus}
          onChange={(e) => setActiveStatus(e.target.checked)}
          label="Usuario ativo"
        />
      </div>
    </form>
  );
}
