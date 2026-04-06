import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import type { SyntheticEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import InfoHint from "../../../components/InfoHint";
import Layout from "../../../components/Layout";
import Tag from "../../../components/Tag";
import DefaultCheckbox from "../../../components/inputs/DefaultCheckbox";
import DateRange from "../../../components/inputs/DateRange";
import DefaultButton from "../../../components/inputs/DefaultButton";
import StoreMultiSelect from "../../../components/inputs/StoreMultiSelect";
import { fieldMenuSurfaceClass } from "../../../components/inputs/styles";
import ContentLoader from "../../../components/loading/ContentLoader";
import SimpleTable, {
  type Column,
  type SortState,
} from "../../../components/table/SimpleTable";
import { useAuth } from "../../../hooks/useAuth";
import MercadologicoHierarchyMultiSelect from "./components/MercadologicoHierarchyMultiSelect";
import { useCurvaAbc } from "./hooks/useCurvaAbc";
import type {
  CurvaAbcClassificacao,
  CurvaAbcRow,
  GetCurvaAbcParams,
  MercadologicoFiltroValor,
} from "./types";

type AbcColumnKey =
  | "curva_abc_volume_mercadologico1"
  | "curva_abc_venda_mercadologico1"
  | "curva_abc_lucro_mercadologico1"
  | "curva_abc_volume_mercadologico2"
  | "curva_abc_venda_mercadologico2"
  | "curva_abc_lucro_mercadologico2";

type AbcColumnFilters = Partial<Record<AbcColumnKey, CurvaAbcClassificacao[]>>;
type TableProcessingReason = "query" | "sorting" | "filtering";

const ABC_COLUMN_KEYS: AbcColumnKey[] = [
  "curva_abc_volume_mercadologico1",
  "curva_abc_venda_mercadologico1",
  "curva_abc_lucro_mercadologico1",
  "curva_abc_volume_mercadologico2",
  "curva_abc_venda_mercadologico2",
  "curva_abc_lucro_mercadologico2",
];

const ABC_FILTER_OPTIONS: CurvaAbcClassificacao[] = ["A", "B", "C"];

const TABLE_PROCESSING_LABELS: Record<TableProcessingReason, string> = {
  query: "Consultando relatorio...",
  sorting: "Ordenando tabela...",
  filtering: "Aplicando filtro...",
};

const CURVA_ABC_INFO_TEXT = {
  title: "Como a curva ABC é calculada",
  paragraphs: [
    "Para cada item, é calculado o percentual de participação acumulada dentro do mercadológico:",
    "x = soma dos valores dos itens com valor maior ou igual ao item atual / soma total do mercadológico",
    "A: x até 0,5",
    "B: x acima de 0,5 até 0,75%",
    "C: x acima de 0,75",
    "Esse cálculo é feito separadamente para Volume, Venda e Lucro, dentro do Mercadologico 1 e do Mercadologico 2.",
  ],
};

function formatInteger(value: unknown) {
  if (value == null || value === "") return "0";
  const n = Number(value);
  if (Number.isNaN(n)) return "0";
  return Math.trunc(n).toLocaleString("pt-BR");
}

function formatQuantity(value: unknown) {
  if (value == null || value === "") return "0";
  const n = Number(value);
  if (Number.isNaN(n)) return "0";
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

function formatCurrency(value: unknown) {
  if (value == null || value === "") return "0,00";
  const n = Number(value);
  if (Number.isNaN(n)) return "0,00";
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatNullable(value: unknown) {
  if (value == null || value === "") return "-";
  return String(value);
}

function sortAbcSelections(values: CurvaAbcClassificacao[]) {
  const order: Record<CurvaAbcClassificacao, number> = {
    A: 0,
    B: 1,
    C: 2,
  };

  return [...values].sort((current, next) => order[current] - order[next]);
}

function abcTagClassName(classificacao: CurvaAbcClassificacao) {
  switch (classificacao) {
    case "A":
      return "border-emerald-400 bg-emerald-100 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300";
    case "B":
      return "border-amber-400 bg-amber-100 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300";
    case "C":
      return "border-rose-400 bg-rose-100 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300";
    default:
      return "border-neutral-400 bg-neutral-200 text-neutral-800 dark:border-white/15 dark:bg-white/10 dark:text-neutral-200";
  }
}

function renderAbcTag(classificacao: CurvaAbcClassificacao) {
  return <Tag className={abcTagClassName(classificacao)}>{classificacao}</Tag>;
}

function getCurvaAbcExportHeader(columnKey: string) {
  switch (columnKey) {
    case "mercadologico1_descricao":
      return "Descricao Merc. 1";
    case "mercadologico2_descricao":
      return "Descricao Merc. 2";
    case "id_produto":
      return "Produto";
    case "descricao":
      return "Descricao";
    case "curva_abc_volume_mercadologico1":
      return "ABC Mercadologico 1 - Volume";
    case "curva_abc_venda_mercadologico1":
      return "ABC Mercadologico 1 - Venda";
    case "curva_abc_lucro_mercadologico1":
      return "ABC Mercadologico 1 - Lucro";
    case "curva_abc_volume_mercadologico2":
      return "ABC Mercadologico 2 - Volume";
    case "curva_abc_venda_mercadologico2":
      return "ABC Mercadologico 2 - Venda";
    case "curva_abc_lucro_mercadologico2":
      return "ABC Mercadologico 2 - Lucro";
    case "quantidade":
      return "Quantidade/Valores - Volume";
    case "venda":
      return "Quantidade/Valores - Venda";
    case "lucro":
      return "Quantidade/Valores - Lucro";
    default:
      return columnKey;
  }
}

function getCurvaAbcExportValue(row: CurvaAbcRow, columnKey: string) {
  switch (columnKey) {
    case "mercadologico1_descricao":
      return row.mercadologico1_descricao ?? "";
    case "mercadologico2_descricao":
      return row.mercadologico2_descricao ?? "";
    case "id_produto":
      return row.id_produto;
    case "descricao":
      return row.descricao;
    case "curva_abc_volume_mercadologico1":
      return row.curva_abc_volume_mercadologico1;
    case "curva_abc_venda_mercadologico1":
      return row.curva_abc_venda_mercadologico1;
    case "curva_abc_lucro_mercadologico1":
      return row.curva_abc_lucro_mercadologico1;
    case "curva_abc_volume_mercadologico2":
      return row.curva_abc_volume_mercadologico2;
    case "curva_abc_venda_mercadologico2":
      return row.curva_abc_venda_mercadologico2;
    case "curva_abc_lucro_mercadologico2":
      return row.curva_abc_lucro_mercadologico2;
    case "quantidade":
      return row.quantidade;
    case "venda":
      return row.venda;
    case "lucro":
      return row.lucro;
    default:
      return "";
  }
}

function buildExportFilename(initialDate: string, finalDate: string) {
  if (!initialDate || !finalDate) {
    return "curva-abc";
  }

  return `curva-abc-${initialDate}-${finalDate}`;
}

function buildVisibleRowsLabel(visibleRows: number, totalRows: number) {
  const visibleLabel = visibleRows.toLocaleString("pt-BR");
  const totalLabel = totalRows.toLocaleString("pt-BR");

  if (visibleRows === totalRows) {
    return `Exibindo ${visibleLabel} registros`;
  }

  return `Exibindo ${visibleLabel} de ${totalLabel} registros`;
}

function AbcColumnQuickFilter({
  label,
  selectedValues,
  onChange,
}: {
  label: string;
  selectedValues: CurvaAbcClassificacao[];
  onChange: (nextValues: CurvaAbcClassificacao[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const hasActiveFilter = selectedValues.length > 0;

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, []);

  function stopEvent(event: SyntheticEvent) {
    event.stopPropagation();
  }

  function toggleOption(option: CurvaAbcClassificacao) {
    if (selectedValues.includes(option)) {
      onChange(selectedValues.filter((value) => value !== option));
      return;
    }

    onChange(sortAbcSelections([...selectedValues, option]));
  }

  function clearFilter() {
    onChange([]);
  }

  return (
    <div
      ref={rootRef}
      className="relative flex min-w-0 items-center justify-center gap-1"
    >
      <span className="truncate">{label}</span>

      <button
        type="button"
        className={[
          "relative inline-flex h-5 w-5 items-center justify-center rounded transition-colors",
          hasActiveFilter
            ? "bg-pilar-green/20 text-emerald-800 ring-1 ring-pilar-green/30 dark:bg-pilar-green/15 dark:text-pilar-green dark:ring-0 dark:ring-transparent"
            : "text-neutral-700 hover:bg-neutral-300/80 dark:text-neutral-300 dark:hover:bg-neutral-700/70",
        ].join(" ")}
        onClick={(event) => {
          stopEvent(event);
          setOpen((current) => !current);
        }}
        aria-label={`Filtrar classificacoes ABC da coluna ${label}`}
        title={
          hasActiveFilter
            ? `Filtro ativo: ${selectedValues.join(", ")}`
            : "Filtrar coluna ABC"
        }
      >
        <svg width="12" height="12" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M3 4h14l-5.5 6v4.5l-3-1.8V10L3 4z" fill="currentColor" />
        </svg>
        {hasActiveFilter && (
          <span className="absolute -right-1 -top-1 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-pilar-green px-1 text-[9px] font-semibold text-white">
            {selectedValues.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`${fieldMenuSurfaceClass} absolute right-0 top-full z-30 mt-2 w-40 border-neutral-300 bg-neutral-50 p-2 text-neutral-900 shadow-xl dark:border-neutral-700 dark:bg-pilar-default-bg-dark dark:text-neutral-100`}
          onClick={stopEvent}
          onMouseDown={stopEvent}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-700 dark:text-neutral-300">
              Filtrar
            </span>
            <button
              type="button"
              className="text-[11px] font-medium text-neutral-700 hover:text-neutral-950 disabled:opacity-40 dark:text-neutral-300 dark:hover:text-neutral-100"
              onClick={clearFilter}
              disabled={!hasActiveFilter}
            >
              Limpar
            </button>
          </div>

          <div className="space-y-2">
            {ABC_FILTER_OPTIONS.map((option) => (
              <DefaultCheckbox
                key={option}
                label={option}
                checked={selectedValues.includes(option)}
                onChange={() => toggleOption(option)}
                className="w-full"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CurvaAbcPage() {
  const { token } = useAuth();
  const [sp, setSearchParams] = useSearchParams();
  const { fetchCurvaAbc } = useCurvaAbc(token);
  const [isTableTransitionPending, startTableTransition] = useTransition();

  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [initialDate, setInitialDate] = useState("");
  const [finalDate, setFinalDate] = useState("");
  const [mercadologicos, setMercadologicos] =
    useState<MercadologicoFiltroValor>({
      pares: [],
    });
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<CurvaAbcRow[]>([]);
  const [abcColumnFilters, setAbcColumnFilters] = useState<AbcColumnFilters>(
    {},
  );
  const [tableProcessingReason, setTableProcessingReason] =
    useState<TableProcessingReason | null>(null);
  const [sortState, setSortState] = useState<SortState | null>({
    key: "descricao",
    direction: "asc",
  });
  const tableProcessingFramesRef = useRef<number[]>([]);
  const tableProcessingTimeoutRef = useRef<number | null>(null);

  const clearScheduledTableProcessing = useCallback(() => {
    tableProcessingFramesRef.current.forEach((frameId) =>
      window.cancelAnimationFrame(frameId),
    );
    tableProcessingFramesRef.current = [];

    if (tableProcessingTimeoutRef.current !== null) {
      window.clearTimeout(tableProcessingTimeoutRef.current);
      tableProcessingTimeoutRef.current = null;
    }
  }, []);

  const scheduleTableProcessing = useCallback(
    (reason: TableProcessingReason, action: () => void) => {
      clearScheduledTableProcessing();
      setTableProcessingReason(reason);

      const firstFrame = window.requestAnimationFrame(() => {
        const secondFrame = window.requestAnimationFrame(() => {
          startTableTransition(() => {
            action();
          });
        });

        tableProcessingFramesRef.current.push(secondFrame);
      });

      tableProcessingFramesRef.current.push(firstFrame);
    },
    [clearScheduledTableProcessing, startTableTransition],
  );

  useEffect(() => {
    return () => {
      clearScheduledTableProcessing();
    };
  }, [clearScheduledTableProcessing]);

  useEffect(() => {
    if (loading || isTableTransitionPending || !tableProcessingReason) {
      return;
    }

    tableProcessingTimeoutRef.current = window.setTimeout(() => {
      setTableProcessingReason(null);
      tableProcessingTimeoutRef.current = null;
    }, 120);

    return () => {
      if (tableProcessingTimeoutRef.current !== null) {
        window.clearTimeout(tableProcessingTimeoutRef.current);
        tableProcessingTimeoutRef.current = null;
      }
    };
  }, [isTableTransitionPending, loading, tableProcessingReason]);

  const applyAbcColumnFilter = useCallback(
    (columnKey: AbcColumnKey, nextValues: CurvaAbcClassificacao[]) => {
      setAbcColumnFilters((current) => {
        if (nextValues.length === 0) {
          const next = { ...current };
          delete next[columnKey];
          return next;
        }

        return {
          ...current,
          [columnKey]: sortAbcSelections(nextValues),
        };
      });
    },
    [],
  );

  const handleAbcColumnFilterChange = useCallback(
    (columnKey: AbcColumnKey, nextValues: CurvaAbcClassificacao[]) => {
      scheduleTableProcessing("filtering", () => {
        applyAbcColumnFilter(columnKey, nextValues);
      });
    },
    [applyAbcColumnFilter, scheduleTableProcessing],
  );

  const handleSortChange = useCallback(
    (next: SortState | null) => {
      scheduleTableProcessing("sorting", () => {
        setSortState(next);
      });
    },
    [scheduleTableProcessing],
  );

  const filteredRows = useMemo(
    () =>
      rows.filter((row) =>
        ABC_COLUMN_KEYS.every((columnKey) => {
          const selectedValues = abcColumnFilters[columnKey];
          if (!selectedValues?.length) {
            return true;
          }

          return selectedValues.includes(row[columnKey]);
        }),
      ),
    [abcColumnFilters, rows],
  );
  const visibleRowsLabel = useMemo(
    () => buildVisibleRowsLabel(filteredRows.length, rows.length),
    [filteredRows.length, rows.length],
  );

  const columns = useMemo<Column<CurvaAbcRow>[]>(
    () => [
      {
        key: "mercadologico1_descricao",
        header: "Descricao Merc. 1",
        width: 220,
        overflow: "wrap",
        cell: (row) => formatNullable(row.mercadologico1_descricao),
        sortAccessor: (row) => row.mercadologico1_descricao ?? "",
        sortable: true,
        resizable: true,
      },
      {
        key: "mercadologico2_descricao",
        header: "Descricao Merc. 2",
        width: 220,
        overflow: "wrap",
        cell: (row) => formatNullable(row.mercadologico2_descricao),
        sortAccessor: (row) => row.mercadologico2_descricao ?? "",
        sortable: true,
        resizable: true,
      },
      {
        key: "id_produto",
        header: "Produto",
        align: "right",
        width: 110,
        cell: (row) => formatInteger(row.id_produto),
        sortAccessor: (row) => Number(row.id_produto ?? 0),
        sortable: true,
        resizable: true,
      },
      {
        key: "descricao",
        header: "Descricao",
        width: 280,
        overflow: "wrap",
        cell: (row) => row.descricao,
        sortAccessor: (row) => row.descricao ?? "",
        sortable: true,
        resizable: true,
      },
      {
        key: "curva_abc_volume_mercadologico1",
        header: (
          <AbcColumnQuickFilter
            label="Volume"
            selectedValues={
              abcColumnFilters.curva_abc_volume_mercadologico1 ?? []
            }
            onChange={(nextValues) =>
              handleAbcColumnFilterChange(
                "curva_abc_volume_mercadologico1",
                nextValues,
              )
            }
          />
        ),
        groupHeader: "ABC Mercadologico 1",
        groupHeaderKey: "abc-mercadologico-1",
        align: "center",
        width: 130,
        cell: (row) => renderAbcTag(row.curva_abc_volume_mercadologico1),
        sortAccessor: (row) => row.curva_abc_volume_mercadologico1,
        sortable: true,
        resizable: true,
      },
      {
        key: "curva_abc_venda_mercadologico1",
        header: (
          <AbcColumnQuickFilter
            label="Venda"
            selectedValues={
              abcColumnFilters.curva_abc_venda_mercadologico1 ?? []
            }
            onChange={(nextValues) =>
              handleAbcColumnFilterChange(
                "curva_abc_venda_mercadologico1",
                nextValues,
              )
            }
          />
        ),
        groupHeader: "ABC Mercadologico 1",
        groupHeaderKey: "abc-mercadologico-1",
        align: "center",
        width: 130,
        cell: (row) => renderAbcTag(row.curva_abc_venda_mercadologico1),
        sortAccessor: (row) => row.curva_abc_venda_mercadologico1,
        sortable: true,
        resizable: true,
      },
      {
        key: "curva_abc_lucro_mercadologico1",
        header: (
          <AbcColumnQuickFilter
            label="Lucro"
            selectedValues={
              abcColumnFilters.curva_abc_lucro_mercadologico1 ?? []
            }
            onChange={(nextValues) =>
              handleAbcColumnFilterChange(
                "curva_abc_lucro_mercadologico1",
                nextValues,
              )
            }
          />
        ),
        groupHeader: "ABC Mercadologico 1",
        groupHeaderKey: "abc-mercadologico-1",
        align: "center",
        width: 130,
        cell: (row) => renderAbcTag(row.curva_abc_lucro_mercadologico1),
        sortAccessor: (row) => row.curva_abc_lucro_mercadologico1,
        sortable: true,
        resizable: true,
      },
      {
        key: "curva_abc_volume_mercadologico2",
        header: (
          <AbcColumnQuickFilter
            label="Volume"
            selectedValues={
              abcColumnFilters.curva_abc_volume_mercadologico2 ?? []
            }
            onChange={(nextValues) =>
              handleAbcColumnFilterChange(
                "curva_abc_volume_mercadologico2",
                nextValues,
              )
            }
          />
        ),
        groupHeader: "ABC Mercadologico 2",
        groupHeaderKey: "abc-mercadologico-2",
        align: "center",
        width: 130,
        cell: (row) => renderAbcTag(row.curva_abc_volume_mercadologico2),
        sortAccessor: (row) => row.curva_abc_volume_mercadologico2,
        sortable: true,
        resizable: true,
      },
      {
        key: "curva_abc_venda_mercadologico2",
        header: (
          <AbcColumnQuickFilter
            label="Venda"
            selectedValues={
              abcColumnFilters.curva_abc_venda_mercadologico2 ?? []
            }
            onChange={(nextValues) =>
              handleAbcColumnFilterChange(
                "curva_abc_venda_mercadologico2",
                nextValues,
              )
            }
          />
        ),
        groupHeader: "ABC Mercadologico 2",
        groupHeaderKey: "abc-mercadologico-2",
        align: "center",
        width: 130,
        cell: (row) => renderAbcTag(row.curva_abc_venda_mercadologico2),
        sortAccessor: (row) => row.curva_abc_venda_mercadologico2,
        sortable: true,
        resizable: true,
      },
      {
        key: "curva_abc_lucro_mercadologico2",
        header: (
          <AbcColumnQuickFilter
            label="Lucro"
            selectedValues={
              abcColumnFilters.curva_abc_lucro_mercadologico2 ?? []
            }
            onChange={(nextValues) =>
              handleAbcColumnFilterChange(
                "curva_abc_lucro_mercadologico2",
                nextValues,
              )
            }
          />
        ),
        groupHeader: "ABC Mercadologico 2",
        groupHeaderKey: "abc-mercadologico-2",
        align: "center",
        width: 130,
        cell: (row) => renderAbcTag(row.curva_abc_lucro_mercadologico2),
        sortAccessor: (row) => row.curva_abc_lucro_mercadologico2,
        sortable: true,
        resizable: true,
      },
      {
        key: "quantidade",
        header: "Volume",
        groupHeader: "Quantidade/Valores",
        groupHeaderKey: "quantidade-valores",
        align: "right",
        width: 130,
        cell: (row) => formatQuantity(row.quantidade),
        sortAccessor: (row) => Number(row.quantidade ?? 0),
        sortable: true,
        resizable: true,
      },
      {
        key: "venda",
        header: "Venda",
        groupHeader: "Quantidade/Valores",
        groupHeaderKey: "quantidade-valores",
        align: "right",
        width: 140,
        cell: (row) => formatCurrency(row.venda),
        sortAccessor: (row) => Number(row.venda ?? 0),
        sortable: true,
        resizable: true,
      },
      {
        key: "lucro",
        header: "Lucro",
        groupHeader: "Quantidade/Valores",
        groupHeaderKey: "quantidade-valores",
        align: "right",
        width: 140,
        cell: (row) => formatCurrency(row.lucro),
        sortAccessor: (row) => Number(row.lucro ?? 0),
        sortable: true,
        resizable: true,
      },
    ],
    [abcColumnFilters, handleAbcColumnFilterChange],
  );

  const showFullScreenLoading = loading && !hasSearched;
  const showTableProcessingOverlay =
    hasSearched &&
    rows.length > 0 &&
    (loading || isTableTransitionPending || tableProcessingReason !== null);
  const tableProcessingLabel =
    tableProcessingReason == null
      ? "Processando..."
      : TABLE_PROCESSING_LABELS[tableProcessingReason];

  const exportHeaders = useMemo(
    () => columns.map((column) => getCurvaAbcExportHeader(column.key)),
    [columns],
  );
  const exportFilename = useMemo(
    () => buildExportFilename(initialDate, finalDate),
    [finalDate, initialDate],
  );

  async function onClickConsultar() {
    try {
      if (selectedStores.length === 0) {
        throw new Error("Selecione pelo menos uma loja.");
      }

      if (!initialDate || !finalDate) {
        throw new Error("Informe data inicial e final.");
      }

      const qs = new URLSearchParams(sp);
      setSearchParams(qs, { replace: true });
      clearScheduledTableProcessing();
      setTableProcessingReason("query");
      setLoading(true);

      const params: GetCurvaAbcParams = {
        storeId: selectedStores,
        initialDate,
        finalDate,
        mercadologicoPair: mercadologicos.pares,
      };

      const result = await fetchCurvaAbc(params);
      const nextRows = Array.isArray(result) ? result : [];

      startTableTransition(() => {
        setRows(nextRows);
        setHasSearched(true);
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Erro ao consultar Curva ABC.";

      toast.error(message, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        pauseOnHover: true,
        draggable: true,
        theme: "dark",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title="Curva ABC">
      <ContentLoader open={showFullScreenLoading} label="Consultando..." />

      <div className="mb-4 rounded-2xl border border-neutral-300 bg-neutral-50/95 p-4 shadow-sm shadow-neutral-200/60 dark:border-neutral-700 dark:bg-pilar-default-bg2-dark dark:shadow-none">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
          <div className="md:col-span-1">
            <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Lojas
            </label>
            <StoreMultiSelect
              permissionCode="curva-abc:consultar"
              value={selectedStores}
              onChange={(ids) => setSelectedStores(ids.map(String))}
              placeholder="Selecione as lojas..."
              autoSelectIfSingle
              onlyActive
              className="w-full"
              syncUrl
              urlParamKey="storeId"
              legacyUrlKeys={["storeIds", "lojas"]}
              replaceHistory
            />
          </div>

          <div className="md:col-span-2">
            <DateRange
              start={initialDate}
              end={finalDate}
              onChange={({ start, end }) => {
                setInitialDate(start);
                setFinalDate(end);
              }}
              syncUrl
              startKey="initialDate"
              endKey="finalDate"
              startLegacyKeys={["dataInicial", "start"]}
              endLegacyKeys={["dataFinal", "end"]}
              replaceHistory
              autoOrder={false}
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Mercadologicos
            </label>
            <MercadologicoHierarchyMultiSelect
              value={mercadologicos}
              onChange={setMercadologicos}
              className="w-full"
              syncUrl
              urlParamKey="mercadologicoPair"
              clearUrlKeys={["mercadologico1", "mercadologico2"]}
              replaceHistory
            />
          </div>

          <div className="flex items-end md:col-span-1">
            <DefaultButton
              type="submit"
              className="w-full md:w-auto"
              onClick={onClickConsultar}
              disabled={loading}
            >
              {loading ? "Consultando..." : "Consultar"}
            </DefaultButton>
          </div>
        </div>
      </div>

      {hasSearched &&
        (rows.length > 0 ? (
          <div className="rounded-lg border border-neutral-300 bg-neutral-50/85 text-neutral-900 shadow-sm shadow-neutral-300/50 dark:border-neutral-700 dark:bg-pilar-default-bg2-dark dark:text-neutral-100 dark:shadow-none">
            <div className="border-b border-neutral-300 bg-neutral-100/90 px-4 py-3 dark:border-neutral-700 dark:bg-transparent">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
                    Relatorio Curva ABC
                  </h3>
                  <InfoHint
                    ariaLabel="Entenda como a curva ABC e calculada"
                    title={CURVA_ABC_INFO_TEXT.title}
                    content={CURVA_ABC_INFO_TEXT.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    placement="bottom-start"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className="rounded-full border border-neutral-300 bg-neutral-200/80 px-3 py-1 text-xs font-medium text-neutral-700 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200">
                    {visibleRowsLabel}
                  </span>
                  {showTableProcessingOverlay && (
                    <span className="rounded-full border border-neutral-300 bg-white/90 px-3 py-1 text-xs font-medium text-neutral-600 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                      {tableProcessingLabel}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="relative">
              <SimpleTable<CurvaAbcRow>
                columns={columns}
                data={filteredRows}
                loading={loading && rows.length === 0}
                emptyMessage="Nenhum registro encontrado."
                stickyHeader
                sortState={sortState}
                onSortChange={handleSortChange}
                wrapperClassName="max-h-[calc(100vh-300px)] overflow-auto bg-white/95 dark:bg-transparent"
                tableClassName="min-w-[2100px] w-full border-collapse bg-white text-left text-sm dark:bg-transparent"
                headerWrapperClassName="bg-neutral-200/95 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100"
                headerCellClassName="border border-neutral-300 text-[11px] font-semibold uppercase tracking-wide dark:border-neutral-700"
                cellBaseClassName="border border-neutral-300/80 dark:border-neutral-700"
                rowClassName={(_row, index) =>
                  `${index % 2 === 0 ? "bg-white dark:bg-transparent" : "bg-neutral-100/75 dark:bg-neutral-900/20"} hover:bg-neutral-200/70 dark:hover:bg-neutral-800/60`
                }
                exportOptions={{
                  enabled: true,
                  excel: true,
                  pdf: true,
                  filename: exportFilename,
                  sheetName: "Curva ABC",
                  headersOverride: exportHeaders,
                  mapCell: (_value, row, col) =>
                    getCurvaAbcExportValue(row, col.key),
                  pdfOptions: {
                    orientation: "landscape",
                    title: "Curva ABC",
                  },
                }}
              />
              <ContentLoader
                open={showTableProcessingOverlay}
                label={tableProcessingLabel}
              />
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-neutral-400 bg-neutral-100/80 p-8 text-center text-neutral-800 shadow-sm shadow-neutral-200/50 dark:border-neutral-600 dark:bg-neutral-900/40 dark:text-neutral-300 dark:shadow-none">
            <p className="text-sm">Nenhum resultado encontrado.</p>
          </div>
        ))}
    </Layout>
  );
}
