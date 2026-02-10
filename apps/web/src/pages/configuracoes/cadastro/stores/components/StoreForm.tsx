import React from "react";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { IconButton } from "../../../../../components/crud/primitives";
import { fieldControlBaseClass } from "../../../../../components/inputs/styles";
import type { Store, UpdateStorePayload } from "../types";

type StoreFormProps = {
  initial?: Partial<Store>;
  onCancel: () => void;
  onSubmit: (payload: UpdateStorePayload, id?: number | string) => Promise<void>;
  submitting: boolean;
  maySubmit: boolean;
};

export default function StoreForm({
  initial,
  onCancel,
  onSubmit,
  submitting,
  maySubmit,
}: StoreFormProps) {
  const [storeName, setStoreName] = React.useState(initial?.storeName ?? initial?.description ?? "");
  const [activeStatus, setActiveStatus] = React.useState(Boolean(initial?.activeStatus));

  React.useEffect(() => {
    setStoreName(initial?.storeName ?? initial?.description ?? "");
    setActiveStatus(Boolean(initial?.activeStatus));
  }, [initial]);

  const disabled = submitting || !maySubmit || !storeName.trim();

  return (
    <form
      className="mx-auto w-full max-w-5xl space-y-5"
      autoComplete="off"
      onSubmit={async (e) => {
        e.preventDefault();
        if (disabled) return;
        const payload: UpdateStorePayload = {
          storeName: storeName.trim(),
          activeStatus,
        };
        await onSubmit(payload, initial?.id);
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/35">
        <div className="flex items-center gap-3">
          <IconButton
            variant="default"
            onClick={onCancel}
            disabled={submitting}
            title="Voltar"
            className="cursor-pointer"
          >
            <ChevronLeftIcon />
          </IconButton>
          <button
            className="cursor-pointer rounded-xl border border-pilar-green bg-pilar-green px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-pilar-green/90 disabled:cursor-not-allowed disabled:opacity-50"
            type="submit"
            disabled={disabled}
            title="Salvar alteracoes"
          >
            Salvar alteracoes
          </button>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Somente os campos "Nome da loja" e "Ativo" podem ser alterados.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm lg:col-span-2 dark:border-neutral-700 dark:bg-neutral-900/30">
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Informacoes da loja</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-neutral-200 bg-neutral-50/80 p-3 dark:border-neutral-700 dark:bg-neutral-900/55">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">ID</span>
              <p className="mt-1 text-base font-medium text-neutral-800 dark:text-neutral-100">{initial?.id ?? "-"}</p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50/80 p-3 dark:border-neutral-700 dark:bg-neutral-900/55">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">CNPJ</span>
              <p className="mt-1 text-base font-medium text-neutral-800 dark:text-neutral-100">{initial?.cnpj ?? "-"}</p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50/80 p-3 sm:col-span-2 dark:border-neutral-700 dark:bg-neutral-900/55">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">Descricao (VR)</span>
              <p className="mt-1 text-base font-medium text-neutral-800 dark:text-neutral-100">{initial?.description ?? "-"}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/30">
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Campos editaveis</h3>
          <div className="mt-3 space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Nome da loja</span>
              <input
                className={`mt-1 ${fieldControlBaseClass}`}
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Nome exibido da loja"
              />
            </label>

            <div className="rounded-lg border border-neutral-200 bg-neutral-50/80 p-3 dark:border-neutral-700 dark:bg-neutral-900/55">
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Status</span>
              <label className="mt-2 inline-flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
                <input
                  type="checkbox"
                  checked={activeStatus}
                  onChange={(e) => setActiveStatus(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-400 bg-white text-pilar-green accent-pilar-green focus:ring-pilar-green dark:border-neutral-600 dark:bg-pilar-default-bg-dark"
                />
                <span
                  className={[
                    "rounded-full px-2 py-1 text-xs",
                    activeStatus
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200"
                      : "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
                  ].join(" ")}
                >
                  {activeStatus ? "Loja ativa" : "Loja inativa"}
                </span>
              </label>
            </div>
          </div>
        </div>
      </section>
    </form>
  );
}
