import { useCallback, useEffect, useMemo, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import type { CostCenter, DREByCostCenter, Store } from "../types";
import { ExportToExcelButton } from "../../../../components/table/exportTableToExcel/ExportToExcelButton";
import ColumnMultiSelectFilter, {
  type ColumnMultiSelectFilterOption,
} from "../../../../components/table/ColumnMultiSelectFilter";
import SimpleTable, {
  type Column,
  type SortState,
} from "../../../../components/table/SimpleTable";
import {
  RESULTADO_DIARIO_LINE_CONFIG,
  getResultadoDiarioImplementedDetailKey,
  isResultadoDiarioValueLine,
  type ResultadoDiarioLineConfig,
} from "../resultado-diario.config";
import { resolveResultadoDiarioTable } from "../resultado-diario.calculations";
import type { ResultLineDetailItem, ResultLineDetailsResponse } from "../hooks/useDRE";

type Props = {
  data: DREByCostCenter[];
  costCenters: CostCenter[];
  stores: Store[];
  selectedStoreIds: Array<string | number>;
  start?: string;
  end?: string;
  lineConfig?: readonly ResultadoDiarioLineConfig[];
  fetchResultLineDetails?: (lineId: string, filters: {
    initialDate: string;
    finalDate: string;
    storeIds: Array<string | number>;
    costCenterIds?: Array<string | number>;
  }) => Promise<ResultLineDetailsResponse>;
};

type DetailColumnKey =
  | "date"
  | "store"
  | "sourceStore"
  | "allocationStore"
  | "costCenter"
  | "account"
  | "dreLine"
  | "allocationPercent"
  | "origin"
  | "description"
  | "debitValue"
  | "creditValue"
  | "value";

type DetailColumnFilters = Partial<Record<DetailColumnKey, string[]>>;

type ResultLineDetailGridRow = ResultLineDetailItem & {
  rowKey: string;
  dateLabel: string;
  storeLabel: string;
  sourceStoreLabel: string;
  allocationStoreLabel: string;
  costCenterLabel: string;
  accountLabel: string;
  dreLineLabel: string;
  allocationPercentLabel: string;
  debitLabel: string;
  creditLabel: string;
  valueLabel: string;
};

const money = (v: number) =>
  (v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const percent = (v: number) =>
  `${((v ?? 0) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;

const NEG = (v: number) => v < 0;

const defaultOrder = [3, 8, 9, 10, 11]; // FLV, PADARIA, ACOUGUE, SECOS, ROTISSERIA

export default function DRETable({
  data,
  costCenters,
  stores,
  selectedStoreIds,
  start,
  end,
  lineConfig = RESULTADO_DIARIO_LINE_CONFIG,
  fetchResultLineDetails,
}: Props) {
  const [activeDetailLine, setActiveDetailLine] = useState<ResultadoDiarioLineConfig | null>(null);
  const [lineDetails, setLineDetails] = useState<ResultLineDetailsResponse | null>(null);
  const [lineDetailLoading, setLineDetailLoading] = useState(false);
  const [lineDetailError, setLineDetailError] = useState<string | null>(null);

  // mapa CostCenter -> descricao
  const ccDesc = useMemo(() => {
    const m = new Map<number, string>();
    costCenters.forEach((c) => m.set(c.id, String(c.description)));
    return m;
  }, [costCenters]);

  const storeDesc = useMemo(() => {
    const m = new Map<number, string>();
    stores.forEach((store) =>
      m.set(store.id, store.storeName || store.description || `Loja ${store.id}`),
    );
    return m;
  }, [stores]);

  // ordem de colunas (somente CCs que vieram no payload)
  const cols = useMemo(() => {
    const ids = data.map((d) => d.costCenterId);
    return [...ids].sort((a, b) => {
      const ia = defaultOrder.indexOf(a);
      const ib = defaultOrder.indexOf(b);
      const ra = ia === -1 ? Number.POSITIVE_INFINITY : ia;
      const rb = ib === -1 ? Number.POSITIVE_INFINITY : ib;
      if (ra !== rb) return ra - rb;
      // fallback: por descricao
      return (ccDesc.get(a) || "").localeCompare(ccDesc.get(b) || "");
    });
  }, [data, ccDesc]);

  const { byCostCenter: byCC, total: totalCalc } = useMemo(
    () => resolveResultadoDiarioTable(data, lineConfig),
    [data, lineConfig],
  );

  const visibleLineConfig = useMemo(
    () => lineConfig.filter((line) => line.visible !== false && line.active !== false),
    [lineConfig],
  );

  const detailFilterKey = useMemo(
    () => [
      start,
      end,
      selectedStoreIds.map(String).sort().join(","),
      cols.map(String).sort().join(","),
    ].join("|"),
    [cols, end, selectedStoreIds, start],
  );

  useEffect(() => {
    setActiveDetailLine(null);
    setLineDetails(null);
    setLineDetailError(null);
  }, [detailFilterKey]);

  useEffect(() => {
    if (!activeDetailLine) return;

    const closeOnEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveDetailLine(null);
      }
    };

    window.addEventListener("keydown", closeOnEsc);
    return () => window.removeEventListener("keydown", closeOnEsc);
  }, [activeDetailLine]);

  const openLineDetails = useCallback(async (line: ResultadoDiarioLineConfig) => {
    setActiveDetailLine(line);
    setLineDetailError(null);
    setLineDetails(null);

    if (!fetchResultLineDetails) {
      setLineDetailError("Detalhamento indisponivel.");
      return;
    }

    if (!start || !end) {
      setLineDetailError("Informe o periodo antes de abrir o detalhamento.");
      return;
    }

    if (selectedStoreIds.length === 0) {
      setLineDetailError("Selecione ao menos uma loja antes de abrir o detalhamento.");
      return;
    }

    try {
      setLineDetailLoading(true);
      const response = await fetchResultLineDetails(line.key, {
        initialDate: start,
        finalDate: end,
        storeIds: selectedStoreIds,
        costCenterIds: cols,
      });
      setLineDetails(response);
    } catch (error: unknown) {
      setLineDetailError(error instanceof Error ? error.message : String(error));
    } finally {
      setLineDetailLoading(false);
    }
  }, [cols, end, fetchResultLineDetails, selectedStoreIds, start]);

  const thBase = "border border-slate-600 px-2 py-2 text-left bold";
  const tdBase = "border border-slate-600 px-2 py-1 whitespace-nowrap text-right";
  const stickyFirst =
    "sticky left-0 z-10 bg-white border border-slate-600 px-2 py-1 text-left";
  const stickyFirstShade =
    "sticky left-0 z-10 bg-slate-300 border border-slate-600 px-2 py-1 text-left";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-2 pl-10 pr-10 dark:border-neutral-700 dark:bg-pilar-default-bg2-dark">
      <div className="overflow-x-auto rounded-lg">
        <table className="min-w-[900px] w-full border border-slate-600 text-sm text-black" id="dre-table">
          <thead className="bg-slate-300">
            <tr>
              <th className={`${thBase} min-w-[260px] ${stickyFirstShade}`}>Setor</th>
              {cols.map((cc) => (
                <th key={cc} className={`${thBase}`}>{ccDesc.get(cc) || cc}</th>
              ))}
              <th className={`${thBase}`}>TOTAL</th>
            </tr>
          </thead>

          <tbody>
            {visibleLineConfig.map((m) => {
              const isValueLine = isResultadoDiarioValueLine(m);
              const detailKey = getResultadoDiarioImplementedDetailKey(m);
              const hasDetail = Boolean(detailKey && fetchResultLineDetails);
              const rowClassName = [
                "group",
                m.shade ? "bg-slate-300" : "bg-white",
                hasDetail
                  ? "cursor-pointer transition-colors hover:bg-slate-200"
                  : "",
              ].join(" ");
              const firstCellClassName = [
                m.shade ? stickyFirstShade : stickyFirst,
                hasDetail ? "transition-colors group-hover:bg-slate-200" : "",
              ].join(" ");

              return (
                <tr
                  key={m.key}
                  className={rowClassName}
                  onClick={hasDetail ? () => openLineDetails(m) : undefined}
                  title={hasDetail ? "Abrir detalhamento" : undefined}
                >
                  <td className={firstCellClassName}>
                    <span className={m.bold ? "font-bold" : ""}>{m.label}</span>
                  </td>

                  {/* celulas por centro de custo */}
                  {cols.map((cc) => {
                    const v = isValueLine ? byCC[cc]?.[m.key] ?? 0 : 0;
                    const cls = `${tdBase} ${m.bold ? "font-bold" : ""} ${
                      NEG(v) ? "text-red-500" : ""
                    }`;
                    return (
                      <td key={`${m.key}-${cc}`} className={cls}>
                        {isValueLine ? (m.format === "money" ? money(v) : percent(v)) : ""}
                      </td>
                    );
                  })}

                  {/* total */}
                  {(() => {
                    const tv = isValueLine ? totalCalc[m.key] ?? 0 : 0;
                    const cls = `${tdBase} ${m.bold ? "font-bold" : ""} ${NEG(tv) ? "text-red-500" : ""}`;
                    return <td className={cls}>{isValueLine ? (m.format === "money" ? money(tv) : percent(tv)) : ""}</td>;
                  })()}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end p-2">
        <ExportToExcelButton fileName="Resultado KNTT" tableId="dre-table"/>
      </div>

      {activeDetailLine && (
        <>
          <div
            className="absolute inset-0 z-20 cursor-default bg-white/40 dark:bg-black/20"
            onClick={() => setActiveDetailLine(null)}
            aria-hidden="true"
          />
          <ResultLineDetailsPanel
            line={activeDetailLine}
            details={lineDetails}
            loading={lineDetailLoading}
            error={lineDetailError}
            costCenterDescription={ccDesc}
            storeDescription={storeDesc}
            onClose={() => setActiveDetailLine(null)}
          />
          <style>{`
            @keyframes dreDetailSlideIn {
              from { transform: translateX(100%); opacity: 0.75; }
              to { transform: translateX(0); opacity: 1; }
            }
          `}</style>
        </>
      )}
    </div>
  );
}

function ResultLineDetailsPanel({
  line,
  details,
  loading,
  error,
  costCenterDescription,
  storeDescription,
  onClose,
}: {
  line: ResultadoDiarioLineConfig;
  details: ResultLineDetailsResponse | null;
  loading: boolean;
  error: string | null;
  costCenterDescription: Map<number, string>;
  storeDescription: Map<number, string>;
  onClose: () => void;
}) {
  const [filters, setFilters] = useState<DetailColumnFilters>({});
  const [sortState, setSortState] = useState<SortState | null>({
    key: "date",
    direction: "asc",
  });

  const updateFilter = useCallback((key: DetailColumnKey, value: Array<string | number>) => {
    setFilters((current) => {
      const next = { ...current };
      const selectedValues = value.map(String).filter(Boolean);
      if (selectedValues.length > 0) {
        next[key] = selectedValues;
      } else {
        delete next[key];
      }
      return next;
    });
  }, []);

  const rows = useMemo<ResultLineDetailGridRow[]>(() => {
    if (!details) return [];

    return details.items.map((item, index) => {
      const dateLabel = formatDate(item.date);
      const storeLabel = storeDescription.get(item.storeId) || `Loja ${item.storeId}`;
      const sourceStoreLabel = item.sourceStoreId
        ? storeDescription.get(item.sourceStoreId) || `Loja ${item.sourceStoreId}`
        : "-";
      const allocationStoreLabel = item.allocationStoreId
        ? storeDescription.get(item.allocationStoreId) || `Loja ${item.allocationStoreId}`
        : "-";
      const costCenterLabel = item.costCenterId
        ? costCenterDescription.get(item.costCenterId) || `Centro ${item.costCenterId}`
        : "Sem centro de custo";
      const accountLabel = item.accountId
        ? `${item.accountId} - ${item.accountDescription || "Conta contabil"}`
        : item.accountDescription || "-";
      const dreLineLabel = item.dreLineDescription || "-";
      const allocationPercentLabel =
        typeof item.allocationPercent === "number"
          ? `${item.allocationPercent.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} %`
          : "-";

      return {
        ...item,
        rowKey: `${item.storeId}-${item.costCenterId ?? "none"}-${item.date}-${index}`,
        dateLabel,
        storeLabel,
        sourceStoreLabel,
        allocationStoreLabel,
        costCenterLabel,
        accountLabel,
        dreLineLabel,
        allocationPercentLabel,
        debitLabel: money(item.debitValue),
        creditLabel: money(item.creditValue),
        valueLabel: money(item.value),
      };
    });
  }, [costCenterDescription, details, storeDescription]);

  const filterOptions = useMemo(
    () => ({
      date: buildDistinctOptions(rows.map((row) => row.dateLabel)),
      store: buildDistinctOptions(rows.map((row) => row.storeLabel)),
      sourceStore: buildDistinctOptions(rows.map((row) => row.sourceStoreLabel)),
      allocationStore: buildDistinctOptions(rows.map((row) => row.allocationStoreLabel)),
      costCenter: buildDistinctOptions(rows.map((row) => row.costCenterLabel)),
      account: buildDistinctOptions(rows.map((row) => row.accountLabel)),
      dreLine: buildDistinctOptions(rows.map((row) => row.dreLineLabel)),
      allocationPercent: buildDistinctOptions(rows.map((row) => row.allocationPercentLabel)),
      origin: buildDistinctOptions(rows.map((row) => row.origin)),
      description: buildDistinctOptions(rows.map((row) => row.description)),
      debitValue: buildDistinctOptions(rows.map((row) => row.debitLabel)),
      creditValue: buildDistinctOptions(rows.map((row) => row.creditLabel)),
      value: buildDistinctOptions(rows.map((row) => row.valueLabel)),
    }),
    [rows],
  );

  const filteredRows = useMemo(
    () =>
      rows.filter((row) =>
        detailSelectionMatches(filters.date, row.dateLabel) &&
        detailSelectionMatches(filters.store, row.storeLabel) &&
        detailSelectionMatches(filters.sourceStore, row.sourceStoreLabel) &&
        detailSelectionMatches(filters.allocationStore, row.allocationStoreLabel) &&
        detailSelectionMatches(filters.costCenter, row.costCenterLabel) &&
        detailSelectionMatches(filters.account, row.accountLabel) &&
        detailSelectionMatches(filters.dreLine, row.dreLineLabel) &&
        detailSelectionMatches(filters.allocationPercent, row.allocationPercentLabel) &&
        detailSelectionMatches(filters.origin, row.origin) &&
        detailSelectionMatches(filters.description, row.description) &&
        detailSelectionMatches(filters.debitValue, row.debitLabel) &&
        detailSelectionMatches(filters.creditValue, row.creditLabel) &&
        detailSelectionMatches(filters.value, row.valueLabel),
      ),
    [filters, rows],
  );

  const displayedTotals = useMemo(
    () =>
      filteredRows.reduce(
        (acc, row) => ({
          debitValue: acc.debitValue + row.debitValue,
          creditValue: acc.creditValue + row.creditValue,
          value: acc.value + row.value,
        }),
        { debitValue: 0, creditValue: 0, value: 0 },
      ),
    [filteredRows],
  );

  const detailColumns = useMemo<Column<ResultLineDetailGridRow>[]>(
    () => [
      {
        key: "date",
        header: (
          <DetailColumnHeader
            label="Data"
            value={filters.date ?? []}
            options={filterOptions.date}
            onChange={(value) => updateFilter("date", value)}
          />
        ),
        width: 120,
        cell: (row) => row.dateLabel,
        sortAccessor: (row) => row.date,
        sortable: true,
        resizable: true,
      },
      {
        key: "store",
        header: (
          <DetailColumnHeader
            label="Loja destino"
            value={filters.store ?? []}
            options={filterOptions.store}
            onChange={(value) => updateFilter("store", value)}
          />
        ),
        width: 170,
        overflow: "wrap",
        cell: (row) => row.storeLabel,
        sortAccessor: (row) => row.storeLabel,
        sortable: true,
        resizable: true,
      },
      {
        key: "sourceStore",
        header: (
          <DetailColumnHeader
            label="Loja original"
            value={filters.sourceStore ?? []}
            options={filterOptions.sourceStore}
            onChange={(value) => updateFilter("sourceStore", value)}
          />
        ),
        width: 170,
        overflow: "wrap",
        cell: (row) => row.sourceStoreLabel,
        sortAccessor: (row) => row.sourceStoreLabel,
        sortable: true,
        resizable: true,
      },
      {
        key: "allocationStore",
        header: (
          <DetailColumnHeader
            label="Loja rateio"
            value={filters.allocationStore ?? []}
            options={filterOptions.allocationStore}
            onChange={(value) => updateFilter("allocationStore", value)}
          />
        ),
        width: 170,
        overflow: "wrap",
        cell: (row) => row.allocationStoreLabel,
        sortAccessor: (row) => row.allocationStoreLabel,
        sortable: true,
        resizable: true,
      },
      {
        key: "costCenter",
        header: (
          <DetailColumnHeader
            label="Centro de custo"
            value={filters.costCenter ?? []}
            options={filterOptions.costCenter}
            onChange={(value) => updateFilter("costCenter", value)}
          />
        ),
        width: 190,
        overflow: "wrap",
        cell: (row) => row.costCenterLabel,
        sortAccessor: (row) => row.costCenterLabel,
        sortable: true,
        resizable: true,
      },
      {
        key: "account",
        header: (
          <DetailColumnHeader
            label="Conta contabil"
            value={filters.account ?? []}
            options={filterOptions.account}
            onChange={(value) => updateFilter("account", value)}
          />
        ),
        width: 260,
        overflow: "wrap",
        cell: (row) => row.accountLabel,
        sortAccessor: (row) => row.accountLabel,
        sortable: true,
        resizable: true,
      },
      {
        key: "dreLine",
        header: (
          <DetailColumnHeader
            label="Linha DRE"
            value={filters.dreLine ?? []}
            options={filterOptions.dreLine}
            onChange={(value) => updateFilter("dreLine", value)}
          />
        ),
        width: 220,
        overflow: "wrap",
        cell: (row) => row.dreLineLabel,
        sortAccessor: (row) => row.dreLineLabel,
        sortable: true,
        resizable: true,
      },
      {
        key: "allocationPercent",
        header: (
          <DetailColumnHeader
            label="Percentual rateio"
            value={filters.allocationPercent ?? []}
            options={filterOptions.allocationPercent}
            onChange={(value) => updateFilter("allocationPercent", value)}
          />
        ),
        align: "right",
        width: 150,
        cell: (row) => row.allocationPercentLabel,
        sortAccessor: (row) => row.allocationPercent ?? -1,
        sortable: true,
        resizable: true,
      },
      {
        key: "origin",
        header: (
          <DetailColumnHeader
            label="Origem"
            value={filters.origin ?? []}
            options={filterOptions.origin}
            onChange={(value) => updateFilter("origin", value)}
          />
        ),
        width: 170,
        overflow: "wrap",
        cell: (row) => row.origin,
        sortAccessor: (row) => row.origin,
        sortable: true,
        resizable: true,
      },
      {
        key: "description",
        header: (
          <DetailColumnHeader
            label="Historico/descricao"
            value={filters.description ?? []}
            options={filterOptions.description}
            onChange={(value) => updateFilter("description", value)}
          />
        ),
        width: 320,
        overflow: "wrap",
        cell: (row) => row.description,
        sortAccessor: (row) => row.description,
        sortable: true,
        resizable: true,
      },
      {
        key: "debitValue",
        header: (
          <DetailColumnHeader
            label="Debito"
            value={filters.debitValue ?? []}
            options={filterOptions.debitValue}
            onChange={(value) => updateFilter("debitValue", value)}
          />
        ),
        align: "right",
        width: 130,
        cell: (row) => row.debitLabel,
        sortAccessor: (row) => row.debitValue,
        sortable: true,
        resizable: true,
      },
      {
        key: "creditValue",
        header: (
          <DetailColumnHeader
            label="Credito"
            value={filters.creditValue ?? []}
            options={filterOptions.creditValue}
            onChange={(value) => updateFilter("creditValue", value)}
          />
        ),
        align: "right",
        width: 130,
        cell: (row) => row.creditLabel,
        sortAccessor: (row) => row.creditValue,
        sortable: true,
        resizable: true,
      },
      {
        key: "value",
        header: (
          <DetailColumnHeader
            label="Valor"
            value={filters.value ?? []}
            options={filterOptions.value}
            onChange={(value) => updateFilter("value", value)}
          />
        ),
        align: "right",
        width: 130,
        cell: (row) => (
          <span className={NEG(row.value) ? "text-red-500" : ""}>{row.valueLabel}</span>
        ),
        sortAccessor: (row) => row.value,
        sortable: true,
        resizable: true,
      },
    ],
    [filterOptions, filters, updateFilter],
  );

  return (
    <aside
      className="absolute inset-y-0 left-0 right-0 z-30 flex w-full max-w-none flex-col border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-pilar-default-bg2-dark"
      style={{ animation: "dreDetailSlideIn 180ms ease-out" }}
      role="dialog"
      aria-label={`Detalhamento de ${line.label}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900/40">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-neutral-800 dark:text-neutral-100">
            Detalhamento de {line.label}
          </h3>
          {details && (
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {filteredRows.length.toLocaleString("pt-BR")} de {rows.length.toLocaleString("pt-BR")} registros
            </p>
          )}
        </div>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded border border-neutral-300 bg-white text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
          onClick={onClose}
          title="Fechar (Esc)"
          aria-label="Fechar detalhamento"
        >
          <CloseIcon fontSize="small" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-4">
        {loading && (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-slate-600 dark:border-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-300">
            Carregando detalhamento da linha...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}

        {!loading && !error && details && (
          <div className="flex h-full min-h-0 flex-col gap-3">
            <SimpleTable<ResultLineDetailGridRow>
              columns={detailColumns}
              data={filteredRows}
              loading={false}
              emptyMessage="Nenhum detalhe encontrado para o periodo selecionado."
              stickyHeader
              sortState={sortState}
              onSortChange={setSortState}
              getRowKey={(row) => row.rowKey}
              wrapperClassName="min-h-0 flex-1 overflow-auto bg-white/95 dark:bg-transparent"
              tableClassName="min-w-[2260px] w-full border-collapse bg-white text-left text-xs text-black dark:bg-transparent dark:text-neutral-100"
              headerWrapperClassName="bg-slate-200/95 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100"
              headerCellClassName="border border-slate-300 align-top text-[11px] font-semibold uppercase tracking-wide dark:border-neutral-700"
              cellBaseClassName="border border-slate-300/90 dark:border-neutral-700"
              rowClassName={(_row, index) =>
                `${index % 2 === 0 ? "bg-white dark:bg-transparent" : "bg-neutral-50 dark:bg-neutral-900/20"} hover:bg-slate-100 dark:hover:bg-neutral-800/60`
              }
              exportOptions={{
                enabled: true,
                excel: true,
                pdf: true,
                filename: `resultado-diario-${line.key}-detalhe`,
                sheetName: line.key.slice(0, 31),
                headersOverride: [
                  "Data",
                  "Loja destino",
                  "Loja original",
                  "Loja rateio",
                  "Centro de custo",
                  "Conta contabil",
                  "Linha DRE",
                  "Percentual rateio",
                  "Origem",
                  "Historico/descricao",
                  "Debito",
                  "Credito",
                  "Valor",
                ],
                mapCell: (_value, row, col) => getDetailExportValue(row, col.key),
                pdfOptions: {
                  orientation: "landscape",
                  title: `Detalhamento ${line.label}`,
                },
              }}
            />

            <div className="grid grid-cols-1 gap-2 rounded-lg border border-slate-300 bg-slate-100 p-3 text-sm font-semibold text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900/50 dark:text-neutral-100 sm:grid-cols-3">
              <div>Total Débito: {money(displayedTotals.debitValue)}</div>
              <div>Total Crédito: {money(displayedTotals.creditValue)}</div>
              <div>Total Valor: {money(displayedTotals.value)}</div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function DetailColumnHeader({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string[];
  options: ColumnMultiSelectFilterOption[];
  onChange: (value: Array<string | number>) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="truncate">{label}</span>
      <ColumnMultiSelectFilter
        label={label}
        options={options}
        selectedValues={value}
        onChange={onChange}
        placeholder="Todos"
        searchable={options.length > 8}
        maxHeight={220}
        menuWidth={label === "Historico/descricao" ? 380 : 320}
        align={label === "Valor" || label === "Credito" || label === "Debito" ? "right" : "left"}
        className="w-full min-w-0"
      />
    </div>
  );
}

function detailSelectionMatches(filter: string[] | undefined, value: string) {
  if (!filter?.length) return true;
  const selected = new Set(filter.map(String));
  return selected.has(String(value));
}

function buildDistinctOptions(values: string[]): ColumnMultiSelectFilterOption[] {
  return Array.from(new Set(values.map((value) => String(value || "-"))))
    .sort((current, next) =>
      current.localeCompare(next, "pt-BR", {
        numeric: true,
        sensitivity: "base",
      }),
    )
    .map((value) => ({
      value,
      label: value,
    }));
}

function getDetailExportValue(row: ResultLineDetailGridRow, columnKey: string) {
  switch (columnKey) {
    case "date":
      return row.dateLabel;
    case "store":
      return row.storeLabel;
    case "sourceStore":
      return row.sourceStoreLabel;
    case "allocationStore":
      return row.allocationStoreLabel;
    case "costCenter":
      return row.costCenterLabel;
    case "account":
      return row.accountLabel;
    case "dreLine":
      return row.dreLineLabel;
    case "allocationPercent":
      return row.allocationPercent ?? "";
    case "origin":
      return row.origin;
    case "description":
      return row.description;
    case "debitValue":
      return row.debitValue;
    case "creditValue":
      return row.creditValue;
    case "value":
      return row.value;
    default:
      return "";
  }
}

function formatDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
}
