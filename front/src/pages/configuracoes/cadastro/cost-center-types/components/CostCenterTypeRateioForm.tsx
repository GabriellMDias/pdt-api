import React from "react";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import { IconButton } from "../../../../../components/crud/primitives";
import type { CostCenterTypeItem, CreateCostCenterTypePayload, UpdateCostCenterTypePayload } from "../types";

type RateioMode = "percentage" | "participation";

type RateioRow = CostCenterTypeItem & {
  key: string;
  isNew?: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function CostCenterTypeRateioForm({ initial, onCancel, onSubmit, submitting, isEdit, maySubmit }: any) {
  const [items, setItems] = React.useState<RateioRow[]>([]);
  const [description, setDescription] = React.useState("");
  const [activeStatus, setActiveStatus] = React.useState(true);
  const [mode, setMode] = React.useState<RateioMode>("percentage");

  React.useEffect(() => {
    setDescription(initial?.description ?? "");
    setActiveStatus(initial?.activeStatus ?? true);

    const initialItems = (initial?.costCenterTypeItems ?? []).map((item: CostCenterTypeItem, idx: number) => ({
      key: `${item.costCenterId ?? "cc"}-${item.storeId ?? "store"}-${idx}`,
      costCenterId: item.costCenterId ?? null,
      storeId: item.storeId ?? null,
      percentage: initial?.useParticipationCostCenter ? null : item.percentage ?? null,
      participation: item.participation ?? false,
      isNew: false,
    }));

    setItems(initialItems);

    const hasPercentage = initialItems.some((item) => item.percentage !== null && item.percentage !== undefined);
    if (initial?.useParticipationCostCenter) {
      setMode("participation");
    } else {
      setMode(hasPercentage ? "percentage" : "participation");
    }
  }, [initial]);

  const handleChange = (index: number, value: Partial<RateioRow>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...value } : item)));
  };

  const handleModeChange = (nextMode: RateioMode) => {
    setMode(nextMode);
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        percentage: nextMode === "percentage" ? item.percentage ?? 0 : null,
        participation: nextMode === "participation" ? item.participation ?? false : false,
      }))
    );
  };

  const addRow = () => {
    setItems((prev) => [
      ...prev,
      {
        key: `new-${Date.now()}-${Math.random()}`,
        costCenterId: null,
        storeId: null,
        percentage: mode === "percentage" ? 0 : null,
        participation: mode === "participation" ? false : false,
        isNew: true,
      },
    ]);
  };

  const removeRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const parsedItems = React.useMemo<CostCenterTypeItem[]>(() => (
    items.map((item) => ({
      costCenterId: item.costCenterId === null || item.costCenterId === undefined || item.costCenterId === ""
        ? null
        : Number(item.costCenterId),
      storeId: item.storeId === null || item.storeId === undefined || item.storeId === ""
        ? null
        : Number(item.storeId),
      percentage: item.percentage === null || item.percentage === undefined || item.percentage === ""
        ? null
        : Number(item.percentage),
      participation: item.participation ?? false,
    }))
  ), [items]);

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
    const hasNullParticipation = parsedItems.some(
      (item) => item.participation === null || item.participation === undefined
    );

    if (mode === "percentage") {
      return !hasPercentage || hasNullPercentage || roundedTotal !== 100;
    }

    return hasPercentage || hasNullParticipation;
  }, [parsedItems, roundedTotal, mode]);

  const disabled = submitting || !maySubmit || hasMissingFields || hasInvalidMode || hasNoItems || (!isEdit && !description.trim());

  return (
    <form
      className="space-y-6"
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
          className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
          type="submit"
          disabled={disabled}
          title={isEdit ? "Salvar alterações" : "Cadastrar"}
        >
          {isEdit ? "Salvar alterações" : "Cadastrar"}
        </button>
      </div>

      <section className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
        <h3 className="text-sm font-semibold text-neutral-200">Dados do tipo de centro de custo</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-xs text-neutral-400">Descrição</span>
            {isEdit ? (
              <p className="text-sm text-neutral-100">{initial?.description ?? "-"}</p>
            ) : (
              <input
                className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição do tipo de centro de custo"
              />
            )}
          </label>
          <label className="block">
            <span className="text-xs text-neutral-400">Ativo</span>
            <div className="mt-2 flex items-center gap-2 text-sm text-neutral-200">
              <input
                type="checkbox"
                checked={activeStatus}
                onChange={(e) => setActiveStatus(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-600 bg-neutral-900 text-blue-600 focus:ring-blue-600"
              />
              {activeStatus ? "Sim" : "Não"}
            </div>
          </label>
          {isEdit && (
            <>
              <div>
                <span className="text-xs text-neutral-400">ID VR</span>
                <p className="text-sm text-neutral-100">{initial?.id_costcentertype_vr ?? "-"}</p>
              </div>
              <div>
                <span className="text-xs text-neutral-400">Código Sankhya</span>
                <p className="text-sm text-neutral-100">{initial?.codcencus_sankhya ?? "-"}</p>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-200">Rateio</h3>
            <p className="text-xs text-neutral-400">
              Defina se o rateio será por percentual ou participação e informe os itens.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-300">
            <span>Modo:</span>
            <button
              type="button"
              onClick={() => handleModeChange("percentage")}
              className={[
                "rounded-full px-3 py-1 border",
                mode === "percentage" ? "border-blue-500 text-blue-200" : "border-neutral-700 text-neutral-400",
              ].join(" ")}
            >
              Porcentagem
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("participation")}
              className={[
                "rounded-full px-3 py-1 border",
                mode === "participation" ? "border-blue-500 text-blue-200" : "border-neutral-700 text-neutral-400",
              ].join(" ")}
            >
              Participação
            </button>
          </div>
        </div>

        {mode === "percentage" && (
          <div className="text-xs text-neutral-300">
            Total atual: <span className="font-semibold text-neutral-100">{roundedTotal.toFixed(2)}%</span>
          </div>
        )}

        {hasInvalidMode && (
          <div className="text-xs text-red-400">
            {mode === "percentage"
              ? "Todos os itens devem ter percentual e a soma deve ser exatamente 100%."
              : "Todos os itens devem ser informados apenas por participação (sem percentual)."}
          </div>
        )}

        {hasMissingFields && (
          <div className="text-xs text-red-400">
            Informe centro de custo e loja em todos os itens.
          </div>
        )}
        {hasNoItems && (
          <div className="text-xs text-red-400">
            Adicione pelo menos um item de rateio.
          </div>
        )}

        <div className="flex justify-end">
          <IconButton onClick={addRow} variant="green" title="Adicionar linha">
            <AddIcon />
          </IconButton>
        </div>

        {items.length === 0 ? (
          <div className="text-sm text-neutral-400">Nenhum item de rateio disponível.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-separate border-spacing-y-2 text-sm">
              <thead className="text-xs uppercase text-neutral-400">
                <tr>
                  <th className="text-left px-3">Centro de custo</th>
                  <th className="text-left px-3">Loja</th>
                  <th className="text-left px-3">Percentual</th>
                  <th className="text-left px-3">Participa</th>
                  <th className="text-left px-3">Ações</th>
                </tr>
              </thead>
              <tbody className="text-neutral-100">
                {items.map((item, index) => (
                  <tr key={item.key} className="bg-neutral-950/40">
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={1}
                        value={item.costCenterId ?? ""}
                        onChange={(e) =>
                          handleChange(index, {
                            costCenterId: e.target.value === "" ? null : Number(e.target.value),
                            isNew: true,
                          })
                        }
                        className="w-36 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                        placeholder="ID"
                        disabled={!item.isNew && isEdit}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={1}
                        value={item.storeId ?? ""}
                        onChange={(e) =>
                          handleChange(index, {
                            storeId: e.target.value === "" ? null : Number(e.target.value),
                            isNew: true,
                          })
                        }
                        className="w-24 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                        placeholder="Loja"
                        disabled={!item.isNew && isEdit}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.percentage ?? ""}
                        onChange={(e) =>
                          handleChange(index, { percentage: e.target.value === "" ? null : Number(e.target.value) })
                        }
                        className="w-32 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                        placeholder="0,00"
                        disabled={mode !== "percentage"}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <label className="flex items-center gap-2 text-xs text-neutral-200">
                        <input
                          type="checkbox"
                          checked={Boolean(item.participation)}
                          onChange={(e) => handleChange(index, { participation: e.target.checked })}
                          className="h-4 w-4 rounded border-neutral-600 bg-neutral-900 text-blue-600 focus:ring-blue-600"
                          disabled={mode !== "participation"}
                        />
                        Participa
                      </label>
                    </td>
                    <td className="px-3 py-2">
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
