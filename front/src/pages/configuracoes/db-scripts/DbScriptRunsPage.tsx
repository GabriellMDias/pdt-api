import { useEffect, useMemo, useState } from "react";
import Layout from "../../../components/Layout";
import PermissionGate from "../../../components/PermissionGate";
import { useParams } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { dbScriptsApi } from "./api";
import type { DbScriptRun } from "./types";
import SimpleTable, { type Column } from "../../../components/table/SimpleTable";
import PaginationBar from "../../../components/table/PaginationBar";
import DateRange from "../../../components/inputs/DateRange";

function fmtDate(s?: string | null) {
  if (!s) return "";
  try { return new Date(s).toLocaleString("pt-BR"); } catch { return s ?? ""; }
}

type StatusOpt = "ALL" | "SUCCESS" | "ERROR" | "RUNNING";

export default function DbScriptRunsPage() {
  const { id } = useParams<{ id: string }>();
  const scriptId = Number(id);
  const { token, userId } = useAuth();
  const isAdmin = userId === 0;

  const [data, setData] = useState<DbScriptRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState<number | null>(null);

  // filtros ATIVOS (aplicados no backend e, se necessário, no client)
  const [dataInicial, setDataInicial] = useState<string>("");
  const [dataFinal, setDataFinal] = useState<string>("");
  const [status, setStatus] = useState<StatusOpt>("ALL");

  // rascunho dos inputs (só vira "ativo" no botão Consultar)
  const [draftDataInicial, setDraftDataInicial] = useState<string>("");
  const [draftDataFinal, setDraftDataFinal] = useState<string>("");
  const [draftStatus, setDraftStatus] = useState<StatusOpt>("ALL");

  async function consultar(nextPage = page, nextPageSize = pageSize) {
    setLoading(true);
    setError(null);
    try {
      const resp = await dbScriptsApi.runs(
        scriptId,
        token,
        nextPage,
        nextPageSize,
        { initialDate: dataInicial, finalDate: dataFinal, status }
      );

      if (Array.isArray(resp)) {
        setData(resp);
        setTotal(resp.length);            // modo não paginado
        setPage(1);
        setPageSize(resp.length ? Math.min(25, resp.length) : 25);
      } else {
        setData(resp.items);
        setTotal(resp.total);             // modo paginado
        setPage(resp.page);
        setPageSize(resp.pageSize);
      }
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    consultar(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptId, token]);

  const columns: Column<DbScriptRun>[] = useMemo(
    () => [
      { key: "id", header: "ID", width: 80, field: "id", align: "right" },
      { key: "startedAt", header: "Início", width: 200, cell: (r) => fmtDate(r.startedAt) },
      { key: "finishedAt", header: "Fim", width: 200, cell: (r) => fmtDate(r.finishedAt) },
      { key: "status", header: "Status", width: 120, field: "status" },
      { key: "rowsAffected", header: "Linhas", width: 100, field: "rowsAffected", align: "right" },
      { key: "durationMs", header: "Duração (ms)", width: 140, field: "durationMs", align: "right" },
      { key: "triggeredBy", header: "Origem", width: 140, field: "triggeredBy" },
      { key: "error", header: "Erro/Msg", cell: (r) => r.error ?? "" },
      { key: "log", header: "Log", cell: (r) => r.log ?? "" },
    ],
    []
  );

  // filtro client-side só se o backend NÃO estiver paginando (total === null)
  const filtered = useMemo(() => {
    if (typeof total === "number") return data; // backend já filtrou
    const startMs = dataInicial ? Date.parse(dataInicial) : null;
    const endMs = dataFinal ? Date.parse(dataFinal) : null;

    return data.filter((r) => {
      const startedMs = r.startedAt ? Date.parse(r.startedAt) : null;
      if (startMs && (startedMs == null || startedMs < startMs)) return false;
      if (endMs && (startedMs == null || startedMs > endMs)) return false;
      if (status !== "ALL" && (r.status || "").toUpperCase() !== status) return false;
      return true;
    });
  }, [data, dataInicial, dataFinal, status, total]);

  const dataForTable =
    typeof total === "number"
      ? data // backend paginado ou filtrado
      : filtered.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

  const totalForPagination =
    typeof total === "number" ? total : filtered.length;

  const Table = (
    <div className="bg-white rounded-lg border border-gray-200 text-black">
      <PaginationBar
        total={totalForPagination}
        page={page}
        pageSize={pageSize}
        loading={loading}
        className="border-b"
        onPageChange={(next) => {
          const totalPages = Math.max(1, Math.ceil(totalForPagination / pageSize));
          const nextClamped = Math.max(1, Math.min(next, totalPages));
          if (nextClamped === page) return;
          setPage(nextClamped);
          if (typeof total === "number") {
            consultar(nextClamped, pageSize);
          }
        }}
        onPageSizeChange={(newSize) => {
          if (newSize === pageSize) return;
          setPageSize(newSize);
          setPage(1);
          if (typeof total === "number") {
            consultar(1, newSize);
          }
        }}
      />

      <SimpleTable<DbScriptRun>
        data={dataForTable}
        columns={columns}
        loading={loading}
        emptyMessage={error ?? "Nenhuma execução encontrada."}
        tableClassName="w-full text-sm text-left"
      />
    </div>
  );

  const PageInner = (
    <div className="p-6 h-full">
      <div className="max-w-8xl h-full bg-pilar-default-bg2-dark shadow rounded-lg p-4 overflow-y-scroll">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Execuções</h2>
        </div>

        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-pilar-default-bg2-dark p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <DateRange
                start={draftDataInicial}
                end={draftDataFinal}
                onChange={({ start, end }) => {
                  setDraftDataInicial(start);
                  setDraftDataFinal(end);
                }}
                autoOrder={false}
              />
            </div>

            <div className="flex flex-col">
              <label className="block text-xs text-neutral-600 dark:text-neutral-300 mb-1">
                Status
              </label>
              <select
                value={draftStatus}
                onChange={(e) => setDraftStatus(e.target.value as StatusOpt)}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm dark:bg-neutral-900 dark:border-neutral-700"
              >
                <option value="ALL">Todos</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="ERROR">ERROR</option>
                <option value="RUNNING">RUNNING</option>
              </select>
            </div>

            <div className="md:col-span-4 flex justify-end">
              <button
                onClick={() => {
                  setDataInicial(draftDataInicial);
                  setDataFinal(draftDataFinal);
                  setStatus(draftStatus);
                  setPage(1);
                  consultar(1, pageSize);
                }}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 font-medium text-white bg-pilar-green hover:opacity-95 disabled:opacity-60"
              >
                {loading && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}
                {loading ? "Consultando..." : "Consultar"}
              </button>
            </div>
          </div>
        </div>

        {Table}
      </div>
    </div>
  );

  return (
    <Layout title={`DB Script #${scriptId} • Execuções`}>
      {isAdmin ? PageInner : <PermissionGate required="dbScripts:consultar">{PageInner}</PermissionGate>}
    </Layout>
  );
}