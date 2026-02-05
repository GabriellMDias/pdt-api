import React from "react";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { IconButton } from "../../../../../components/crud/primitives";
import type { CostCenterTypeItem, UpdateCostCenterTypePayload } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function CostCenterTypeRateioForm({ initial, onCancel, onSubmit, submitting, isEdit, maySubmit }: any) {
  const [items, setItems] = React.useState<CostCenterTypeItem[]>([]);

  React.useEffect(() => {
    setItems(
      (initial?.costCenterTypeItems ?? []).map((item: CostCenterTypeItem) => ({
        costCenterId: item.costCenterId ?? null,
        storeId: item.storeId ?? null,
        percentage: item.percentage ?? null,
        participation: item.participation ?? false,
      }))
    );
  }, [initial]);

  const handleChange = (index: number, value: Partial<CostCenterTypeItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...value } : item)));
  };

  const parsedItems = React.useMemo<CostCenterTypeItem[]>(() => (
    items.map((item) => ({
      costCenterId: item.costCenterId ?? null,
      storeId: item.storeId ?? null,
      percentage: item.percentage === null || item.percentage === undefined || item.percentage === ""
        ? null
        : Number(item.percentage),
      participation: item.participation ?? false,
    }))
  ), [items]);

  const totalPercentage = React.useMemo(() => (
    parsedItems.reduce((acc, item) => acc + (typeof item.percentage === "number" ? item.percentage : 0), 0)
  ), [parsedItems]);

  const hasPercentage = React.useMemo(
    () => parsedItems.some((item) => item.percentage !== null && item.percentage !== undefined),
    [parsedItems]
  );
  const roundedTotal = React.useMemo(() => (
    Math.round((totalPercentage + Number.EPSILON) * 100) / 100
  ), [totalPercentage]);
  const percentageInvalid = hasPercentage && roundedTotal !== 100;

  const disabled = submitting || !maySubmit || percentageInvalid;

  return (
    <form
      className="space-y-6"
      autoComplete="off"
      onSubmit={async (e) => {
        e.preventDefault();
        if (disabled) return;
        const payload: UpdateCostCenterTypePayload = {
          costCenterTypeItems: parsedItems,
        };
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
          <div>
            <span className="text-xs text-neutral-400">Descrição</span>
            <p className="text-sm text-neutral-100">{initial?.description ?? "-"}</p>
          </div>
          <div>
            <span className="text-xs text-neutral-400">ID VR</span>
            <p className="text-sm text-neutral-100">{initial?.id_costcentertype_vr ?? "-"}</p>
          </div>
          <div>
            <span className="text-xs text-neutral-400">Código Sankhya</span>
            <p className="text-sm text-neutral-100">{initial?.codcencus_sankhya ?? "-"}</p>
          </div>
          <div>
            <span className="text-xs text-neutral-400">Verificado</span>
            <p className="text-sm text-neutral-100">{initial?.verified ? "Sim" : "Não"}</p>
          </div>
          <div>
            <span className="text-xs text-neutral-400">Usa rateio por loja</span>
            <p className="text-sm text-neutral-100">{initial?.useParticipationStore ? "Sim" : "Não"}</p>
          </div>
          <div>
            <span className="text-xs text-neutral-400">Usa rateio por centro de custo</span>
            <p className="text-sm text-neutral-100">{initial?.useParticipationCostCenter ? "Sim" : "Não"}</p>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-200">Rateio</h3>
            <p className="text-xs text-neutral-400">
              Edite apenas o percentual e a participação. Não é possível alterar centro de custo ou loja.
            </p>
          </div>
          <div className="text-xs text-neutral-300">
            Total atual: <span className="font-semibold text-neutral-100">{roundedTotal.toFixed(2)}%</span>
          </div>
        </div>
        {percentageInvalid && (
          <div className="text-xs text-red-400">
            A soma dos percentuais deve ser exatamente 100% para salvar as alterações.
          </div>
        )}

        {items.length === 0 ? (
          <div className="text-sm text-neutral-400">Nenhum item de rateio disponível.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-separate border-spacing-y-2 text-sm">
              <thead className="text-xs uppercase text-neutral-400">
                <tr>
                  <th className="text-left px-3">Centro de custo</th>
                  <th className="text-left px-3">Loja</th>
                  <th className="text-left px-3">Percentual</th>
                  <th className="text-left px-3">Participa</th>
                </tr>
              </thead>
              <tbody className="text-neutral-100">
                {items.map((item, index) => (
                  <tr key={`${item.costCenterId ?? "cc"}-${item.storeId ?? "store"}-${index}`} className="bg-neutral-950/40">
                    <td className="px-3 py-2">
                      <span className="text-neutral-200">{item.costCenterId ?? "-"}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-neutral-200">{item.storeId ?? "-"}</span>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.percentage ?? ""}
                        onChange={(e) => handleChange(index, { percentage: e.target.value === "" ? null : Number(e.target.value) })}
                        className="w-32 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                        placeholder="0,00"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <label className="flex items-center gap-2 text-xs text-neutral-200">
                        <input
                          type="checkbox"
                          checked={Boolean(item.participation)}
                          onChange={(e) => handleChange(index, { participation: e.target.checked })}
                          className="h-4 w-4 rounded border-neutral-600 bg-neutral-900 text-blue-600 focus:ring-blue-600"
                        />
                        Participa
                      </label>
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
