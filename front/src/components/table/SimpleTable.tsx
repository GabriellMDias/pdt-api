import React, { useMemo, useRef, useState } from "react";
import {
  exportToPDF,
  exportToXLSX,
  type ExportPDFOptions,
  type ExportXLSXOptions,
} from "../../services/tableExport"; // <-- ajuste o path se precisar
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ExcelIcon from '../../assets/excel.png'

export type Align = "left" | "center" | "right";
export type SortDirection = "asc" | "desc";
export type SortState = { key: string; direction: SortDirection };

export type Column<T> = {
  key: string;
  header: React.ReactNode;
  field?: keyof T;
  cell?: (row: T, rowIndex: number) => React.ReactNode;
  align?: Align;
  thClassName?: string;
  tdClassName?: string;
  width?: string | number;

  /** ---- Ordenação ---- */
  sortable?: boolean;
  sortAccessor?: (row: T) => unknown;
  sortCompare?: (a: unknown, b: unknown, dir: SortDirection) => number;

  /** ---- Redimensionamento ---- */
  resizable?: boolean;
  minWidth?: number;   // px
  maxWidth?: number;   // px

  /** ---- Estouro de conteúdo ---- */
  /** 'ellipsis' (default) => corta com … em uma linha; 'wrap' => quebra de linha */
  overflow?: "ellipsis" | "wrap";
};

/** ===== Export options para o SimpleTable ===== */
export type TableExportOptions<T> = {
  /** Habilita exportação e escolhe quais botões mostrar */
  enabled?: boolean;          // default: false
  excel?: boolean;            // default: true se enabled
  pdf?: boolean;              // default: true se enabled
  /** Nome base do arquivo (sem extensão) */
  filename?: string;          // default: "export"
  /** Nome da planilha (Excel) */
  sheetName?: string;         // default: "Dados"
  /** Cabeçalhos de override (para headers JSX complexos) */
  headersOverride?: (string | undefined)[];
  /** Normalizador de célula (para converter JSX/objetos) */
  mapCell?: (value: unknown, row: T, col: Column<T>, rowIndex: number) => string | number | null | undefined;
  /** Opções específicas de PDF (orientação, margem, título, etc.) */
  pdfOptions?: ExportPDFOptions<T>["pdf"];
  /**
   * Render customizado do toolbar. Recebe handlers prontos.
   * Use para trocar os botões padrão pelo seu componente.
   */
  renderControls?: (ctx: { onExcel: () => void; onPDF: () => void }) => React.ReactNode;
};

type Props<T> = {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: React.ReactNode;

  wrapperClassName?: string;
  tableClassName?: string;

  headerWrapperClassName?: string;
  headerRowClassName?: string;
  headerCellClassName?: string;

  bodyClassName?: string;
  rowBaseClassName?: string;
  cellBaseClassName?: string;

  stickyHeader?: boolean;

  getRowKey?: (row: T, idx: number) => React.Key;
  onRowDoubleClick?: (row: T, idx: number) => void;
  rowClassName?: (row: T, idx: number) => string;

  defaultSort?: SortState;
  sortState?: SortState | null;
  onSortChange?: (next: SortState | null) => void;
  disableLocalSort?: boolean;

  onColumnResize?: (key: string, widthPx: number) => void;

  /** ===== Export integrado ===== */
  exportOptions?: TableExportOptions<T>;
};

export default function SimpleTable<T>({
  columns,
  data,
  loading = false,
  emptyMessage = "Sem resultados",

  wrapperClassName,
  tableClassName = "w-full text-sm text-left",

  headerWrapperClassName = "bg-gray-100 text-gray-700",
  headerRowClassName,
  headerCellClassName,

  bodyClassName,
  rowBaseClassName = "border-b",
  cellBaseClassName,

  stickyHeader = false,
  getRowKey = (_r, i) => i,
  onRowDoubleClick,
  rowClassName,

  // sorting
  defaultSort,
  sortState,
  onSortChange,
  disableLocalSort = false,

  // resize
  onColumnResize,

  // export
  exportOptions,
}: Props<T>) {
  const hasData = (data?.length ?? 0) > 0;

  /** ====== Ordenação (controlada x não controlada) ====== */
  const [internalSort, setInternalSort] = useState<SortState | null>(defaultSort ?? null);
  const effectiveSort = sortState ?? internalSort;

  function toggleSort(col: Column<T>) {
    if (!col.sortable) return;

    setInternalSort((prev) => {
      const prevKey = prev?.key;
      const prevDir = prev?.direction;
      let next: SortState | null;

      if (prevKey !== col.key) {
        next = { key: col.key, direction: "asc" };
      } else {
        if (prevDir === "asc") next = { key: col.key, direction: "desc" };
        else if (prevDir === "desc") next = null;
        else next = { key: col.key, direction: "asc" };
      }

      onSortChange?.(next);
      return sortState === undefined ? next : prev;
    });
  }

  const sortedData: T[] = useMemo(() => {
    if (disableLocalSort || !effectiveSort) return data;
    const col = columns.find((c) => c.key === effectiveSort.key);
    if (!col) return data;

    const accessor = (row: T) => {
      if (col.sortAccessor) return col.sortAccessor(row);
      if (col.field) return (row as any)[col.field as string];
      return undefined;
    };

    const dir = effectiveSort.direction === "asc" ? 1 : -1;
    const arr = data.map((v, i) => ({ v, i })); // cópia estável

    arr.sort((a, b) => {
      const av = accessor(a.v);
      const bv = accessor(b.v);
      if (col.sortCompare) return col.sortCompare(av, bv, effectiveSort.direction);
      return defaultCompare(av, bv) * dir || (a.i - b.i);
    });

    return arr.map((x) => x.v);
  }, [data, columns, effectiveSort, disableLocalSort]);

  /** ====== Redimensionamento ====== */
  const [colWidths, setColWidths] = useState<Record<string, number | undefined>>(() => {
    const init: Record<string, number | undefined> = {};
    columns.forEach((c) => {
      const w =
        typeof c.width === "number"
          ? c.width
          : pxFromAny(c.width);
      if (w) init[c.key] = w;
    });
    return init;
  });

  const dragRef = useRef<{
    key: string;
    startX: number;
    startWidth: number;
    minWidth: number;
    maxWidth: number;
  } | null>(null);

  function startResize(e: React.MouseEvent, col: Column<T>, thEl: HTMLTableCellElement | null) {
    if (!col.resizable) return;

    const rectW =
      thEl?.getBoundingClientRect().width ??
      (typeof col.width === "number" ? col.width : 0);

    const minW = col.minWidth ?? 60;
    const maxW = col.maxWidth ?? 1200;

    dragRef.current = {
      key: col.key,
      startX: e.clientX,
      startWidth: colWidths[col.key] ?? pxFromAny(col.width) ?? rectW,
      minWidth: minW,
      maxWidth: maxW,
    };

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const { key, startX, startWidth, minWidth, maxWidth } = dragRef.current;
      const dx = ev.clientX - startX;
      const next = clamp(startWidth + dx, minWidth, maxWidth);
      setColWidths((prev) => ({ ...prev, [key]: next }));
      onColumnResize?.(key, next);
      document.body.style.cursor = "col-resize";
      ev.preventDefault();
    };

    const onUp = () => {
      dragRef.current = null;
      document.body.style.cursor = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  /** ====== Larguras atuais para export (respeita resize) ====== */
  const widthsPxForExport = useMemo(() => {
    const out: Record<string, number> = {};
    columns.forEach((c) => {
      const px =
        colWidths[c.key] ??
        (typeof c.width === "number" ? c.width : pxFromAny(c.width));
      if (px) out[c.key] = px;
    });
    return out;
  }, [columns, colWidths]);

  /** ====== Handlers de export ====== */
  const expEnabled = !!exportOptions?.enabled;
  const expExcel = exportOptions?.excel ?? true;
  const expPDF = exportOptions?.pdf ?? true;
  const baseFilename = exportOptions?.filename || "export";

  const handleExcel = () => {
    exportToXLSX<T>(columns, sortedData, {
      filename: baseFilename,
      sheetName: exportOptions?.sheetName || "Dados",
      widthsPx: widthsPxForExport,
      headersOverride: exportOptions?.headersOverride,
      mapCell: exportOptions?.mapCell,
    } as ExportXLSXOptions<T>);
  };

  const handlePDF = () => {
    exportToPDF<T>(columns, sortedData, {
      filename: baseFilename,
      widthsPx: widthsPxForExport,
      headersOverride: exportOptions?.headersOverride,
      mapCell: exportOptions?.mapCell,
      pdf: exportOptions?.pdfOptions,
    } as any as ExportPDFOptions<T>);
  };

  /** ====== Render ====== */
  return (
    <div className={`overflow-x-auto rounded-lg border ${wrapperClassName || ""}`}>
      {/* Toolbar de Export (opcional) */}
      {expEnabled && (
        exportOptions?.renderControls ? (
          <div className="mb-2">
            {exportOptions.renderControls({ onExcel: handleExcel, onPDF: handlePDF })}
          </div>
        ) : (
          <div className="flex gap-2 mb-2">
            {expExcel && (
              <button
                type="button"
                onClick={handleExcel}
                className="px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                title="Exportar Excel (.xlsx)"
              >
                <img src={ExcelIcon} className="w-6"/>
              </button>
            )}
            {expPDF && (
              <button
                type="button"
                onClick={handlePDF}
                className="px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
                title="Exportar PDF (.pdf)"
              >
                <PictureAsPdfIcon className="text-black"/>
              </button>
            )}
          </div>
        )
      )}

      <table className={tableClassName} style={{ tableLayout: "fixed" }}>
        <colgroup>
          {columns.map((c) => {
            const w =
              colWidths[c.key] ??
              (typeof c.width === "number" ? c.width : pxFromAny(c.width));
            return <col key={c.key} style={w ? { width: `${w}px` } : undefined} />;
          })}
        </colgroup>

        <thead className={headerWrapperClassName}>
          <tr className={headerRowClassName}>
            {columns.map((c) => (
              <HeaderCell<T>
                key={c.key}
                col={c}
                sort={effectiveSort}
                onToggleSort={() => toggleSort(c)}
                className={`px-4 py-2 ${headerCellClassName || ""} ${c.thClassName || ""} ${alignToClass(c.align)}`}
                stickyHeader={stickyHeader}
                currentWidthPx={colWidths[c.key]}
                onStartResize={startResize}
              />
            ))}
          </tr>
        </thead>

        <tbody className={bodyClassName}>
          {loading && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-4 text-center">
                Carregando...
              </td>
            </tr>
          )}

          {!loading && !hasData && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-4 text-center">
                {emptyMessage}
              </td>
            </tr>
          )}

          {!loading &&
            hasData &&
            sortedData.map((row, i) => {
              const cls = `${rowBaseClassName} ` + (rowClassName ? rowClassName(row, i) : "");
              return (
                <tr
                  key={getRowKey(row, i)}
                  className={cls}
                  onDoubleClick={onRowDoubleClick ? () => onRowDoubleClick(row, i) : undefined}
                >
                  {columns.map((c) => {
                    const content = c.cell ? c.cell(row, i) : (row as any)[c.field as string];

                    const overflowMode = c.overflow ?? "ellipsis";
                    const overflowClass =
                      overflowMode === "wrap"
                        ? "whitespace-normal break-words"
                        : "truncate";

                    return (
                      <td
                        key={c.key}
                        className={`px-4 py-2 ${cellBaseClassName || ""} ${c.tdClassName || ""} ${alignToClass(c.align)}`}
                      >
                        <div
                          className={`block max-w-full ${overflowClass}`}
                          title={titleForContent(content)}
                        >
                          {content}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
        </tbody>
      </table>

      {stickyHeader && <style>{`thead { position: sticky; top: 0; z-index: 10; }`}</style>}
    </div>
  );
}

function HeaderCell<T>({
  col,
  sort,
  onToggleSort,
  className,
  stickyHeader,
  currentWidthPx,
  onStartResize,
}: {
  col: Column<T>;
  sort: SortState | null | undefined;
  onToggleSort: () => void;
  className?: string;
  stickyHeader?: boolean;
  currentWidthPx?: number;
  onStartResize: (e: React.MouseEvent, col: Column<T>, thEl: HTMLTableCellElement | null) => void;
}) {
  const thRef = useRef<HTMLTableCellElement | null>(null);
  const active = sort?.key === col.key;
  const dir = sort?.direction;

  const clickable = col.sortable;
  const showResize = col.resizable;

  return (
    <th
      ref={thRef}
      className={`${className || ""} relative select-none ${clickable ? "cursor-pointer" : ""}`}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target?.dataset?.resizeHandle === "1") return;
        if (clickable) onToggleSort();
      }}
      style={currentWidthPx ? { width: `${currentWidthPx}px` } : undefined}
      title={clickable ? "Clique para ordenar" : undefined}
    >
      <div className="flex items-center gap-1">
        <div className="truncate">{col.header}</div>
        {clickable && (
          <span className="text-xs opacity-70">
            {active ? (dir === "asc" ? "▲" : "▼") : "⇅"}
          </span>
        )}
      </div>

      {showResize && (
        <span
          data-resize-handle="1"
          onMouseDown={(e) => onStartResize(e, col, thRef.current)}
          className="absolute right-0 top-0 h-full w-2.5 cursor-col-resize"
          style={{ transform: "translateX(50%)" }}
          title="Arraste para ajustar a largura"
        />
      )}

      {stickyHeader && <style>{`th { background-clip: padding-box; }`}</style>}
    </th>
  );
}

/** ========= Utils ========= */
function alignToClass(a?: Align) {
  switch (a) {
    case "center":
      return "text-center";
    case "right":
      return "text-right";
    default:
      return "text-left";
  }
}

function defaultCompare(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  const aDate = toTime(a);
  const bDate = toTime(b);
  if (aDate != null && bDate != null) return aDate - bDate;
  const sa = toStr(a);
  const sb = toStr(b);
  return sa.localeCompare(sb, "pt-BR", { numeric: true, sensitivity: "base" });
}

function toTime(v: unknown): number | null {
  if (v instanceof Date && !isNaN(v.getTime())) return v.getTime();
  if (typeof v === "string") {
    const t = Date.parse(v);
    if (!isNaN(t)) return t;
  }
  return null;
}

function toStr(v: unknown) {
  if (v == null) return "";
  return String(v);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pxFromAny(w?: string | number): number | undefined {
  if (typeof w === "number") return w;
  if (typeof w === "string") {
    const m = w.trim().match(/^(\d+(?:\.\d+)?)px$/i);
    if (m) return Number(m[1]);
  }
  return undefined;
}

function titleForContent(x: React.ReactNode): string | undefined {
  if (typeof x === "string" || typeof x === "number") return String(x);
  return undefined;
}
