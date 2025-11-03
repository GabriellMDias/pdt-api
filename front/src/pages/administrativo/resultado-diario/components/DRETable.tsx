
import { useMemo } from "react";
import type { CostCenter, DREByCostCenter, Store } from "../types";
import { ExportToExcelButton } from "../../../../components/table/exportTableToExcel/ExportToExcelButton";

type Props = {
  data: DREByCostCenter[];
  costCenters: CostCenter[];
  stores: Store[];
  selectedStoreIds: Array<string | number>;
  start?: string;
  end?: string;
};

type Metric = {
  // chave usada no objeto de métricas calculadas
  prop: keyof Calculated;
  label: string;
  type: "money" | "percent";
  bold?: boolean;
  shade?: boolean; // usa bg-slate-300
};

type Calculated = {
  recBruta: number;
  devolucao: number;
  imposto: number;
  receitaLiquida: number;
  custo: number;
  embalagem: number;
  lucroBruto: number;
  margemLB: number;       // %
  quebra: number;
  percQuebra: number;     // %
  recCom: number;
  percRecCom: number;     // %
  despesaPessoal: number;
  percDespPes: number;    // %
  contribuicao: number;
  margemContrib: number;  // %
  despesaOperacional: number;
  percDespOper: number;   // %
  ebitida: number;
  margemEbitida: number;  // %
  participacao: number;   // %
};

const money = (v: number) =>
  (v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const percent = (v: number) =>
  `${((v ?? 0) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;

const NEG = (v: number) => v < 0;

const defaultOrder = [3, 8, 9, 10, 11]; // FLV, PADARIA, ACOUGUE, SECOS, ROTISSERIA

export default function DRETable({
  data,
  costCenters
}: Props) {
  // mapa CostCenter -> descrição
  const ccDesc = useMemo(() => {
    const m = new Map<number, string>();
    costCenters.forEach((c) => m.set(c.id, String(c.description)));
    return m;
  }, [costCenters]);

  // ordem de colunas (somente CCs que vieram no payload)
  const cols = useMemo(() => {
    const ids = data.map((d) => d.costCenterId);
    return [...ids].sort((a, b) => {
      const ia = defaultOrder.indexOf(a);
      const ib = defaultOrder.indexOf(b);
      const ra = ia === -1 ? Number.POSITIVE_INFINITY : ia;
      const rb = ib === -1 ? Number.POSITIVE_INFINITY : ib;
      if (ra !== rb) return ra - rb;
      // fallback: por descrição
      return (ccDesc.get(a) || "").localeCompare(ccDesc.get(b) || "");
    });
  }, [data, ccDesc]);

  // somatórios base
  const totals = useMemo(() => {
    return data.reduce(
      (acc, d) => {
        const v = d.data;
        acc.recBruta += v.recBruta;
        acc.devolucao += v.devolucao;
        acc.imposto += v.imposto;
        acc.custo += v.custo;
        acc.embalagem += v.embalagem;
        acc.quebra += v.quebra;
        acc.recCom += v.recCom;
        acc.despesaPessoal += v.despesaPessoal;
        acc.despesaOperacional += v.despesaOperacional;
        return acc;
      },
      {
        recBruta: 0,
        devolucao: 0,
        imposto: 0,
        custo: 0,
        embalagem: 0,
        quebra: 0,
        recCom: 0,
        despesaPessoal: 0,
        despesaOperacional: 0,
      }
    );
  }, [data]);

  const byCC: Record<number, Calculated> = useMemo(() => {
    const map: Record<number, Calculated> = {};
    const totalRB = totals.recBruta || 0;

    for (const row of data) {
      const v = row.data;
      const rb = v.recBruta || 0;

      const receitaLiquida = v.recBruta + v.devolucao + v.imposto;
      const lucroBruto = receitaLiquida + v.custo + v.embalagem;
      const contribuicao = lucroBruto + v.quebra + v.recCom + v.despesaPessoal;
      const ebitida = contribuicao + v.despesaOperacional;

      map[row.costCenterId] = {
        recBruta: v.recBruta,
        devolucao: v.devolucao,
        imposto: v.imposto,
        receitaLiquida,
        custo: v.custo,
        embalagem: v.embalagem,
        lucroBruto,
        margemLB: rb ? lucroBruto / rb : 0,
        quebra: v.quebra,
        percQuebra: rb ? v.quebra / rb : 0,
        recCom: v.recCom,
        percRecCom: rb ? v.recCom / rb : 0,
        despesaPessoal: v.despesaPessoal,
        percDespPes: rb ? v.despesaPessoal / rb : 0,
        contribuicao,
        margemContrib: rb ? contribuicao / rb : 0,
        despesaOperacional: v.despesaOperacional,
        percDespOper: rb ? v.despesaOperacional / rb : 0,
        ebitida,
        margemEbitida: rb ? ebitida / rb : 0,
        participacao: totalRB ? v.recBruta / totalRB : 0,
      };
    }
    return map;
  }, [data, totals.recBruta]);

  const totalCalc: Calculated = useMemo(() => {
    const rb = totals.recBruta || 0;
    const receitaLiquida = totals.recBruta + totals.devolucao + totals.imposto;
    const lucroBruto = receitaLiquida + totals.custo + totals.embalagem;
    const contribuicao = lucroBruto + totals.quebra + totals.recCom + totals.despesaPessoal;
    const ebitida = contribuicao + totals.despesaOperacional;
    return {
      recBruta: totals.recBruta,
      devolucao: totals.devolucao,
      imposto: totals.imposto,
      receitaLiquida,
      custo: totals.custo,
      embalagem: totals.embalagem,
      lucroBruto,
      margemLB: rb ? lucroBruto / rb : 0,
      quebra: totals.quebra,
      percQuebra: rb ? totals.quebra / rb : 0,
      recCom: totals.recCom,
      percRecCom: rb ? totals.recCom / rb : 0,
      despesaPessoal: totals.despesaPessoal,
      percDespPes: rb ? totals.despesaPessoal / rb : 0,
      contribuicao,
      margemContrib: rb ? contribuicao / rb : 0,
      despesaOperacional: totals.despesaOperacional,
      percDespOper: rb ? totals.despesaOperacional / rb : 0,
      ebitida,
      margemEbitida: rb ? ebitida / rb : 0,
      participacao: 1, // total = 100%
    };
  }, [totals]);

  const metrics: Metric[] = [
    { prop: "participacao", label: "PARTICIPAÇÃO (%)", type: "percent" },

    { prop: "recBruta", label: "RECEITA BRUTA DE VENDAS", type: "money", bold: true, shade: true },
    { prop: "devolucao", label: "DEVOLUÇÃO DE VENDAS", type: "money" },
    { prop: "imposto", label: "IMPOSTO SOBRE VENDAS", type: "money" },

    { prop: "receitaLiquida", label: "RECEITA LIQUIDA DE VENDAS", type: "money", bold: true, shade: true },

    { prop: "custo", label: "CUSTO PRODUTO", type: "money" },
    { prop: "embalagem", label: "CUSTO EMBALAGEM", type: "money" },

    { prop: "lucroBruto", label: "LUCRO BRUTO", type: "money", bold: true, shade: true },
    { prop: "margemLB", label: "MARGEM DE LUCRO BRUTO", type: "percent", bold: true, shade: true },

    { prop: "quebra", label: "DESPESA COM AVARIA E CONSUMO DE PRODUTOS", type: "money" },
    { prop: "percQuebra", label: "%", type: "percent" },

    { prop: "recCom", label: "RECEITAS COMERCIAIS", type: "money" },
    { prop: "percRecCom", label: "%", type: "percent" },

    { prop: "despesaPessoal", label: "DESPESA DIRETA COM O PESSOAL", type: "money" },
    { prop: "percDespPes", label: "%", type: "percent" },

    { prop: "contribuicao", label: "CONTRIBUIÇÃO", type: "money", bold: true, shade: true },
    { prop: "margemContrib", label: "MARGEM DE CONTRIBUIÇÃO", type: "percent", bold: true, shade: true },

    { prop: "despesaOperacional", label: "DESPESAS OPERACIONAIS", type: "money" },
    { prop: "percDespOper", label: "%", type: "percent" },

    { prop: "ebitida", label: "EBITIDA", type: "money", bold: true, shade: true },
    { prop: "margemEbitida", label: "MARGEM EBITIDA", type: "percent", bold: true, shade: true },
  ];

  const thBase = "border border-slate-600 px-2 py-2 text-left bold";
  const tdBase = "border border-slate-600 px-2 py-1 whitespace-nowrap text-right";
  const stickyFirst =
    "sticky left-0 z-10 bg-white border border-slate-600 px-2 py-1 text-left";
  const stickyFirstShade =
    "sticky left-0 z-10 bg-slate-300 border border-slate-600 px-2 py-1 text-left";

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-pilar-default-bg2-dark pl-10 pr-10 p-2">
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
            {metrics.map((m) => (
              <tr key={m.prop as string} className={m.shade ? "bg-slate-300" : "bg-white"}>
                <td className={m.shade ? stickyFirstShade : stickyFirst}>
                  <span className={m.bold ? "font-bold" : ""}>{m.label}</span>
                </td>

                {/* células por centro de custo */}
                {cols.map((cc) => {
                  const v = (byCC[cc]?.[m.prop] as number) ?? 0;
                  const cls = `${tdBase} ${m.bold ? "font-bold" : ""} ${
                    NEG(v) ? "text-red-500" : ""
                  }`;
                  return (
                    <td key={`${m.prop}-${cc}`} className={cls}>
                      {m.type === "money" ? money(v) : percent(v)}
                    </td>
                  );
                })}

                {/* total */}
                {(() => {
                  const tv = (totalCalc[m.prop] as number) ?? 0;
                  const cls = `${tdBase} ${m.bold ? "font-bold" : ""} ${NEG(tv) ? "text-red-500" : ""}`;
                  return <td className={cls}>{m.type === "money" ? money(tv) : percent(tv)}</td>;
                })()}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end p-2">
        <ExportToExcelButton fileName="Resultado KNTT" tableId="dre-table"/>
      </div>
    </div>
  );
}
