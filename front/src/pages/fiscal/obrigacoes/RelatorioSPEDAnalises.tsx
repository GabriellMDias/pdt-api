// src/pages/fiscal/obrigacoes/RelatorioSPEDAnalises.tsx
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
      tdClassName: "border px-3 py-2",
      thClassName: "border px-3 py-2",
      resizable: true
    }));
  }

  return (
    <Layout title="Detalhes do Relatório SPED">
      <div className="p-6 space-y-8">
        {loading ? (
          <p className="text-center">Carregando...</p>
        ) : analises.length === 0 ? (
          <p className="text-center">Nenhuma análise encontrada.</p>
        ) : (
          Object.entries(analisesAgrupadas).map(([grupo, analisesGrupo]) => (
            <div key={grupo} className="bg-white rounded-lg border border-gray-200 text-black shadow">
              <div className="flex items-center justify-between bg-gray-100 p-3 rounded-t">
                <h3 className="text-lg font-semibold">{grupo}</h3>
                {analisesGrupo[0] && (
                  <div className="text-xs text-gray-600">
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
                tableClassName="w-full text-sm text-left"
                getRowKey={(row) => row.id}
                rowClassName={(row) => {
                  const erros = row.data?.summary?.notasComErro ?? 0;
                  return erros > 0 ? "hover:bg-red-50 cursor-pointer" : "cursor-default";
                }}
                onRowDoubleClick={(row) => {
                  const erros = row.data?.summary?.notasComErro ?? 0;
                  if (erros > 0) setSelectedAnalise(row);
                }}
              />
              <p className="text-xs text-gray-500 px-4 pb-3">
                Dê <strong>duplo clique</strong> na linha (se houver erros) para ver os detalhes.
              </p>
            </div>
          ))
        )}
      </div>

      {/* Modal de erros */}
      {selectedAnalise && selectedAnalise.data?.errors?.length > 0 && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/75 z-50 text-black">
          <div className="bg-white w-11/12 max-w-5xl rounded-lg shadow-lg p-6 relative">
            <button
              className="absolute top-2 right-2 text-gray-600 hover:text-black cursor-pointer"
              onClick={() => setSelectedAnalise(null)}
              aria-label="Fechar"
              title="Fechar"
            >
              ✕
            </button>

            <div className="mb-3">
              <h3 className="text-lg font-semibold">
                Detalhes: {selectedAnalise.analysisType?.description}
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                Período:{" "}
                {new Date(selectedAnalise.sourceStart).toLocaleDateString("pt-BR")} -{" "}
                {new Date(selectedAnalise.sourceEnd).toLocaleDateString("pt-BR")} &middot; Computado:{" "}
                {new Date(selectedAnalise.computedAt).toLocaleString("pt-BR")}
              </p>
            </div>

            <div className="overflow-x-auto max-h-96">
              <SimpleTable<ErrorRow>
                columns={makeErrorColumns(selectedAnalise)}
                data={selectedAnalise.data.errors}
                loading={false}
                emptyMessage="Sem linhas de erro para exibir."
                tableClassName="w-full text-sm border"
                getRowKey={(_row, i) => i}
                rowClassName={(_row) => "hover:bg-gray-50"}
              />
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
