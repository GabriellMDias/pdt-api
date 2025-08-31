import React, { useEffect, useMemo, useRef, useState } from "react";

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
  sortable?: boolean; // habilita click-to-sort
  sortAccessor?: (row: T) => unknown; // como extrair o valor p/ ordenar (prioridade sobre field)
  sortCompare?: (a: unknown, b: unknown, dir: SortDirection) => number; // comparador custom

  /** ---- Redimensionamento ---- */
  resizable?: boolean; // habilita arrastar a borda direita
  minWidth?: number;   // px
  maxWidth?: number;   // px
};

type Props<T> = {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: React.ReactNode;

  /** Classe extra pro <div> wrapper (scroll) */
  wrapperClassName?: string;
  /** Classe pro <table> */
  tableClassName?: string;

  /** Estilização do cabeçalho/linhas/células */
  headerWrapperClassName?: string;
  headerRowClassName?: string;
  headerCellClassName?: string;
  bodyClassName?: string;
  rowBaseClassName?: string;
  cellBaseClassName?: string;

  /** Cabeçalho “gruda” no topo dentro do scroll */
  stickyHeader?: boolean;

  /** Eventos/estilo por linha */
  getRowKey?: (row: T, idx: number) => React.Key;
  onRowDoubleClick?: (row: T, idx: number) => void;
  rowClassName?: (row: T, idx: number) => string;

  /** ---- Ordenação (controlada / não controlada) ---- */
  defaultSort?: SortState;                        // estado inicial
  sortState?: SortState | null;                   // controlada
  onSortChange?: (next: SortState | null) => void;
  disableLocalSort?: boolean;                     // se true, não reordena os dados localmente (você ordena fora)

  /** ---- Resize callback ---- */
  onColumnResize?: (key: string, widthPx: number) => void;
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
  rowBaseClassName = "border-b hover:bg-gray-50",
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
        // alterna asc -> desc -> off
        if (prevDir === "asc") next = { key: col.key, direction: "desc" };
        else if (prevDir === "desc") next = null;
        else next = { key: col.key, direction: "asc" };
      }

      onSortChange?.(next);
      // se for controlada, não mexe no estado interno
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

    // cópia estável
    const arr = data.map((v, i) => ({ v, i }));

    arr.sort((a, b) => {
      const av = accessor(a.v);
      const bv = accessor(b.v);

      if (col.sortCompare) return col.sortCompare(av, bv, effectiveSort.direction);

      return defaultCompare(av, bv) * dir || (a.i - b.i); // estável
    });

    return arr.map((x) => x.v);
  }, [data, columns, effectiveSort, disableLocalSort]);

  /** ====== Redimensionamento ====== */
  // Guardamos larguras em px para colunas resizables.
  const [colWidths, setColWidths] = useState<Record<string, number | undefined>>(() => {
    const init: Record<string, number | undefined> = {};
    columns.forEach((c) => {
      if (typeof c.width === "number") init[c.key] = c.width;
    });
    return init;
  });

  // refs e handlers globais
  const dragRef = useRef<{
    key: string;
    startX: number;
    startWidth: number;
    minWidth: number;
    maxWidth: number;
  } | null>(null);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragRef.current) return;
      const { key, startX, startWidth, minWidth, maxWidth } = dragRef.current;
      const dx = e.clientX - startX;
      const next = clamp(startWidth + dx, minWidth, maxWidth);
      setColWidths((prev) => {
        const n = { ...prev, [key]: next };
        return n;
      });
      onColumnResize?.(key, next);
      document.body.style.cursor = "col-resize";
      e.preventDefault();
    }
    function onUp() {
      dragRef.current = null;
      document.body.style.cursor = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    if (dragRef.current) {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [onColumnResize]);

  function startResize(e: React.MouseEvent, col: Column<T>, thEl: HTMLTableCellElement | null) {
    if (!col.resizable) return;

    const rectW = thEl?.getBoundingClientRect().width ?? (
      typeof col.width === "number" ? col.width : 0
    );

    const minW = col.minWidth ?? 60;
    const maxW = col.maxWidth ?? 1200;

    dragRef.current = {
      key: col.key,
      startX: e.clientX,
      startWidth: colWidths[col.key] ?? pxFromAny(col.width) ?? rectW,
      minWidth: minW,
      maxWidth: maxW,
    };
  }

  /** ====== Render ====== */
  return (
    <div className={`overflow-x-auto ${wrapperClassName || ""}`}>
      {/* Colgroup para refletir width nas células também */}
      <table className={tableClassName} style={{ tableLayout: "fixed" }}>
        <colgroup>
          {columns.map((c) => {
            const w =
              colWidths[c.key] ??
              (typeof c.width === "number" ? c.width : undefined);
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
              const cls =
                `${rowBaseClassName} ` + (rowClassName ? rowClassName(row, i) : "");
              return (
                <tr
                  key={getRowKey(row, i)}
                  className={cls}
                  onDoubleClick={onRowDoubleClick ? () => onRowDoubleClick(row, i) : undefined}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`px-4 py-2 ${cellBaseClassName || ""} ${c.tdClassName || ""} ${alignToClass(c.align)}`}
                    >
                      {c.cell ? c.cell(row, i) : (row as any)[c.field as string]}
                    </td>
                  ))}
                </tr>
              );
            })}
        </tbody>
      </table>

      {stickyHeader && (
        <style>{`thead { position: sticky; top: 0; z-index: 10; }`}</style>
      )}
    </div>
  );
}

/** ========= Cabeçalho com ícone de sort e "grip" de resize ========= */
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
        // se clicar no "grip" do resize, não ordenar
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
          className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize"
          style={{
            // área de arraste
            transform: "translateX(50%)",
          }}
          title="Arraste para ajustar a largura"
        />
      )}

      {/* borda visual do sticky header não "saltar" ao arrastar */}
      {stickyHeader && (
        <style>{`
          th { background-clip: padding-box; }
        `}</style>
      )}
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
  // números
  if (typeof a === "number" && typeof b === "number") return a - b;

  // datas (strings parsáveis)
  const aDate = toTime(a);
  const bDate = toTime(b);
  if (aDate != null && bDate != null) return aDate - bDate;

  // fallback: string com comparação "natural"
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
