import React from "react";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { IconButton } from "../../../../../components/crud/primitives";
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-3">
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
            className="rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
            type="submit"
            disabled={disabled}
            title="Salvar alteracoes"
          >
            Salvar alteracoes
          </button>
        </div>
        <p className="text-xs text-neutral-400">
          Somente os campos "Nome da loja" e "Ativo" podem ser alterados.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold text-neutral-200">Informacoes da loja</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3">
              <span className="text-xs text-neutral-400">ID</span>
              <p className="mt-1 text-base font-medium text-neutral-100">{initial?.id ?? "-"}</p>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3">
              <span className="text-xs text-neutral-400">CNPJ</span>
              <p className="mt-1 text-base font-medium text-neutral-100">{initial?.cnpj ?? "-"}</p>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3 sm:col-span-2">
              <span className="text-xs text-neutral-400">Descricao (VR)</span>
              <p className="mt-1 text-base font-medium text-neutral-100">{initial?.description ?? "-"}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
          <h3 className="text-sm font-semibold text-neutral-200">Campos editaveis</h3>
          <div className="mt-3 space-y-4">
            <label className="block">
              <span className="text-xs text-neutral-400">Nome da loja</span>
              <input
                className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Nome exibido da loja"
              />
            </label>

            <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3">
              <span className="text-xs text-neutral-400">Status</span>
              <label className="mt-2 inline-flex items-center gap-2 text-sm text-neutral-200">
                <input
                  type="checkbox"
                  checked={activeStatus}
                  onChange={(e) => setActiveStatus(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-600 bg-neutral-900 text-blue-600 focus:ring-blue-600"
                />
                <span
                  className={[
                    "rounded-full px-2 py-1 text-xs",
                    activeStatus ? "bg-emerald-900/50 text-emerald-200" : "bg-neutral-800 text-neutral-300",
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
