import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import Layout from "../../../components/Layout";
import DateRange from "../../../components/inputs/DateRange";
import DefaultButton from "../../../components/inputs/DefaultButton";
import DefaultSelect from "../../../components/inputs/DefaultSelect";
import StoreMultiSelect from "../../../components/inputs/StoreMultiSelect";
import ContentLoader from "../../../components/loading/ContentLoader";
import SimpleTable, { type Column } from "../../../components/table/SimpleTable";
import { useAuth } from "../../../hooks/useAuth";
import { useVendaDiaD } from "./hooks/useVendaDiaD";
import type { GetVendaDiaDParams, VendaDiaDRow, VendaDiaDViewType } from "./types";

function formatInteger(value: unknown) {
  if (value == null || value === "") return "0";
  const n = Number(value);
  if (Number.isNaN(n)) return "0";
  return Math.trunc(n).toLocaleString("pt-BR");
}

function formatDecimal(value: unknown) {
  if (value == null || value === "") return "0,00";
  const n = Number(value);
  if (Number.isNaN(n)) return "0,00";
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: unknown) {
  if (value == null || value === "") return "";
  const raw = String(value).slice(0, 10);
  const [y, m, d] = raw.split("-");
  if (!y || !m || !d) return String(value);
  return `${d}/${m}/${y}`;
}

function formatMonth(value: unknown) {
  if (value == null || value === "") return "";
  const raw = String(value).slice(0, 10);
  const [y, m] = raw.split("-");
  if (!y || !m) return String(value);
  return `${m}/${y}`;
}

export default function VendaDiaDPage() {
  const { token } = useAuth();
  const [sp, setSearchParams] = useSearchParams();
  const { fetchVendaDiaD } = useVendaDiaD(token);

  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [initialDate, setInitialDate] = useState<string>("");
  const [finalDate, setFinalDate] = useState<string>("");
  const [viewType, setViewType] = useState<VendaDiaDViewType>("total");
  const [appliedViewType, setAppliedViewType] = useState<VendaDiaDViewType>("total");
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<VendaDiaDRow[]>([]);

  const columns: Column<VendaDiaDRow>[] = useMemo(() => {
    const baseCols: Column<VendaDiaDRow>[] = [
      {
        key: "qtd_cupom",
        header: "Qtd. Cupom",
        align: "right",
        cell: (row) => formatInteger(row.qtd_cupom),
        sortAccessor: (row) => Number(row.qtd_cupom ?? 0),
        sortable: true,
      },
      {
        key: "qtd_cliente",
        header: "Qtd. Cliente",
        align: "right",
        cell: (row) => formatInteger(row.qtd_cliente),
        sortAccessor: (row) => Number(row.qtd_cliente ?? 0),
        sortable: true,
      },
      {
        key: "total_venda",
        header: "Total Venda",
        align: "right",
        cell: (row) => formatDecimal(row.total_venda),
        sortAccessor: (row) => Number(row.total_venda ?? 0),
        sortable: true,
      },
      {
        key: "total_desconto",
        header: "Total Desconto",
        align: "right",
        cell: (row) => formatDecimal(row.total_desconto),
        sortAccessor: (row) => Number(row.total_desconto ?? 0),
        sortable: true,
      },
      {
        key: "total_liquido",
        header: "Total Liquido",
        align: "right",
        cell: (row) => formatDecimal(Number(row.total_venda ?? 0) - Number(row.total_desconto ?? 0)),
        sortAccessor: (row) => Number(row.total_venda ?? 0) - Number(row.total_desconto ?? 0),
        sortable: true,
      },
    ];

    if (appliedViewType === "diario") {
      return [
        {
          key: "data",
          header: "Data",
          align: "left",
          cell: (row) => formatDate((row as { data?: string }).data),
          sortAccessor: (row) => {
            const raw = (row as { data?: string }).data ?? "";
            const dt = new Date(raw);
            return Number.isNaN(dt.getTime()) ? 0 : dt.getTime();
          },
          sortable: true,
          overflow: "wrap",
        },
        ...baseCols,
      ];
    }

    if (appliedViewType === "periodo") {
      return [
        {
          key: "periodo",
          header: "Periodo",
          align: "left",
          cell: (row) => (row as { periodo?: string }).periodo ?? "",
          sortAccessor: (row) => {
            const periodo = (row as { periodo?: string }).periodo ?? "";
            const [start = ""] = periodo.split(" a ");
            const [d = "", m = "", y = ""] = start.split("/");
            const dt = new Date(`${y}-${m}-${d}`);
            return Number.isNaN(dt.getTime()) ? 0 : dt.getTime();
          },
          sortable: true,
          overflow: "wrap",
        },
        ...baseCols,
      ];
    }

    if (appliedViewType === "mensal") {
      return [
        {
          key: "mes",
          header: "Mes",
          align: "left",
          cell: (row) => formatMonth((row as { mes?: string }).mes),
          sortAccessor: (row) => {
            const raw = (row as { mes?: string }).mes ?? "";
            const dt = new Date(raw);
            return Number.isNaN(dt.getTime()) ? 0 : dt.getTime();
          },
          sortable: true,
          overflow: "wrap",
        },
        ...baseCols,
      ];
    }

    return baseCols;
  }, [appliedViewType]);

  async function onClickConsultar() {
    try {
      setLoading(true);

      if (selectedStores.length === 0) {
        throw new Error("Selecione pelo menos uma loja.");
      }
      if (!initialDate || !finalDate) {
        throw new Error("Informe data inicial e final.");
      }

      const qs = new URLSearchParams(sp);
      setSearchParams(qs, { replace: true });

      const params: GetVendaDiaDParams = {
        storeId: selectedStores,
        initialDate,
        finalDate,
        viewType,
      };

      const result = await fetchVendaDiaD(params);
      setRows(Array.isArray(result) ? result : []);
      setAppliedViewType(viewType);
      setHasSearched(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao consultar Venda Dia D.";
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
    <Layout title="Venda Dia D">
      <ContentLoader open={loading} label="Consultando..." />

      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-pilar-default-bg2-dark p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-1">
            <label className="block text-xs text-neutral-600 dark:text-neutral-300 mb-1">
              Lojas
            </label>
            <StoreMultiSelect
              permissionCode="venda-dia-d:consultar"
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

          <div className="md:col-span-1">
            <label className="block text-xs text-neutral-600 dark:text-neutral-300 mb-1">
              Visualizacao
            </label>
            <DefaultSelect
              options={[
                { value: "diario", label: "Diario" },
                { value: "mensal", label: "Mensal" },
                { value: "periodo", label: "Periodo" },
                { value: "total", label: "Total" },
              ]}
              value={viewType}
              onChangeValue={(v) => setViewType((v as VendaDiaDViewType) || "total")}
              syncUrl
              paramKey="viewType"
              legacyKeys={["tipoVisualizacao"]}
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
          <div className="rounded-lg border dark:border-neutral-700 bg-white dark:bg-pilar-default-bg2-dark text-neutral-900 dark:text-neutral-100 shadow">
            <div className="px-4 py-3 border-b dark:border-neutral-700">
              <h3 className="text-lg font-semibold">Venda Dia D ({appliedViewType})</h3>
            </div>

            <SimpleTable<VendaDiaDRow>
              columns={columns}
              data={rows}
              loading={loading}
              emptyMessage="Nenhum registro encontrado."
              stickyHeader
              wrapperClassName="max-h-[calc(100vh-260px)] overflow-auto"
              tableClassName="w-full text-sm text-left border-collapse"
              headerWrapperClassName="bg-neutral-50 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              headerCellClassName="border border-neutral-200 dark:border-neutral-700 text-[11px] font-semibold uppercase tracking-wide"
              rowBaseClassName=""
              cellBaseClassName="border border-neutral-200 dark:border-neutral-700"
              rowClassName={(_row, i) =>
                `${i % 2 === 0 ? "bg-white dark:bg-transparent" : "bg-neutral-50/60 dark:bg-neutral-900/20"} hover:bg-neutral-100/70 dark:hover:bg-neutral-800/60`
              }
              exportOptions={{
                enabled: true,
                excel: true,
                pdf: true,
                filename: `venda-dia-d-${appliedViewType}`,
                sheetName: "Venda Dia D",
                pdfOptions: { orientation: "landscape", title: "Venda Dia D" },
              }}
            />
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900/40 p-8 text-center text-neutral-700 dark:text-neutral-300">
            <p className="text-sm">Nenhum resultado encontrado.</p>
          </div>
        ))}
    </Layout>
  );
}
