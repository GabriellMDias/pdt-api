import React from "react";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import { IconButton } from "../../../../../components/crud/primitives";
import { fieldControlBaseClass } from "../../../../../components/inputs/styles";
import CodeDescriptionLookup from "../../../../../components/lookup/CodeDescriptionLookup";
import type { CostCenterTypeItem, CreateCostCenterTypePayload, UpdateCostCenterTypePayload } from "../types";
import { api, authHeaders, API_BASE } from "../../../../../services/api";
import { useAuth } from "../../../../../hooks/useAuth";

type RateioMode = "percentage" | "participation";

type RateioRow = CostCenterTypeItem & {
  key: string;
  isNew?: boolean;
};

type CostCenterOption = {
  id: number;
  description: string;
};

type StoreOption = {
  id: number;
  description?: string | null;
  storeName?: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function CostCenterTypeRateioForm({ initial, onCancel, onSubmit, submitting, isEdit, maySubmit }: any) {
  const { token } = useAuth();
  const [items, setItems] = React.useState<RateioRow[]>([]);
  const [description, setDescription] = React.useState("");
  const [activeStatus, setActiveStatus] = React.useState(true);
  const [mode, setMode] = React.useState<RateioMode>("percentage");
  const [costCenters, setCostCenters] = React.useState<CostCenterOption[]>([]);
  const [stores, setStores] = React.useState<StoreOption[]>([]);
  const [, setLookupLoading] = React.useState(false);

  React.useEffect(() => {
    setDescription(initial?.description ?? "");
    setActiveStatus(initial?.activeStatus ?? true);

    const sourceItems = (initial?.costCenterTypeItems ?? []) as CostCenterTypeItem[];
    const initialItems: RateioRow[] = sourceItems.map((item: CostCenterTypeItem, idx: number) => ({
      key: `${item.costCenterId ?? "cc"}-${item.storeId ?? "store"}-${idx}`,
      costCenterId: item.costCenterId ?? null,
      storeId: item.storeId ?? null,
      percentage: initial?.useParticipationCostCenter ? null : item.percentage ?? null,
      participation: item.participation ?? false,
      isNew: false,
    }));

    const hasPercentage = initialItems.some((item) => item.percentage !== null && item.percentage !== undefined);
    if (initial?.useParticipationCostCenter) {
      setMode("participation");
      setItems(distributeParticipationPercentages(initialItems));
    } else {
      setMode(hasPercentage ? "percentage" : "participation");
      setItems(initialItems);
    }
  }, [initial]);

  const handleChange = (index: number, value: Partial<RateioRow>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...value } : item)));
  };

  const distributeParticipationPercentages = (rows: RateioRow[]) => {
    if (rows.length === 0) return rows;
    const portion = Number((100 / rows.length).toFixed(2));
    return rows.map((row, idx) => {
      if (idx === rows.length - 1) {
        const subtotal = Number((portion * (rows.length - 1)).toFixed(2));
        return { ...row, percentage: Number((100 - subtotal).toFixed(2)), participation: true };
      }
      return { ...row, percentage: portion, participation: true };
    });
  };

  const handleModeChange = (nextMode: RateioMode) => {
    setMode(nextMode);
    setItems((prev) => {
      if (nextMode === "participation") {
        return distributeParticipationPercentages(prev.map((item) => ({ ...item })));
      }

      return prev.map((item) => ({
        ...item,
        percentage: item.percentage ?? 0,
        participation: false,
      }));
    });
  };

  const addRow = () => {
    setItems((prev) => {
      const next = [
        ...prev,
        {
          key: `new-${Date.now()}-${Math.random()}`,
          costCenterId: null,
          storeId: null,
          percentage: mode === "percentage" ? 0 : null,
          participation: mode === "participation" ? true : false,
          isNew: true,
        },
      ];

      return mode === "participation" ? distributeParticipationPercentages(next) : next;
    });
  };

  const removeRow = (index: number) => {
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return mode === "participation" ? distributeParticipationPercentages(next) : next;
    });
  };

  const parsedItems = React.useMemo<CostCenterTypeItem[]>(() => (
    items.map((item) => ({
      costCenterId: item.costCenterId == null ? null : Number(item.costCenterId),
      storeId: item.storeId == null ? null : Number(item.storeId),
      percentage: item.percentage == null ? null : Number(item.percentage),
      participation: mode === "participation",
    }))
  ), [items, mode]);

  const totalPercentage = React.useMemo(() => (
    parsedItems.reduce((acc, item) => acc + (typeof item.percentage === "number" ? item.percentage : 0), 0)
  ), [parsedItems]);

  const roundedTotal = React.useMemo(() => (
    Math.round((totalPercentage + Number.EPSILON) * 100) / 100
  ), [totalPercentage]);

  const hasMissingFields = React.useMemo(
    () =>
      parsedItems.some((item) => item.costCenterId === null || item.storeId === null),
    [parsedItems]
  );
  const hasNoItems = parsedItems.length === 0;

  const hasInvalidMode = React.useMemo(() => {
    const hasPercentage = parsedItems.some((item) => item.percentage !== null && item.percentage !== undefined);
    const hasNullPercentage = parsedItems.some((item) => item.percentage === null || item.percentage === undefined);

    if (mode === "percentage") {
      return !hasPercentage || hasNullPercentage || roundedTotal !== 100;
    }

    return hasPercentage && roundedTotal !== 100;
  }, [parsedItems, roundedTotal, mode]);

  const disabled = submitting || !maySubmit || hasMissingFields || hasInvalidMode || hasNoItems || (!isEdit && !description.trim());

  const costCenterOptions = React.useMemo(
    () =>
      costCenters.map((row) => ({
        code: row.id,
        description: row.description || "-",
      })),
    [costCenters],
  );

  const storeOptions = React.useMemo(
    () =>
      stores.map((row) => ({
        code: row.id,
        description: row.description ?? row.storeName ?? "-",
      })),
    [stores],
  );

  React.useEffect(() => {
    if (!token) return;
    const loadAll = async () => {
      setLookupLoading(true);
      try {
        const [costCenterData, storeData] = await Promise.all([
          api<CostCenterOption[]>(`${API_BASE}/api/cost-centers`, {
            headers: authHeaders(token),
          }),
          api<StoreOption[]>(`${API_BASE}/api/stores`, {
            headers: authHeaders(token),
          }),
        ]);
        setCostCenters(costCenterData);
        setStores(storeData);
      } finally {
        setLookupLoading(false);
      }
    };
    loadAll();
  }, [token]);

  return (
    <form
      className="mx-auto w-full max-w-[1400px] space-y-5 text-neutral-800 dark:text-neutral-100"
      autoComplete="off"
      onSubmit={async (e) => {
        e.preventDefault();
        if (disabled) return;

        if (isEdit) {
          const payload: UpdateCostCenterTypePayload = {
            activeStatus,
            useParticipationStore: false,
            useParticipationCostCenter: mode === "participation",
            costCenterTypeItems: parsedItems,
          };
          await onSubmit(payload, initial?.id);
          return;
        }

        const payload: CreateCostCenterTypePayload = {
          description: description.trim(),
          activeStatus,
          useParticipationStore: false,
          useParticipationCostCenter: mode === "participation",
          verified: false,
          costCenterTypeItems: parsedItems,
        };

        await onSubmit(payload);
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
            title={isEdit ? "Salvar alteracoes" : "Cadastrar"}
          >
            {isEdit ? "Salvar alteracoes" : "Cadastrar"}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-neutral-300 bg-neutral-50 px-3 py-1 text-neutral-700 dark:border-neutral-600 dark:bg-neutral-800/70 dark:text-neutral-200">
            {mode === "percentage" ? "Modo: Porcentagem" : "Modo: Participacao"}
          </span>
          <span className="rounded-full border border-neutral-300 bg-neutral-50 px-3 py-1 text-neutral-700 dark:border-neutral-600 dark:bg-neutral-800/70 dark:text-neutral-200">
            Itens: {items.length}
          </span>
          <span className="rounded-full border border-neutral-300 bg-neutral-50 px-3 py-1 text-neutral-700 dark:border-neutral-600 dark:bg-neutral-800/70 dark:text-neutral-200">
            Total: {roundedTotal.toFixed(2)}%
          </span>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm xl:col-span-2 dark:border-neutral-700 dark:bg-neutral-900/30">
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Dados do tipo de centro de custo</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Descricao</span>
              {isEdit ? (
                <p className="mt-1 rounded-lg border border-neutral-200 bg-neutral-50/80 px-3 py-2 text-sm text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900/55 dark:text-neutral-100">
                  {initial?.description ?? "-"}
                </p>
              ) : (
                <input
                  className={`mt-1 ${fieldControlBaseClass}`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descricao do tipo de centro de custo"
                />
              )}
            </label>

            {isEdit && (
              <>
                <div className="rounded-lg border border-neutral-200 bg-neutral-50/80 p-3 dark:border-neutral-700 dark:bg-neutral-900/55">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">ID VR</span>
                  <p className="mt-1 text-sm font-medium text-neutral-800 dark:text-neutral-100">{initial?.id_costcentertype_vr ?? "-"}</p>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-neutral-50/80 p-3 dark:border-neutral-700 dark:bg-neutral-900/55">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">Codigo Sankhya</span>
                  <p className="mt-1 text-sm font-medium text-neutral-800 dark:text-neutral-100">{initial?.codcencus_sankhya ?? "-"}</p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/30">
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Status e validacoes</h3>
          <div className="mt-3 space-y-3">
            <div className="rounded-lg border border-neutral-200 bg-neutral-50/80 p-3 dark:border-neutral-700 dark:bg-neutral-900/55">
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Ativo</span>
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
                  {activeStatus ? "Ativo" : "Inativo"}
                </span>
              </label>
            </div>

            {(hasInvalidMode || hasMissingFields || hasNoItems) && (
              <div className="space-y-1 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
                {hasInvalidMode && (
                  <p>
                    {mode === "percentage"
                      ? "Todos os itens devem ter percentual e a soma deve ser exatamente 100%."
                      : "No modo participacao, a distribuicao deve fechar em 100%."}
                  </p>
                )}
                {hasMissingFields && <p>Informe centro de custo e loja em todos os itens.</p>}
                {hasNoItems && <p>Adicione pelo menos um item de rateio.</p>}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Rateio</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Defina o modo de rateio e preencha os itens por centro de custo e loja.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300">
              <span>Modo:</span>
              <button
                type="button"
                onClick={() => handleModeChange("percentage")}
                className={[
                  "rounded-full border px-3 py-1.5 transition-colors",
                  mode === "percentage"
                    ? "border-pilar-green bg-pilar-green/10 text-pilar-green dark:bg-pilar-green/20"
                    : "border-neutral-300 text-neutral-600 hover:border-neutral-400 dark:border-neutral-600 dark:text-neutral-400 dark:hover:border-neutral-500",
                ].join(" ")}
              >
                Porcentagem
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("participation")}
                className={[
                  "rounded-full border px-3 py-1.5 transition-colors",
                  mode === "participation"
                    ? "border-pilar-green bg-pilar-green/10 text-pilar-green dark:bg-pilar-green/20"
                    : "border-neutral-300 text-neutral-600 hover:border-neutral-400 dark:border-neutral-600 dark:text-neutral-400 dark:hover:border-neutral-500",
                ].join(" ")}
              >
                Participacao
              </button>
            </div>

            <button
              type="button"
              onClick={addRow}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-pilar-green bg-pilar-green px-3 py-2 text-sm text-white transition-colors hover:bg-pilar-green/90"
              title="Adicionar linha"
            >
              <AddIcon fontSize="small" />
              Adicionar item
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-neutral-200 bg-neutral-50/80 p-3 dark:border-neutral-700 dark:bg-neutral-900/55">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Itens cadastrados</p>
            <p className="mt-1 text-base font-semibold text-neutral-800 dark:text-neutral-100">{items.length}</p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-neutral-50/80 p-3 dark:border-neutral-700 dark:bg-neutral-900/55">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Total de percentual</p>
            <p className="mt-1 text-base font-semibold text-neutral-800 dark:text-neutral-100">{roundedTotal.toFixed(2)}%</p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-neutral-50/80 p-3 dark:border-neutral-700 dark:bg-neutral-900/55">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Status do rateio</p>
            <p className={["mt-1 text-sm font-semibold", disabled ? "text-amber-600 dark:text-amber-300" : "text-emerald-600 dark:text-emerald-300"].join(" ")}>
              {disabled ? "Pendente de ajustes" : "Pronto para salvar"}
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50/80 p-4 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900/55 dark:text-neutral-400">
            Nenhum item de rateio disponivel.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
            <table className="w-full min-w-[1200px] text-sm text-neutral-700 dark:text-neutral-100">
              <thead className="bg-neutral-100 text-left text-xs uppercase tracking-wide text-neutral-600 dark:bg-neutral-800/80 dark:text-neutral-300">
                <tr>
                  <th className="px-3 py-2">Centro de custo</th>
                  <th className="px-3 py-2">Loja</th>
                  <th className="px-3 py-2">Percentual</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Acoes</th>
                </tr>
              </thead>
              <tbody className="text-neutral-700 dark:text-neutral-100">
                {items.map((item, index) => (
                  <tr key={item.key} className="border-t border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800/60">
                    <td className="px-3 py-2 align-top">
                      <CodeDescriptionLookup
                        code={item.costCenterId ?? null}
                        options={costCenterOptions}
                        onCodeChange={(selectedCode) =>
                          handleChange(index, { costCenterId: selectedCode, isNew: true })
                        }
                        disabled={!item.isNew && isEdit}
                        codePlaceholder="ID"
                        descriptionPlaceholder="Centro de custo"
                        invalidCodeMessage="Centro de custo invalido."
                        modalTitle="Selecionar centro de custo"
                        modalLabelHeader="Descricao"
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <CodeDescriptionLookup
                        code={item.storeId ?? null}
                        options={storeOptions}
                        onCodeChange={(selectedCode) =>
                          handleChange(index, { storeId: selectedCode, isNew: true })
                        }
                        disabled={!item.isNew && isEdit}
                        codePlaceholder="ID"
                        descriptionPlaceholder="Loja"
                        invalidCodeMessage="Loja invalida."
                        modalTitle="Selecionar loja"
                        modalLabelHeader="Descricao"
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.percentage ?? ""}
                        onChange={(e) =>
                          handleChange(index, { percentage: e.target.value === "" ? null : Number(e.target.value) })
                        }
                        className={`w-32 ${fieldControlBaseClass}`}
                        placeholder="0,00"
                        disabled={mode !== "percentage"}
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span className="text-xs text-neutral-600 dark:text-neutral-300">
                        {mode === "participation" ? "Participacao" : "Porcentagem"}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <IconButton
                        onClick={() => removeRow(index)}
                        variant="danger"
                        title="Remover"
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </form>
  );
}



