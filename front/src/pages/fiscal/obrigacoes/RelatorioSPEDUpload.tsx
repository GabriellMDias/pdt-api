import { useState, useRef, useMemo } from "react";
import Layout from "../../../components/Layout";
import { useAuth } from "../../../hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import PermissionGate from "../../../components/PermissionGate";
import StoreMultiSelect from "../../../components/inputs/StoreMultiSelect";
import DateRange from "../../../components/inputs/DateRange";
import SimpleTable, { type Column } from "../../../components/table/SimpleTable";
import PaginationBar from "../../../components/table/PaginationBar";

interface Arquivo {
  id: number;
  dataImportacao: string;
  mesRef: string;
  arquivoNome: string;
  user: { name: string };
  store: { storeName: string };
  statusAnalise: { descricao: string };
}

type PaginatedResponse<T> =
  | T[]
  | {
      items: T[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };

const API_BASE = "";

function authHeaders(token?: string | null): Record<string, string> {
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function RelatorioSPEDUpload() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [sp, setSearchParams] = useSearchParams();

  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ======= Filtros (sincronizados pelos componentes) =======
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [dataInicial, setDataInicial] = useState<string>("");
  const [dataFinal, setDataFinal] = useState<string>("");

  // ======= Paginação (continua gerenciada aqui / URL) =======
  const [page, setPage] = useState<number>(() => {
    const p = Number(sp.get("page") || 1);
    return Number.isFinite(p) && p > 0 ? p : 1;
  });
  const [pageSize, setPageSize] = useState<number>(() => {
    const ps = Number(sp.get("pageSize") || 20);
    return Number.isFinite(ps) && ps > 0 ? ps : 20;
  });
  const [total, setTotal] = useState<number>(0);

  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);

  async function consultar(nextPage = page, nextPageSize = pageSize) {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      // backend atual espera "lojas"
      if (selectedStores.length) qs.set("lojas", selectedStores.join(","));
      if (dataInicial) qs.set("initialDate", dataInicial);
      if (dataFinal) qs.set("finalDate", dataFinal);
      qs.set("page", String(nextPage));
      qs.set("pageSize", String(nextPageSize));

      const resp = await fetch(`${API_BASE}/api/analysis/sped/arquivo?${qs.toString()}`, {
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
      });

      if (!resp.ok) {
        throw new Error((await resp.text()) || "Erro ao consultar arquivos");
      }

      const payload: PaginatedResponse<Arquivo> = await resp.json();

      if (Array.isArray(payload)) {
        setArquivos(payload);
        setTotal(payload.length);
        setPage(1);
        setPageSize(payload.length || 20);
      } else {
        setArquivos(payload.items);
        setTotal(payload.total);
        setPage(payload.page);
        setPageSize(payload.pageSize);
      }
    } catch (e) {
      console.error("Erro ao consultar arquivos:", e);
    } finally {
      setLoading(false);
    }
  }

  // ⚠️ Sem auto-consulta: só consulta no botão ou ações explícitas (upload/paginação)

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

      const response = await fetch(`${API_BASE}/api/analysis/sped/upload`, {
        method: "POST",
        headers: authHeaders(token),
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erro no upload: ${response.status}`);
      }

      alert("Arquivo enviado com sucesso!");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // após upload, atualiza lista (ação explícita do usuário)
      consultar(1, pageSize);
    } catch (error) {
      console.error("Erro no upload:", error);
      alert("Falha ao enviar o arquivo.");
    } finally {
      setUploading(false);
    }
  };

  function onClickConsultar() {
    // zera paginação e espelha na URL (apenas page/pageSize)
    setPage(1);
    const qs = new URLSearchParams(sp);
    qs.set("page", "1");
    qs.set("pageSize", String(pageSize));
    setSearchParams(qs, { replace: true });
    consultar(1, pageSize);
  }

  // ======= Column definition for SimpleTable =======
  const columns = useMemo<Column<Arquivo>[]>(() => {
    return [
      {
        key: "dataImportacao",
        header: "Data de Importação",
        sortable: true,
        sortAccessor: (a) => Date.parse(a.dataImportacao),
        resizable: true,
        cell: (a) => new Date(a.dataImportacao).toLocaleString("pt-BR"),
      },
      {
        key: "mesRef",
        header: "Mês de Referência",
        sortable: true,
        sortAccessor: (a) => Date.parse(a.mesRef),
        resizable: true,
        cell: (a) =>
          new Date(a.mesRef).toLocaleDateString("pt-BR", {
            month: "2-digit",
            year: "numeric",
          }),
      },
      {
        key: "usuario",
        header: "Usuário",
        sortable: true,
        sortAccessor: (a) => (a.user?.name || "").toLowerCase(),
        resizable: true,
        cell: (a) => a.user?.name,
      },
      {
        key: "loja",
        header: "Loja",
        sortable: true,
        sortAccessor: (a) => (a.store?.storeName || "").toLowerCase(),
        resizable: true,
        cell: (a) => a.store?.storeName,
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        sortAccessor: (a) => (a.statusAnalise?.descricao || "").toLowerCase(),
        resizable: true,
        cell: (a) => a.statusAnalise?.descricao,
      },
    ];
  }, []);

  return (
    <Layout title="Relatório ICMS - SPED">
      <div className="p-6 h-full">
        <div className="max-w-8xl h-full bg-pilar-default-bg2-dark shadow rounded-lg p-4 overflow-y-scroll">
          {/* Upload + Ações */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Arquivos</h2>
            <div className="flex gap-2">
              <PermissionGate required="sped:upload">
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
              </PermissionGate>
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

          {/* Filtros */}
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-pilar-default-bg2-dark p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-1">
                <label className="block text-xs text-neutral-600 dark:text-neutral-300 mb-1">
                  Lojas
                </label>
                <StoreMultiSelect
                  permissionCode="sped:consultarRelatorioSPED"
                  value={selectedStores}
                  onChange={(ids) => setSelectedStores(ids.map(String))}
                  placeholder="Selecione as lojas..."
                  autoSelectIfSingle
                  onlyActive={true}
                  className="w-full"
                  // URL sync pelo próprio componente
                  syncUrl
                  urlParamKey="storeIds"      // escreve 'storeIds' e lê 'lojas' como legado
                  legacyUrlKeys={['lojas']}
                  replaceHistory
                />
              </div>

              <div className="md:col-span-2">
                <DateRange
                  start={dataInicial}
                  end={dataFinal}
                  onChange={({ start, end }) => {
                    setDataInicial(start);
                    setDataFinal(end);
                  }}
                  // sem onEnter -> só consulta ao clicar
                  syncUrl
                  startKey="initialDate"
                  endKey="finalDate"
                  startLegacyKeys={['dataInicial', 'start']}
                  endLegacyKeys={['dataFinal', 'end']}
                  replaceHistory
                  autoOrder={false} // não reordenar durante digitação
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={onClickConsultar}
                  disabled={loading}
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 font-medium text-white bg-pilar-green hover:opacity-95 disabled:opacity-60"
                >
                  {loading && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  )}
                  {loading ? "Consultando..." : "Consultar"}
                </button>
              </div>
            </div>
          </div>

          {/* Tabela + Paginação */}
          <div className="bg-white rounded-lg border border-gray-200 text-black">
            <PaginationBar
              total={total}
              page={page}
              pageSize={pageSize}
              loading={loading}
              className="border-b"
              onPageChange={(next) => {
                const totalPages = Math.max(1, Math.ceil(total / pageSize));
                const nextClamped = Math.max(1, Math.min(next, totalPages));
                if (nextClamped === page) return;
                setPage(nextClamped);

                // paginação espelhada na URL (mantendo demais params)
                const qs = new URLSearchParams(sp);
                qs.set("page", String(nextClamped));
                setSearchParams(qs, { replace: true });

                consultar(nextClamped, pageSize);
              }}
              onPageSizeChange={(newSize) => {
                if (newSize === pageSize) return;
                setPageSize(newSize);
                setPage(1);

                const qs = new URLSearchParams(sp);
                qs.set("pageSize", String(newSize));
                qs.set("page", "1");
                setSearchParams(qs, { replace: true });

                consultar(1, newSize);
              }}
            />

            <SimpleTable<Arquivo>
              columns={columns}
              data={arquivos}
              loading={loading}
              emptyMessage="Nenhum arquivo encontrado."
              getRowKey={(row) => row.id}
              onRowDoubleClick={(row) => navigate(`/relatorio_sped/analises/${row.id}`)}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
