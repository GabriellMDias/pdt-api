import { useState, useRef, useMemo } from "react";
import Layout from "../../../components/Layout";
import { useAuth } from "../../../hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import PermissionGate from "../../../components/PermissionGate";
import { toast } from "react-toastify";
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

      toast.success("Arquivo enviado com sucesso!");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // após upload, atualiza lista (ação explícita do usuário)
      consultar(1, pageSize);
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error("Falha ao enviar o arquivo.");
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
      <div className="h-full p-4 md:p-6">
        <div className="mx-auto h-full max-w-[1400px] overflow-y-auto rounded-2xl border border-neutral-200 bg-white/95 p-4 text-neutral-800 shadow-sm dark:border-neutral-700 dark:bg-pilar-default-bg2-dark dark:text-neutral-100">
          {/* Upload + Ações */}
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Arquivos</h2>
            <div className="flex flex-wrap items-center gap-2">
              <PermissionGate required="sped:upload">
                <label className="inline-flex cursor-pointer items-center rounded-xl border border-blue-700 bg-blue-600 px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-blue-700">
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
                <>
                  <span className="max-w-xs truncate rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-300">
                    {file.name}
                  </span>
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="inline-flex items-center rounded-xl border border-emerald-700 bg-emerald-600 px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {uploading ? "Enviando..." : "Upload"}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Filtros */}
          <div className="mb-4 rounded-2xl border border-neutral-200 bg-white/90 p-4 dark:border-neutral-700 dark:bg-pilar-default-bg2-dark">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
              <div className="xl:col-span-5">
                <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
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

              <div className="xl:col-span-5">
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

              <div className="flex items-end xl:col-span-2">
                <button
                  onClick={onClickConsultar}
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-pilar-green bg-pilar-green px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-pilar-green/90 disabled:opacity-60"
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
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white/80 text-neutral-800 dark:border-neutral-700 dark:bg-transparent dark:text-neutral-100">
            <PaginationBar
              total={total}
              page={page}
              pageSize={pageSize}
              loading={loading}
              className="border-b border-neutral-200 bg-neutral-50/70 dark:border-neutral-700 dark:bg-neutral-900/20"
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
              tableClassName="min-w-full border-collapse text-neutral-800 dark:text-neutral-100"
              headerWrapperClassName="bg-neutral-50 dark:bg-neutral-900/30"
              headerRowClassName="text-left text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-300"
              headerCellClassName="py-3 border-b border-neutral-200 font-semibold dark:border-neutral-700"
              bodyClassName="text-sm text-neutral-700 dark:text-neutral-100"
              cellBaseClassName="py-2.5 border-b border-neutral-200/80 dark:border-neutral-700"
              rowBaseClassName="cursor-pointer transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700/40"
              getRowKey={(row) => row.id}
              onRowDoubleClick={(row) => navigate(`/relatorio_sped/analises/${row.id}`)}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
