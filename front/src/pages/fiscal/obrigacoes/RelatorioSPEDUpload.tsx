import { useState, useEffect, useRef } from "react";
import Layout from "../../../components/Layout";
import { useAuth } from "../../../hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface Arquivo {
  id: number;
  dataImportacao: string;
  mesRef: string;
  arquivoNome: string;
  user: {
    name: string;
  };
  store: {
    storeName: string;
  };
  statusAnalise: {
    descricao: string;
  };
}

export default function RelatorioSPEDUpload() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null); // 🔑 ref para o input

  const fetchArquivos = async () => {
    try {
      if (!token) return;

      const response = await fetch("/api/sped/arquivo", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Erro: ${response.status}`);
      }

      const data: Arquivo[] = await response.json();
      setArquivos(data);
    } catch (error) {
      console.error("Erro ao buscar arquivos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArquivos();
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !token) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/sped/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erro no upload: ${response.status}`);
      }

      alert("Arquivo enviado com sucesso!");
      setFile(null);

      // resetar o input para permitir novo upload
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Atualiza lista após upload
      fetchArquivos();
    } catch (error) {
      console.error("Erro no upload:", error);
      alert("Falha ao enviar o arquivo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Layout title="Relatório ICMS">
      <div className="p-6 h-full">
        <div className="max-w-8xl h-full bg-pilar-default-bg2-dark shadow rounded-lg p-4 overflow-y-scroll">
          {/* Upload Section */}
          <div className="flex justify-between items-center mb-4 ">
            <h2 className="text-xl font-semibold">Arquivos</h2>
            <div className="flex gap-2">
              <label className="flex items-center px-4 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700">
                Enviar Arquivo
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              {file && (
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {uploading ? "Enviando..." : "Upload"}
                </button>
              )}
            </div>
          </div>

          {file && (
            <p className="mb-4 text-sm text-gray-600">
              Arquivo selecionado: <strong>{file.name}</strong>
            </p>
          )}

          {/* Filter and Table */}
          <div className="bg-white rounded-lg border border-gray-200 text-black">
            <div className="flex justify-between items-center p-2 border-b">
              <button className="px-4 py-2 border rounded text-sm hover:bg-gray-100">
                Filtrar
              </button>
              <span className="text-gray-500 text-sm">
                {arquivos.length} resultados
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="px-4 py-2">Data de Importação</th>
                    <th className="px-4 py-2">Mês de Referência</th>
                    <th className="px-4 py-2">Usuário</th>
                    <th className="px-4 py-2">Loja</th>
                    <th className="px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-4 text-center">
                        Carregando...
                      </td>
                    </tr>
                  ) : arquivos.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-4 text-center">
                        Nenhum arquivo encontrado.
                      </td>
                    </tr>
                  ) : (
                    arquivos.map((arquivo) => (
                      <tr
                        key={arquivo.id}
                        className="border-b hover:bg-gray-50 cursor-pointer"
                        onDoubleClick={() => navigate(`/relatorio_sped/analises/${arquivo.id}`)}
                      >
                        <td className="px-4 py-2">
                          {new Date(arquivo.dataImportacao).toLocaleString(
                            "pt-BR"
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {new Date(arquivo.mesRef).toLocaleDateString(
                            "pt-BR",
                            { month: "2-digit", year: "numeric" }
                          )}
                        </td>
                        <td className="px-4 py-2">{arquivo.user?.name}</td>
                        <td className="px-4 py-2">{arquivo.store?.storeName}</td>
                        <td className="px-4 py-2">
                          {arquivo.statusAnalise?.descricao}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
