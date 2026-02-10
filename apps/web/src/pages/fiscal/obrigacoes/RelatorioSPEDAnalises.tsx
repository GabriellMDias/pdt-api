import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../../../components/Layout";
import { useAuth } from "../../../hooks/useAuth";
import SimpleTable, { type Column } from "../../../components/table/SimpleTable";

type DataType = "string" | "decimal" | "number" | "date" | "datetime" | "boolean";

interface FieldDef {
  name: string;
  order: number;
  dataType: DataType | string;
  description: string;
}

interface Summary {
  totalNotas: number;
  notasComErro: number;
}

type ErrorRow = Record<string, any>;

interface AnalysisData {
  errors: ErrorRow[];
  fields: FieldDef[];
  summary: Summary;
}

interface AnalysisTypeInfo {
  code: string;
  description: string;
  groupName: string;
}

interface Analise {
  id: string | number;
  analysisTypeId: number;
  storeId: number;
  bucket: string;        // ISO
  granularity: string;   // "month", etc.
  data: AnalysisData;
  sourceStart: string;   // ISO
  sourceEnd: string;     // ISO
  computedAt: string;    // ISO
  checksum: string | null;
  arquivoAnaliseId: number;
  analysisType: AnalysisTypeInfo;
}

export default function RelatorioSPEDAnalises() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();

  const [analises, setAnalises] = useState<Analise[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedAnalise, setSelectedAnalise] = useState<Analise | null>(null);

  useEffect(() => {
    const fetchAnalises = async () => {
      if (!token || !id) return;
      setLoading(true);
      try {
        // rota nova
        const response = await fetch(`/api/analysis/sped/by-file/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error((await response.text()) || `Erro: ${response.status}`);
        const data: Analise[] = await response.json();
        setAnalises(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Erro ao buscar análises:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalises();
  }, [id, token]);

  // Helper: formatação de células conforme FieldDef.dataType
  function formatCell(value: any, field?: FieldDef) {
    const t = field?.dataType?.toString().toLowerCase() as DataType | undefined;
    if (value == null) return "";

    switch (t) {
      case "decimal":
      case "number": {
        const n = Number(value);
        if (Number.isFinite(n)) {
          return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        return String(value);
      }
      case "date": {
        const d = new Date(value);
        return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("pt-BR");
      }
      case "datetime": {
        const d = new Date(value);
        return isNaN(d.getTime()) ? String(value) : d.toLocaleString("pt-BR");
      }
      case "boolean":
        return value ? "Sim" : "Não";
      case "string":
      default:
        return String(value);
    }
  }

  // Garante fields mesmo se API não enviar (fallback tirando das chaves do primeiro erro)
  function getOrderedFields(a: Analise): FieldDef[] {
    const fields = (a.data?.fields ?? []).slice().sort((x, y) => (x.order ?? 0) - (y.order ?? 0));
    if (fields.length > 0) return fields;
    const first = a.data?.errors?.[0];
    if (!first) return [];
    return Object.keys(first).map((k, i) => ({
      name: k,
      order: i,
      dataType: "string",
      description: k,
    }));
  }

  // Agrupando análises por groupName
  const analisesAgrupadas = useMemo(() => {
    return analises.reduce((acc, analise) => {
      const grupo = analise.analysisType?.groupName || "Outros";
      if (!acc[grupo]) acc[grupo] = [];
      acc[grupo].push(analise);
      return acc;
    }, {} as Record<string, Analise[]>);
  }, [analises]);

  // Definição de colunas para o quadro-resumo por grupo
  const resumoColumns: Column<Analise>[] = useMemo(
    () => [
      {
        key: "consulta",
        header: "Consulta",
        cell: (a) => a.analysisType?.description,
      },
      {
        key: "total",
        header: "Qtd. Analisado",
        align: "right",
        cell: (a) => a.data?.summary?.totalNotas ?? 0,
      },
      {
        key: "erros",
        header: "Qtd. Erro",
        align: "right",
        cell: (a) => {
          const erros = a.data?.summary?.notasComErro ?? 0;
          const cls = erros > 0 ? "text-red-600 font-semibold" : "text-green-600 font-semibold";
          return <span className={cls}>{erros}</span>;
        },
      },
    ],
    []
  );

  // Geração dinâmica de colunas para o modal (tabela de erros)
  function makeErrorColumns(a: Analise): Column<ErrorRow>[] {
    const fields = getOrderedFields(a);
    const toAlign = (t?: string): "left" | "center" | "right" => {
      const norm = (t || "").toLowerCase();
      if (norm === "decimal" || norm === "number") return "right";
      if (norm === "boolean") return "center";
      return "left";
    };

    return fields.map<Column<ErrorRow>>((f) => ({
      key: f.name,
      header: f.description || f.name,
      align: toAlign(f.dataType),
      cell: (row) => formatCell(row[f.name], f),
      tdClassName: "border border-neutral-200 px-3 py-2 dark:border-neutral-700",
      thClassName: "border border-neutral-200 px-3 py-2 dark:border-neutral-700",
      resizable: true,
      overflow: 'wrap'
    }));
  }

  return (
    <Layout title="Detalhes do Relatório SPED">
      <div className="space-y-8 p-6 text-neutral-800 dark:text-neutral-100">
        {loading ? (
          <p className="text-center text-neutral-600 dark:text-neutral-400">Carregando...</p>
        ) : analises.length === 0 ? (
          <p className="text-center text-neutral-600 dark:text-neutral-400">Nenhuma análise encontrada.</p>
        ) : (
          Object.entries(analisesAgrupadas).map(([grupo, analisesGrupo]) => (
            <div key={grupo} className="overflow-hidden rounded-xl border border-neutral-200 bg-white/90 text-neutral-800 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/35 dark:text-neutral-100">
              <div className="flex flex-col gap-2 border-b border-neutral-200 bg-neutral-50/80 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-700 dark:bg-neutral-800/40">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{grupo}</h3>
                {analisesGrupo[0] && (
                  <div className="text-xs text-neutral-600 dark:text-neutral-300">
                    <span className="mr-3">
                      Período:&nbsp;
                      {new Date(analisesGrupo[0].sourceStart).toLocaleDateString("pt-BR")} -{" "}
                      {new Date(analisesGrupo[0].sourceEnd).toLocaleDateString("pt-BR")}
                    </span>
                    <span>
                      Computado:&nbsp;
                      {new Date(analisesGrupo[0].computedAt).toLocaleString("pt-BR")}
                    </span>
                  </div>
                )}
              </div>

              <SimpleTable<Analise>
                columns={resumoColumns}
                data={analisesGrupo}
                loading={false}
                emptyMessage="Sem análises para o grupo."
                tableClassName="w-full text-left text-sm text-neutral-800 dark:text-neutral-100"
                headerWrapperClassName="bg-transparent"
                headerRowClassName="text-left text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-300"
                headerCellClassName="border-b border-neutral-200 py-3 font-semibold dark:border-neutral-700"
                bodyClassName="text-sm text-neutral-700 dark:text-neutral-100"
                cellBaseClassName="border-b border-neutral-200/80 py-2.5 dark:border-neutral-700"
                getRowKey={(row) => row.id}
                rowClassName={() => {
                  return "cursor-pointer transition-colors hover:bg-red-50 dark:hover:bg-red-950/30";
                }}
                onRowDoubleClick={(row) => {
                  setSelectedAnalise(row);
                }}
              />
              <p className="px-4 pb-3 text-xs text-neutral-500 dark:text-neutral-400">
                Dê <strong>duplo clique</strong> na linha (se houver erros) para ver os detalhes.
              </p>
            </div>
          ))
        )}
      </div>

      {/* Modal de erros */}
      {selectedAnalise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75">
          <div className="relative w-11/12 max-w-5xl rounded-xl border border-neutral-200 bg-white p-6 text-neutral-800 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100">
            <button
              className="absolute right-2 top-2 cursor-pointer text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
              onClick={() => setSelectedAnalise(null)}
              aria-label="Fechar"
              title="Fechar"
            >
              ✕
            </button>

            <div className="mb-3">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Detalhes: {selectedAnalise.analysisType?.description}
              </h3>
              <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
                Período:{" "}
                {new Date(selectedAnalise.sourceStart).toLocaleDateString("pt-BR")} -{" "}
                {new Date(selectedAnalise.sourceEnd).toLocaleDateString("pt-BR")} &middot; Computado:{" "}
                {new Date(selectedAnalise.computedAt).toLocaleString("pt-BR")}
              </p>
            </div>

            <div className="max-h-96 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
              <SimpleTable<ErrorRow>
                columns={makeErrorColumns(selectedAnalise)}
                data={selectedAnalise.data.errors}
                loading={false}
                emptyMessage="Sem linhas de erro para exibir."
                tableClassName="w-full text-sm text-neutral-800 dark:text-neutral-100"
                headerWrapperClassName="bg-neutral-50 dark:bg-neutral-800/40"
                headerRowClassName="text-left text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-300"
                headerCellClassName="py-2.5 font-semibold"
                bodyClassName="text-sm text-neutral-700 dark:text-neutral-100"
                cellBaseClassName="py-2"
                getRowKey={(_row, i) => i}
                rowClassName={() => "transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"}
                exportOptions={{
                  enabled: true,            // mostra toolbar
                  excel: true,
                  pdf: true,
                  filename: "erros",
                  sheetName: "Erros",
                  // headersOverride: ["Linha", "Campo", "Mensagem", "Valor"],
                  // mapCell: (v) => (typeof v === "string" || typeof v === "number" ? v : String(v ?? "")),
                  pdfOptions: { title: selectedAnalise.analysisType?.description, orientation: "landscape" },
                  // renderControls: ({ onExcel, onPDF }) => (
                  //   <div className="flex gap-2">
                  //     <MyIconBtn onClick={onExcel} icon="excel" />
                  //     <MyIconBtn onClick={onPDF} icon="pdf" />
                  //   </div>
                  // ),
                }}
              />
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

