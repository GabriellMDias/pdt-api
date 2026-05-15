import { useEffect, useMemo, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import SearchIcon from "@mui/icons-material/Search";
import DefaultButton from "../../../../components/inputs/DefaultButton";
import StoreSelect from "../../../../components/inputs/StoreSelect";
import { fieldControlBaseClass } from "../../../../components/inputs/styles";
import { toast } from "react-toastify";
import {
  RESULTADO_DIARIO_DIRECT_FIELDS,
  type ResultadoDiarioLineConfig,
} from "../resultado-diario.config";
import { resolveResultadoDiarioTable } from "../resultado-diario.calculations";
import type { DRE, DREByCostCenter } from "../types";
import type {
  DailyResultEditLine,
  DailyResultEditValuesResponse,
  DailyResultEditValuesSaveResponse,
} from "../hooks/useDRE";

type Props = {
  open: boolean;
  selectedStoreIds: string[];
  startDate: string;
  lineConfig: readonly ResultadoDiarioLineConfig[];
  fetchEditableValues: (filters: {
    month: string;
    storeId: string | number;
  }) => Promise<DailyResultEditValuesResponse>;
  saveEditableValues: (payload: {
    month: string;
    storeId: string | number;
    changes: Array<{
      costCenterId: number;
      lineId: string;
      value: number;
    }>;
  }) => Promise<DailyResultEditValuesSaveResponse>;
  onClose: () => void;
};

type DraftValues = Record<string, string>;

const defaultOrder = [3, 8, 9, 10, 11];

const money = (value: number) =>
  (value ?? 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const percent = (value: number) =>
  `${((value ?? 0) * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} %`;

export default function EditarValoresResultadoModal({
  open,
  selectedStoreIds,
  startDate,
  lineConfig,
  fetchEditableValues,
  saveEditableValues,
  onClose,
}: Props) {
  const [month, setMonth] = useState("");
  const [storeId, setStoreId] = useState<number | null>(null);
  const [result, setResult] = useState<DailyResultEditValuesResponse | null>(null);
  const [draftValues, setDraftValues] = useState<DraftValues>({});
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const selectedStore = Number(selectedStoreIds[0]);
    setMonth(dateToMonthInput(startDate) || currentMonthInput());
    setStoreId(Number.isFinite(selectedStore) ? selectedStore : null);
    setResult(null);
    setDraftValues({});
    setError(null);
  }, [open, selectedStoreIds, startDate]);

  const visibleLines = useMemo(
    () => result?.lines.filter((line) => line.visible !== false) ?? [],
    [result],
  );

  const columns = useMemo(() => {
    if (!result) return [];

    return [...result.costCenters].sort((a, b) => {
      const aIndex = defaultOrder.indexOf(a.costCenterId);
      const bIndex = defaultOrder.indexOf(b.costCenterId);
      const aRank = aIndex === -1 ? Number.POSITIVE_INFINITY : aIndex;
      const bRank = bIndex === -1 ? Number.POSITIVE_INFINITY : bIndex;

      if (aRank !== bRank) return aRank - bRank;
      return String(a.costCenterName || "").localeCompare(
        String(b.costCenterName || ""),
      );
    });
  }, [result]);

  const resolvedTable = useMemo(() => {
    if (!result) return null;

    const data: DREByCostCenter[] = result.costCenters.map((row) => ({
      costCenterId: row.costCenterId,
      data: buildEditedDirectValues(row.directValues, row.costCenterId, result.lines, draftValues),
    }));

    return resolveResultadoDiarioTable(data, lineConfig);
  }, [draftValues, lineConfig, result]);

  const changedCells = useMemo(() => collectChangedCells(result, draftValues), [draftValues, result]);
  const changedCount = changedCells.length;
  const hasInvalidDraft = useMemo(() => hasInvalidDraftValue(result, draftValues), [draftValues, result]);

  async function pesquisar() {
    setError(null);

    if (!month) {
      setError("Informe o mes/ano.");
      return;
    }

    if (storeId === null) {
      setError("Selecione uma loja.");
      return;
    }

    try {
      setLoadingSearch(true);
      const response = await fetchEditableValues({ month, storeId });
      setResult(response);
      setDraftValues({});
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      toast.error(message);
    } finally {
      setLoadingSearch(false);
    }
  }

  async function salvar() {
    setError(null);

    if (!result || storeId === null) {
      setError("Pesquise os dados antes de salvar.");
      return;
    }

    if (hasInvalidDraft) {
      setError("Revise os valores informados antes de salvar.");
      return;
    }

    if (changedCells.length === 0) {
      toast.info("Nenhuma alteracao para salvar.");
      return;
    }

    try {
      setLoadingSave(true);
      await saveEditableValues({
        month,
        storeId,
        changes: changedCells.map((cell) => ({
          costCenterId: cell.costCenterId,
          lineId: cell.lineId,
          value: cell.value,
        })),
      });
      toast.success("Valores salvos com sucesso.");
      const response = await fetchEditableValues({ month, storeId });
      setResult(response);
      setDraftValues({});
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      toast.error(message);
    } finally {
      setLoadingSave(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-neutral-900/45 px-4 backdrop-blur-sm dark:bg-black/60"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-modal="true"
      role="dialog"
    >
      <div className="flex max-h-[92vh] w-full max-w-[1180px] flex-col rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-pilar-default-bg-dark">
        <div className="flex items-start justify-between gap-3 border-b border-neutral-200 p-4 dark:border-white/10">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-neutral-800 dark:text-white">
              Editar valores do Resultado
            </h2>
          </div>
          <button
            type="button"
            className="text-neutral-500 transition-colors hover:text-neutral-700 dark:text-white/70 dark:hover:text-white"
            onClick={onClose}
            aria-label="Fechar"
          >
            <CloseIcon fontSize="small" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-auto p-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/30 dark:text-red-200">
              {error}
            </div>
          )}

          <section className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-4 dark:border-neutral-700 dark:bg-neutral-900/45">
            <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Filtros</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[180px_minmax(220px,1fr)_150px]">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Mes/ano
                </span>
                <input
                  className={fieldControlBaseClass}
                  type="month"
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Loja
                </span>
                <StoreSelect
                  permissionCode="dre:consultar"
                  value={storeId}
                  onChange={setStoreId}
                  placeholder="Selecione a loja..."
                  onlyActive
                  className="w-full"
                />
              </label>
              <div className="flex items-end">
                <DefaultButton
                  type="button"
                  disabled={loadingSearch || loadingSave}
                  className="w-full"
                  iconLeft={<SearchIcon fontSize="small" />}
                  onClick={pesquisar}
                >
                  {loadingSearch ? "Pesquisando..." : "Pesquisar"}
                </DefaultButton>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white p-2 dark:border-neutral-700 dark:bg-neutral-900/45">
            {!result ? (
              <div className="p-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                Nenhum dado carregado.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg">
                <table className="min-w-[920px] w-full border border-slate-600 text-sm text-black">
                  <thead className="bg-slate-300">
                    <tr>
                      <th className="sticky left-0 z-10 min-w-[280px] border border-slate-600 bg-slate-300 px-2 py-2 text-left font-bold">
                        Setor
                      </th>
                      {columns.map((column) => (
                        <th
                          key={column.costCenterId}
                          className="border border-slate-600 px-2 py-2 text-left font-bold"
                        >
                          {column.costCenterName || column.costCenterId}
                        </th>
                      ))}
                      <th className="border border-slate-600 px-2 py-2 text-left font-bold">
                        TOTAL
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleLines.map((line) => (
                      <tr key={line.lineId} className={line.shade ? "bg-slate-300" : "bg-white"}>
                        <td
                          className={[
                            "sticky left-0 z-10 border border-slate-600 px-2 py-1 text-left",
                            line.shade ? "bg-slate-300" : "bg-white",
                          ].join(" ")}
                        >
                          <span className={line.bold ? "font-bold" : ""}>{line.label}</span>
                        </td>

                        {columns.map((column) => {
                          const cell = column.cells[line.lineId];
                          const value = getDisplayValue({
                            line,
                            costCenterId: column.costCenterId,
                            fallbackValue: cell?.value ?? 0,
                            resolvedTable,
                            draftValues,
                          });
                          const editable = Boolean(cell?.editable);
                          const changed = editable && isCellChanged({
                            result,
                            draftValues,
                            costCenterId: column.costCenterId,
                            lineId: line.lineId,
                          });

                          return (
                            <td
                              key={`${line.lineId}-${column.costCenterId}`}
                              className={[
                                "border border-slate-600 px-2 py-1 whitespace-nowrap text-right",
                                line.bold ? "font-bold" : "",
                                value < 0 ? "text-red-500" : "",
                                changed ? "bg-amber-50" : "",
                              ].join(" ")}
                            >
                              {editable ? (
                                <input
                                  className={[
                                    "h-8 w-28 rounded-md border px-2 text-right text-sm font-normal text-neutral-900",
                                    changed
                                      ? "border-amber-400 bg-amber-50"
                                      : "border-neutral-300 bg-white",
                                    "focus:border-pilar-green focus:outline-none focus:ring-2 focus:ring-pilar-green/30",
                                  ].join(" ")}
                                  type="number"
                                  step="0.01"
                                  value={getDraftValue(result, draftValues, column.costCenterId, line.lineId)}
                                  onChange={(event) =>
                                    setDraftValues((current) => ({
                                      ...current,
                                      [draftKey(column.costCenterId, line.lineId)]: event.target.value,
                                    }))
                                  }
                                />
                              ) : (
                                formatValue(line, value)
                              )}
                            </td>
                          );
                        })}

                        {(() => {
                          const totalValue = getTotalDisplayValue({
                            line,
                            fallbackValue: result.total.cells[line.lineId]?.value ?? 0,
                            resolvedTable,
                          });

                          return (
                            <td
                              className={[
                                "border border-slate-600 px-2 py-1 whitespace-nowrap text-right",
                                line.bold ? "font-bold" : "",
                                totalValue < 0 ? "text-red-500" : "",
                              ].join(" ")}
                            >
                              {formatValue(line, totalValue)}
                            </td>
                          );
                        })()}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-neutral-200 p-4 dark:border-white/10">
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            {result ? `${changedCount} alteracao(oes) pendente(s)` : ""}
          </div>
          <div className="flex gap-2">
            <DefaultButton type="button" variant="secondary" onClick={onClose}>
              Fechar
            </DefaultButton>
            <DefaultButton
              type="button"
              disabled={!result || loadingSearch || loadingSave || changedCount === 0 || hasInvalidDraft}
              iconLeft={<SaveIcon fontSize="small" />}
              onClick={salvar}
            >
              {loadingSave ? "Salvando..." : "Salvar"}
            </DefaultButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildEditedDirectValues(
  original: DRE,
  costCenterId: number,
  lines: DailyResultEditLine[],
  draftValues: DraftValues,
): DRE {
  const data = { ...original };

  for (const line of lines) {
    if (!line.editable || !line.sourceField) continue;

    const draft = draftValues[draftKey(costCenterId, line.lineId)];
    if (draft === undefined) continue;

    const numeric = parseDraftNumber(draft);
    if (numeric === null) continue;

    data[line.sourceField] = numeric;
  }

  for (const field of RESULTADO_DIARIO_DIRECT_FIELDS) {
    data[field] = data[field] ?? 0;
  }

  return data;
}

function getDisplayValue({
  line,
  costCenterId,
  fallbackValue,
  resolvedTable,
  draftValues,
}: {
  line: DailyResultEditLine;
  costCenterId: number;
  fallbackValue: number;
  resolvedTable: ReturnType<typeof resolveResultadoDiarioTable> | null;
  draftValues: DraftValues;
}) {
  if (line.editable) {
    const draft = draftValues[draftKey(costCenterId, line.lineId)];
    if (draft !== undefined) {
      return parseDraftNumber(draft) ?? fallbackValue;
    }
  }

  return resolvedTable?.byCostCenter[costCenterId]?.[line.lineId] ?? fallbackValue;
}

function getTotalDisplayValue({
  line,
  fallbackValue,
  resolvedTable,
}: {
  line: DailyResultEditLine;
  fallbackValue: number;
  resolvedTable: ReturnType<typeof resolveResultadoDiarioTable> | null;
}) {
  return resolvedTable?.total[line.lineId] ?? fallbackValue;
}

function collectChangedCells(result: DailyResultEditValuesResponse | null, draftValues: DraftValues) {
  if (!result) return [];

  const changes: Array<{
    costCenterId: number;
    lineId: string;
    value: number;
  }> = [];

  for (const row of result.costCenters) {
    for (const line of result.lines) {
      const cell = row.cells[line.lineId];
      if (!cell?.editable) continue;

      const draft = draftValues[draftKey(row.costCenterId, line.lineId)];
      if (draft === undefined) continue;

      const value = parseDraftNumber(draft);
      if (value === null) continue;
      if (sameNumber(value, cell.value)) continue;

      changes.push({
        costCenterId: row.costCenterId,
        lineId: line.lineId,
        value,
      });
    }
  }

  return changes;
}

function hasInvalidDraftValue(result: DailyResultEditValuesResponse | null, draftValues: DraftValues) {
  if (!result) return false;

  return Object.entries(draftValues).some(([key, value]) => {
    const [costCenterId, lineId] = key.split(":");
    const row = result.costCenters.find((item) => String(item.costCenterId) === costCenterId);
    const cell = row?.cells[lineId];
    return Boolean(cell?.editable) && parseDraftNumber(value) === null;
  });
}

function isCellChanged({
  result,
  draftValues,
  costCenterId,
  lineId,
}: {
  result: DailyResultEditValuesResponse;
  draftValues: DraftValues;
  costCenterId: number;
  lineId: string;
}) {
  const row = result.costCenters.find((item) => item.costCenterId === costCenterId);
  const original = row?.cells[lineId]?.value ?? 0;
  const draft = draftValues[draftKey(costCenterId, lineId)];
  const value = draft === undefined ? original : parseDraftNumber(draft);

  return value !== null && !sameNumber(value, original);
}

function getDraftValue(
  result: DailyResultEditValuesResponse,
  draftValues: DraftValues,
  costCenterId: number,
  lineId: string,
) {
  const key = draftKey(costCenterId, lineId);
  if (draftValues[key] !== undefined) return draftValues[key];

  const row = result.costCenters.find((item) => item.costCenterId === costCenterId);
  const value = row?.cells[lineId]?.value ?? 0;
  return formatNumberForInput(value);
}

function formatValue(line: DailyResultEditLine, value: number) {
  if (line.sourceType === "GROUP") return "";
  return line.format === "percent" ? percent(value) : money(value);
}

function formatNumberForInput(value: number) {
  return Number((value ?? 0).toFixed(2)).toString();
}

function parseDraftNumber(value: string) {
  if (!value.trim()) return null;
  const normalized = Number(value.replace(",", "."));
  return Number.isFinite(normalized) ? normalized : null;
}

function draftKey(costCenterId: number, lineId: string) {
  return `${costCenterId}:${lineId}`;
}

function sameNumber(a: number, b: number) {
  return Math.abs(a - b) < 1e-9;
}

function dateToMonthInput(value: string) {
  return /^\d{4}-\d{2}/.exec(value)?.[0] ?? "";
}

function currentMonthInput() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
