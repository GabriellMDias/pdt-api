import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../../hooks/useAuth";
import { useGestaoaVista } from "../hooks/useGestaoaVista";
import type { CompareMode, CostCenterComparative } from "../types";
import type { CostCenter as ApiCostCenter } from "../../resultado-diario/types";
import { toast } from "react-toastify";
import { ExportToExcelButton } from "../../../../components/table/exportTableToExcel/ExportToExcelButton";
import { AnimatePresence, motion } from "framer-motion";

type Props = {
  stores: string[];
  initialDate?: string;
  finalDate?: string;
  mode: CompareMode;
  competencia?: string;
  refreshKey?: number;
  className?: string;
  tableId?: string;
};

const pad2 = (n: number) => String(n).padStart(2, "0");
const ymToRange = (ym: string) => {
  const [yStr, mStr] = ym.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  if (!y || !m) return { start: "", end: "" };
  const lastDay = new Date(y, m, 0).getDate();
  return { start: `${y}-${pad2(m)}-01`, end: `${y}-${pad2(m)}-${pad2(lastDay)}` };
};
const dateToFullMonth = (d: string) => {
  const [yStr, mStr] = d.split("-"); const y = Number(yStr); const m = Number(mStr);
  if (!y || !m) return { start: "", end: "" };
  const lastDay = new Date(y, m, 0).getDate();
  return { start: `${y}-${pad2(m)}-01`, end: `${y}-${pad2(m)}-${pad2(lastDay)}` };
};

const parseYMD = (s?: string) => (s ? new Date(s + "T00:00:00") : undefined);
const subMonths = (d: Date, n: number) => { const x = new Date(d); x.setMonth(x.getMonth() - n); return x; };
const hdr = (d: Date) => d.toLocaleDateString("pt-br", { month: "numeric", year: "numeric" }).toUpperCase();

const nf2 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function percentDotClass(p: number) {
  if (!Number.isFinite(p)) return "bg-gray-300";
  if (p < 0) return "bg-red-500";
  if (p < 1) return "bg-yellow-500";
  return "bg-green-500";
}

function tdNumber(
  v: number,
  {
    className = "",
    percent = false,
    borderLeft = false,
    borderRight = false,
    withDot = false,
  }: { className?: string; percent?: boolean; borderLeft?: boolean; borderRight?: boolean; withDot?: boolean } = {}
) {
  const neg = Number.isFinite(v) && v < 0;
  const fmt = Number.isFinite(v) ? (percent ? `${nf2.format(v)} %` : nf2.format(v)) : percent ? "-" : "0,00";
  const borders = `${borderLeft ? " border-l-2 border-black" : ""}${borderRight ? " border-r-2 border-black" : ""}`;
  const baseTdAlign = percent ? "text-right" : "text-center";
  const rowJustify = percent ? "justify-end" : "justify-center";

  return (
    <td className={`py-1 px-2 ${baseTdAlign} ${className}${borders}`}>
      <div className={`inline-flex w-full ${rowJustify} items-center gap-2 tabular-nums`}>
        {withDot && <span className={`inline-block h-3 w-3 rounded-full ${percentDotClass(v)}`} />}
        <span className={neg ? "text-red-600" : ""}>{fmt}</span>
      </div>
    </td>
  );
}

export default function GestaoaVistaTable({
  stores,
  initialDate,
  finalDate,
  mode,
  competencia,
  refreshKey,
  className = "",
  tableId = "gestaoavista-table",
}: Props) {
  const { token } = useAuth();
  const { fetchDREData, fetchCostCenters } = useGestaoaVista(token);

  const [loading, setLoading] = useState(false);
  const [centers, setCenters] = useState<ApiCostCenter[]>([]);
  const [rows, setRows] = useState<CostCenterComparative[]>([]);
  const [openCenters, setOpenCenters] = useState<number[]>([]);

  const effectiveDates = useMemo(() => {
    if (mode === "month") {
      if (competencia) return ymToRange(competencia);
      if (finalDate) return dateToFullMonth(finalDate);
      if (initialDate) return dateToFullMonth(initialDate);
      return { start: "", end: "" };
    }
    return { start: initialDate || "", end: finalDate || "" };
  }, [mode, initialDate, finalDate, competencia]);

  const headerLabels = useMemo(() => {
    const end = parseYMD(effectiveDates.end);
    if (!end) return ["MÊS ANT.", "MÊS ATUAL", "% MA", "ANO ANT.", "% AA", "ANO ANT.", "MÊS ATUAL", "TENDÊNCIA"];
    const lastM = subMonths(end, 1);
    const lastY = subMonths(end, 12);
    return [hdr(lastM), hdr(end), "% MA", hdr(lastY), "% AA", hdr(lastY), hdr(end), "TENDÊNCIA"];
  }, [effectiveDates.end]);

  const toggleCenter = (id: number) =>
    setOpenCenters((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetchCostCenters();
        if (!cancelled) setCenters(resp || []);
      } catch {
        if (!cancelled) setCenters([]);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchCostCenters]);

  useEffect(() => {
    let cancelled = false;
    const canQuery = !!refreshKey && stores?.length > 0 && !!effectiveDates.start && !!effectiveDates.end && !!mode;
    if (!canQuery) return;

    setLoading(true);
    (async () => {
      try {
        const resp = await fetchDREData({
          storeId: stores,
          initialDate: effectiveDates.start,
          finalDate: effectiveDates.end,
          mode,
        });
        if (!cancelled) setRows(resp || []);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        toast.error(error?.message ?? "Falha ao buscar dados", { position: "top-right", theme: "dark" });
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const rowsByCenter = useMemo(() => {
    const map = new Map<number, CostCenterComparative[]>();
    for (const r of rows) {
      const list = map.get(r.costCenterId) || [];
      list.push(r);
      map.set(r.costCenterId, list);
    }
    return map;
  }, [rows]);

  const grandTotal = useMemo(() => {
    let sale = 0, salePast = 0, salePastYear = 0, partLY = 0, part = 0, tendencia = 0;
    for (const r of rows) {
      sale += r.saleValue || 0;
      salePast += r.saleValuePastPeriodData || 0;
      salePastYear += r.saleValuePastYearPeriodData || 0;
      partLY += r.partLastYear || 0;
      part += r.part || 0;
      tendencia += r.tendencia || 0;
    }
    const percMA = ((sale || 0) / (salePast || 1) - 1) * 100;
    const percAA = ((sale || 0) / (salePastYear || 1) - 1) * 100;
    return { sale, salePast, salePastYear, partLY, part, tendencia, percMA, percAA };
  }, [rows]);

  // total de colunas (1 caret + 1 nome + 8 métricas)
  const COLSPAN = 10;

  return (
    <div className={`relative w-full overflow-x-auto ${className}`}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-[1px]">
          <div className="rounded-md bg-black/60 text-white px-3 py-2 text-sm">Carregando…</div>
        </div>
      )}

      <div className={`rounded-xl overflow-hidden shadow ring-1 ring-gray-700/50 ${loading ? "opacity-60" : ""}`}>
        <table id={tableId} className="w-full table-fixed bg-white text-black text-sm">
          <thead className="text-xs uppercase tracking-wide sticky top-0 z-10">
            <tr className="bg-blue-800 text-white">
              <th className="w-10" />
              <th className="py-2 px-3 text-left">Centro de Custo</th>
              {headerLabels.map((h, i) => (
                <th
                  key={i}
                  className={
                    "py-2 px-3 text-center" +
                    (i === 5 ? " border-l-2 border-black" : "") +
                    (i === 6 ? " border-r-2 border-black" : "")
                  }
                >
                  {h}
                </th>
              ))}
            </tr>
            <tr className="bg-blue-50 text-blue-900">
              <th />
              <th />
              <th colSpan={5} />
              <th colSpan={2} className="text-xs font-semibold border-x-2 border-black">
                PARTICIPAÇÃO SETORES
              </th>
              <th />
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-300">
            {centers.map((c) => {
              const list = rowsByCenter.get(c.id) || [];
              if (!list.length) return null;

              const isOpen = openCenters.includes(c.id);

              const sale = list.reduce((p, r) => p + (r.saleValue || 0), 0);
              const salePast = list.reduce((p, r) => p + (r.saleValuePastPeriodData || 0), 0);
              const salePastYear = list.reduce((p, r) => p + (r.saleValuePastYearPeriodData || 0), 0);
              const partLY = list.reduce((p, r) => p + (r.partLastYear || 0), 0);
              const part = list.reduce((p, r) => p + (r.part || 0), 0);
              const tendencia = list.reduce((p, r) => p + (r.tendencia || 0), 0);
              const percMA = ((sale || 0) / (salePast || 1) - 1) * 100;
              const percAA = ((sale || 0) / (salePastYear || 1) - 1) * 100;

              return (
                <React.Fragment key={c.id}>
                  {/* resumo do centro */}
                  <tr className="bg-slate-50">
                    <td className="text-blue-900 font-bold text-center">
                      <button
                        type="button"
                        onClick={() => toggleCenter(c.id)}
                        className={`cursor-pointer inline-block transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                        aria-expanded={isOpen}
                        aria-label="Expandir/colapsar"
                      >
                        ▸
                      </button>
                    </td>
                    <td className="text-blue-900 font-bold">{String(c.description)}</td>

                    {tdNumber(salePast, { className: "bg-slate-50 font-bold" })}
                    {tdNumber(sale, { className: "bg-slate-50 font-bold" })}
                    {tdNumber(percMA, { className: "bg-slate-50 font-bold", percent: true, withDot: true })}
                    {tdNumber(salePastYear, { className: "bg-slate-50 font-bold" })}
                    {tdNumber(percAA, { className: "bg-slate-50 font-bold", percent: true, withDot: true })}
                    {tdNumber(partLY, { className: "bg-slate-50 font-bold", percent: true, borderLeft: true })}
                    {tdNumber(part, { className: "bg-slate-50 font-bold", percent: true, borderRight: true })}
                    {tdNumber(tendencia, { className: "bg-slate-50 font-bold" })}
                  </tr>

                  {/* bloco animado com as linhas filhas */}
                  <tr>
                    <td colSpan={COLSPAN} className="p-0">
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            key={`sub-${c.id}`}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <table className="w-full table-fixed bg-white">
                              <tbody>
                                {list.map((r, idx) => (
                                  <tr key={`${c.id}-${r.departmentVrId1}-${idx}`} className="bg-white">
                                    <td className="w-10" />
                                    <td className="pl-3">{r.departmentVrDesc}</td>
                                    {tdNumber(r.saleValuePastPeriodData || 0)}
                                    {tdNumber(r.saleValue || 0)}
                                    {tdNumber(r.percMA || 0, { percent: true, withDot: true })}
                                    {tdNumber(r.saleValuePastYearPeriodData || 0)}
                                    {tdNumber(r.percAA || 0, { percent: true, withDot: true })}
                                    {tdNumber(r.partLastYear || 0, { percent: true, borderLeft: true })}
                                    {tdNumber(r.part || 0, { percent: true, borderRight: true })}
                                    {tdNumber(r.tendencia || 0)}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}

            {/* TOTAL */}
            <tr className="bg-slate-100 font-bold border-t-2 border-black">
              <td />
              <td className="text-blue-900">TOTAL</td>
              {tdNumber(grandTotal.salePast)}
              {tdNumber(grandTotal.sale)}
              {tdNumber(grandTotal.percMA, { percent: true, withDot: true })}
              {tdNumber(grandTotal.salePastYear)}
              {tdNumber(grandTotal.percAA, { percent: true, withDot: true })}
              {tdNumber(grandTotal.partLY, { percent: true, borderLeft: true })}
              {tdNumber(grandTotal.part, { percent: true, borderRight: true })}
              {tdNumber(grandTotal.tendencia)}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex justify-end p-2">
        <ExportToExcelButton fileName="Gestão a Vista" tableId={tableId}/>
      </div>
    </div>
  );
}
