import type { Column } from "../components/table/SimpleTable"; // ajuste o path!
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable, { type RowInput } from "jspdf-autotable";

export type ExportCommonOptions<T> = {
  /** Nome do arquivo (sem extensão) */
  filename?: string;
  /** Mapear/converter um valor antes de exportar (útil para cells custom) */
  mapCell?: (value: unknown, row: T, col: Column<T>, rowIndex: number) => string | number | null | undefined;
  /** Larguras em px por chave da coluna (para respeitar redimensionamento do usuário) */
  widthsPx?: Record<string, number>;
  /** Sobrescrever cabeçalhos (se o header for JSX complexo) */
  headersOverride?: (string | undefined)[];
};

export type ExportPDFOptions<T> = ExportCommonOptions<T> & {
  pdf?: {
    /** portrait | landscape */
    orientation?: "portrait" | "landscape";
    /** linebreak (quebra de linha) | ellipsize ("...") */
    overflow?: "linebreak" | "ellipsize";
    /** Título no topo do PDF */
    title?: string;
    /** Margens do jsPDF (mm) */
    margin?: number | { top?: number; right?: number; bottom?: number; left?: number };
    /** Tamanho da fonte (default 9) */
    fontSize?: number;
  };
};

export type ExportXLSXOptions<T> = ExportCommonOptions<T> & {
  /** Nome da planilha (aba) */
  sheetName?: string;
};

export function exportToXLSX<T>(
  columns: Column<T>[],
  rows: T[],
  opts: ExportXLSXOptions<T> = {}
) {
  const filename = (opts.filename || "export") + ".xlsx";

  const headers = getHeaders(columns, opts.headersOverride);
  const body = rows.map((row, i) => columns.map((c) => toCellValue(c, row, i, opts.mapCell)));

  const ws = XLSX.utils.aoa_to_sheet([headers, ...body]);

  // Ajusta larguras (wch ~ "character width") a partir de px
  ws["!cols"] = columns.map((c) => {
    const px =
      opts.widthsPx?.[c.key] ??
      (typeof c.width === "number" ? c.width : pxFromAny(c.width)) ??
      undefined;
    return px ? { wch: Math.max(6, Math.round(pxToWch(px))) } : { wch: 16 };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(opts.sheetName || "Dados"));
  XLSX.writeFile(wb, filename);
}

export function exportToPDF<T>(
  columns: Column<T>[],
  rows: T[],
  opts: ExportPDFOptions<T> = {}
) {
  const filename = (opts.filename || "export") + ".pdf";
  const pdfCfg = opts.pdf ?? {};
  const orientation = pdfCfg.orientation || "landscape";

  const doc = new jsPDF({ orientation });

  // Título opcional
  let startY = 10;
  if (pdfCfg.title) {
    doc.setFontSize(12);
    doc.text(pdfCfg.title, 14, startY);
    startY += 6;
  }

  const headers = getHeaders(columns, opts.headersOverride);
  const body: RowInput[] = rows.map((row, i) =>
    columns.map((c) => toCellValue(c, row, i, opts.mapCell) ?? "")
  );

  // Mapeia overflow do PDF: se coluna tem overflow 'wrap', viramos linebreak; senão ellipsize.
  const colOverflows = columns.map((c) => (c.overflow === "wrap" ? "linebreak" : "ellipsize"));
  const globalOverflow = pdfCfg.overflow || undefined;

  // Larguras: converte px -> mm para o autoTable
  const columnStyles: Record<number, { cellWidth?: number | "wrap" | "auto" }> = {};
  columns.forEach((c, idx) => {
    const px =
      opts.widthsPx?.[c.key] ??
      (typeof c.width === "number" ? c.width : pxFromAny(c.width)) ??
      undefined;
    if (px) columnStyles[idx] = { cellWidth: pxToMm(px) };
  });

  autoTable(doc, {
    startY,
    head: [headers as string[]],
    body: body as RowInput[],
    theme: "grid",
    styles: {
      fontSize: pdfCfg.fontSize ?? 9,
      cellPadding: 2,
      overflow: globalOverflow ?? "linebreak", // default geral
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: 20,
    },
    columnStyles: columnStyles,
    didParseCell: (data) => {
      const colIndex = data.column.index;
      // Se não há overflow global, aplica por coluna.
      if (!globalOverflow) {
        data.cell.styles.overflow = colOverflows[colIndex];
      }
      // Alinhamento por coluna (left/center/right)
      const col = columns[colIndex];
      if (col?.align === "center") data.cell.styles.halign = "center";
      else if (col?.align === "right") data.cell.styles.halign = "right";
      else data.cell.styles.halign = "left";
    },
    margin: normalizeMargin(pdfCfg.margin),
  });

  doc.save(filename);
}

/* ================= helpers ================= */

function getHeaders<T>(columns: Column<T>[], override?: (string | undefined)[]) {
  if (override && override.length === columns.length) return override.map((h) => h ?? "");
  return columns.map((c) => headerToText(c.header));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function headerToText(node: any): string {
  if (node == null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  // fallback para cabeçalhos com JSX: tenta pegar children text, senão String(node)
  const ch = node?.props?.children;
  if (typeof ch === "string" || typeof ch === "number") return String(ch);
  return String(node);
}

function toCellValue<T>(
  col: Column<T>,
  row: T,
  rowIndex: number,
  map?: (value: unknown, row: T, col: Column<T>, rowIndex: number) => string | number | null | undefined
): string | number | null | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = col.cell ? col.cell(row, rowIndex) : (row as any)[col.field as string];
  const v = map ? map(raw, row, col, rowIndex) : defaultToText(raw);
  return v;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function defaultToText(v: any): string | number | null | undefined {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return v;
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString();
  if (typeof v === "boolean") return v ? "true" : "false";
  // Tenta extrair texto de ReactNode simples
  const ch = v?.props?.children;
  if (typeof ch === "string" || typeof ch === "number") return ch;
  try {
    return typeof v === "object" ? JSON.stringify(v) : String(v);
  } catch {
    return String(v);
  }
}

function sanitizeSheetName(name: string) {
  return name.replace(/[\\/?*[\]:]/g, "_").slice(0, 31) || "Dados";
}

function pxFromAny(w?: string | number): number | undefined {
  if (typeof w === "number") return w;
  if (typeof w === "string") {
    const m = w.trim().match(/^(\d+(?:\.\d+)?)px$/i);
    if (m) return Number(m[1]);
  }
  return undefined;
}

function pxToWch(px: number) {
  // Excel: ~ 1ch ≈ 7px (média)
  return px / 7;
}

function pxToMm(px: number) {
  // 1px ≈ 0.264583 mm
  return px * 0.264583;
}

function normalizeMargin(m?: number | { top?: number; right?: number; bottom?: number; left?: number }) {
  if (m == null) return { top: 14, right: 14, bottom: 14, left: 14 };
  if (typeof m === "number") return { top: m, right: m, bottom: m, left: m };
  return { top: m.top ?? 14, right: m.right ?? 14, bottom: m.bottom ?? 14, left: m.left ?? 14 };
}
