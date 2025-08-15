import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../../../components/Layout";
import { useAuth } from "../../../hooks/useAuth";

interface ErroDetalhe {
  chave: string;
  numDoc: string;
  codPart: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
  diferenca?: number;
}

interface Analise {
  id: number;
  resultadoJson: {
    erros: ErroDetalhe[];
    totalNotas: number;
    notasComErro: number;
  };
  analysisType: {
    code: string;
    description: string;
    groupName: string;
  };
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

      try {
        const response = await fetch(`/api/sped/sped-analise/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error(`Erro: ${response.status}`);
        }

        const data: Analise[] = await response.json();
        setAnalises(data);
      } catch (error) {
        console.error("Erro ao buscar análises:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalises();
  }, [id, token]);

  // Agrupando análises por groupName
  const analisesAgrupadas = analises.reduce((acc, analise) => {
    const grupo = analise.analysisType.groupName || "Outros";
    if (!acc[grupo]) acc[grupo] = [];
    acc[grupo].push(analise);
    return acc;
  }, {} as Record<string, Analise[]>);

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
              <h3 className="text-lg font-semibold bg-gray-100 p-3 rounded-t">
                {grupo}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="px-4 py-2">Consulta</th>
                      <th className="px-4 py-2">Qtd. Analisado</th>
                      <th className="px-4 py-2">Qtd. Erro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analisesGrupo.map((analise) => (
                      <tr
                        key={analise.id}
                        className={`border-b hover:bg-gray-50 cursor-pointer ${
                          analise.resultadoJson.notasComErro > 0
                            ? "hover:bg-red-50"
                            : ""
                        }`}
                        onClick={() =>
                          analise.resultadoJson.notasComErro > 0 &&
                          setSelectedAnalise(analise)
                        }
                      >
                        <td className="px-4 py-2">
                          {analise.analysisType.description}
                        </td>
                        <td className="px-4 py-2">
                          {analise.resultadoJson.totalNotas}
                        </td>
                        <td
                          className={`px-4 py-2 font-semibold ${
                            analise.resultadoJson.notasComErro > 0
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {analise.resultadoJson.notasComErro}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal para mostrar os erros */}
      {selectedAnalise && selectedAnalise.resultadoJson.erros.length > 0 && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/75 z-50 text-black">
          <div className="bg-white w-11/12 max-w-5xl rounded-lg shadow-lg p-6 relative">
            <button
              className="absolute top-2 right-2 text-gray-600 hover:text-black cursor-pointer"
              onClick={() => setSelectedAnalise(null)}
            >
              ✕
            </button>
            <h3 className="text-lg font-semibold mb-4 ">
              Detalhes: {selectedAnalise.analysisType.description}
            </h3>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    {Object.keys(selectedAnalise.resultadoJson.erros[0]).map(
                      (col) => (
                        <th key={col} className="px-3 py-2 border">
                          {col}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {selectedAnalise.resultadoJson.erros.map((erro, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      {Object.values(erro).map((val, i) => (
                        <td key={i} className="px-3 py-2 border">
                          {String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
