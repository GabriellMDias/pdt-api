import React from "react";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import { IconButton } from "../../../../../components/crud/primitives";
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
  const [lookupOpen, setLookupOpen] = React.useState(false);
  const [lookupType, setLookupType] = React.useState<"costCenter" | "store">("costCenter");
  const [lookupRowIndex, setLookupRowIndex] = React.useState<number | null>(null);
  const [lookupSearch, setLookupSearch] = React.useState("");
  const [lookupLoading, setLookupLoading] = React.useState(false);

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
      costCenterId: item.costCenterId === null || item.costCenterId === undefined || item.costCenterId === ""
        ? null
        : Number(item.costCenterId),
      storeId: item.storeId === null || item.storeId === undefined || item.storeId === ""
        ? null
        : Number(item.storeId),
      percentage: item.percentage === null || item.percentage === undefined || item.percentage === ""
        ? null
        : Number(item.percentage),
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

  const filteredCostCenters = React.useMemo(() => {
    if (!lookupSearch.trim()) return costCenters;
    const q = lookupSearch.toLowerCase();
    return costCenters.filter((cc) => `${cc.id} ${cc.description}`.toLowerCase().includes(q));
  }, [costCenters, lookupSearch]);

  const filteredStores = React.useMemo(() => {
    if (!lookupSearch.trim()) return stores;
    const q = lookupSearch.toLowerCase();
    return stores.filter((store) =>
      `${store.id} ${store.storeName ?? ""} ${store.description ?? ""}`.toLowerCase().includes(q)
    );
  }, [stores, lookupSearch]);

  const openLookup = async (type: "costCenter" | "store", rowIndex: number) => {
    setLookupType(type);
    setLookupRowIndex(rowIndex);
    setLookupSearch("");
    setLookupOpen(true);
    if (type === "costCenter" && costCenters.length === 0) {
      await loadCostCenters();
    }
    if (type === "store" && stores.length === 0) {
      await loadStores();
    }
  };

  const loadCostCenters = async () => {
    setLookupLoading(true);
    try {
      const data = await api<CostCenterOption[]>(`${API_BASE}/api/cost-centers`, {
        headers: authHeaders(token),
      });
      setCostCenters(data);
    } finally {
      setLookupLoading(false);
    }
  };

  const loadStores = async () => {
    setLookupLoading(true);
    try {
      const data = await api<StoreOption[]>(`${API_BASE}/api/stores`, {
        headers: authHeaders(token),
      });
      setStores(data);
    } finally {
      setLookupLoading(false);
    }
  };

  const selectLookupValue = (id: number) => {
    if (lookupRowIndex === null) return;
    if (lookupType === "costCenter") {
      handleChange(lookupRowIndex, { costCenterId: id, isNew: true });
    } else {
      handleChange(lookupRowIndex, { storeId: id, isNew: true });
    }
    setLookupOpen(false);
  };

  const costCenterLabel = (id?: number | null) => {
    if (!id) return "-";
    const match = costCenters.find((cc) => cc.id === id);
    return match ? `${match.id} - ${match.description}` : String(id);
  };

  const storeLabel = (id?: number | null) => {
    if (!id) return "-";
    const match = stores.find((store) => store.id === id);
    if (!match) return String(id);
    const label = match.storeName || match.description || "-";
    return `${match.id} - ${label}`;
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
                  <th className="text-left px-3">Descrição</th>
                  <th className="text-left px-3">Percentual</th>
                  <th className="text-left px-3">Tipo</th>
                  <th className="text-left px-3">Ações</th>
                </tr>
              </thead>
              <tbody className="text-neutral-100">
                {items.map((item, index) => (
                  <tr key={item.key} className="bg-neutral-950/40">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
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
                          className="w-32 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                          placeholder="ID"
                          disabled={!item.isNew && isEdit}
                        />
                        <IconButton
                          onClick={() => openLookup("costCenter", index)}
                          variant="default"
                          title="Buscar centro de custo"
                        >
                          <SearchIcon />
                        </IconButton>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
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
                        <IconButton
                          onClick={() => openLookup("store", index)}
                          variant="default"
                          title="Buscar loja"
                        >
                          <SearchIcon />
                        </IconButton>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-neutral-300">
                      <div>{costCenterLabel(item.costCenterId)}</div>
                      <div>{storeLabel(item.storeId)}</div>
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
                      <span className="text-xs text-neutral-300">
                        {mode === "participation" ? "Participação" : "Porcentagem"}
                      </span>
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
      {lookupOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setLookupOpen(false);
          }}
          aria-modal="true"
          role="dialog"
        >
          <div className="w-full max-w-3xl rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 p-4">
              <h2 className="text-lg font-semibold text-neutral-100">
                {lookupType === "costCenter" ? "Selecionar centro de custo" : "Selecionar loja"}
              </h2>
              <button
                type="button"
                className="text-neutral-300 hover:text-white transition-colors cursor-pointer"
                onClick={() => setLookupOpen(false)}
                aria-label="Fechar"
              >
                <CloseIcon fontSize="small" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <input
                className="w-full rounded-xl border border-neutral-700 bg-neutral-900 p-3 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="Buscar..."
                value={lookupSearch}
                onChange={(e) => setLookupSearch(e.target.value)}
              />
              {lookupLoading ? (
                <div className="text-sm text-neutral-400">Carregando...</div>
              ) : (
                <div className="max-h-[360px] overflow-y-auto rounded-xl border border-neutral-800">
                  <table className="min-w-full text-sm">
                    <thead className="bg-neutral-950 text-left text-neutral-300">
                      <tr>
                        <th className="p-3 w-28">ID</th>
                        <th className="p-3">Descrição</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(lookupType === "costCenter" ? filteredCostCenters : filteredStores).map((row) => (
                        <tr
                          key={row.id}
                          className="border-t border-neutral-800 hover:bg-neutral-800/60 cursor-pointer"
                          onClick={() => selectLookupValue(row.id)}
                        >
                          <td className="p-3 text-neutral-100">{row.id}</td>
                          <td className="p-3 text-neutral-200">
                            {"description" in row && row.description
                              ? row.description
                              : row.storeName ?? "-"}
                          </td>
                        </tr>
                      ))}
                      {(lookupType === "costCenter" ? filteredCostCenters : filteredStores).length === 0 && (
                        <tr>
                          <td colSpan={2} className="p-4 text-center text-neutral-400">
                            Nenhum resultado encontrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
