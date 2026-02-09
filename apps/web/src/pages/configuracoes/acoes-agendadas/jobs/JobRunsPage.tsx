/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import Layout from "../../../../components/Layout";
import PermissionGate from "../../../../components/PermissionGate";
import { useParams } from "react-router-dom";
import { useAuth } from "../../../../hooks/useAuth";
import { jobsApi } from "./api";
import type { JobRun } from "./types";
import TableCard from "../../../../components/table/TableCard";
import { type Column } from "../../../../components/table/SimpleTable";
import DateRange from "../../../../components/inputs/DateRange";
import DefaultButton from "../../../../components/inputs/DefaultButton";
import DefaultSelect from "../../../../components/inputs/DefaultSelect";
import { useFilterDraft } from "../../../../hooks/useFilterDraft";

function fmtDate(s?: string | null) {
  if (!s) return "";
  try { return new Date(s).toLocaleString("pt-BR"); } catch { return s ?? ""; }
}

type StatusOpt = "ALL" | "SUCCESS" | "FAILED" | "RUNNING" | "SKIPPED";

type Filters = {
  initialDate: string;
  finalDate: string;
  status: StatusOpt;
};

export default function JobRunsPage() {
  const { id } = useParams<{ id: string }>();
  const jobId = Number(id);
  const { token, userId } = useAuth();
  const isAdmin = userId === 0;

  const [data, setData] = useState<JobRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState<number | null>(null);

  // filtros (aplicado/rascunho)
  const { applied, draft, setDraft, apply } = useFilterDraft<Filters>({
    initialDate: "",
    finalDate: "",
    status: "ALL",
  });

  async function consultar(nextPage = page, nextPageSize = pageSize) {
    setLoading(true);
    setError(null);
    try {
      const resp = await jobsApi.runs(
        jobId,
        token,
        nextPage,
        nextPageSize,
        applied // { initialDate, finalDate, status }
      );

      if (Array.isArray(resp)) {
        setData(resp);
        setTotal(null); // modo não paginado
        setPage(1);
        setPageSize(resp.length ? Math.min(25, resp.length) : 25);
      } else {
        setData(resp.items);
        setTotal(resp.total); // modo paginado
        setPage(resp.page);
        setPageSize(resp.pageSize);
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    consultar(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, token]);

  const pretty = (v: any) => {
    if (v == null) return "";
    if (typeof v === "string") return v;
    try { return JSON.stringify(v, null, 2); } catch { return String(v); }
  };


  const columns: Column<JobRun>[] = useMemo(
    () => [
      { key: "id", header: "ID", width: 80, field: "id", align: "right" },
      { key: "startedAt", header: "Início", width: 200, cell: (r) => fmtDate(r.startedAt) },
      { key: "finishedAt", header: "Fim", width: 200, cell: (r) => fmtDate(r.finishedAt) },
      { key: "status", header: "Status", width: 120, field: "status" },
      { key: "rowsAffected", header: "Linhas", width: 100, field: "rowsAffected", align: "right" },
      { key: "durationMs", header: "Duração (ms)", width: 140, field: "durationMs", align: "right" },
      { key: "source", header: "Origem", width: 140, field: "source" },
      { key: "error", header: "Erro/Msg", expandOnDblClick: true, fullFormatter: (v) => pretty(v), cell: (r) => r.error ?? "", tdClassName: "cursor-pointer hover:bg-slate-600/8" },
      { key: "log", header: "Log", expandOnDblClick: true, fullFormatter: (v) => pretty(v), cell: (r) => r.log ?? "", tdClassName: "cursor-pointer hover:bg-slate-600/8" },
    ],
    []
  );

  // filtro client-side apenas quando o backend NÃO pagina (total === null)
  const filtered = useMemo(() => {
    if (typeof total === "number") return data;
    const startMs = applied.initialDate ? Date.parse(applied.initialDate) : null;
    const endMs = applied.finalDate ? Date.parse(applied.finalDate) : null;

    return data.filter((r) => {
      const startedMs = r.startedAt ? Date.parse(r.startedAt) : null;
      if (startMs && (startedMs == null || startedMs < startMs)) return false;
      if (endMs && (startedMs == null || startedMs > endMs)) return false;
      if (applied.status !== "ALL" && (r.status || "").toUpperCase() !== applied.status) return false;
      return true;
    });
  }, [data, applied, total]);

  const dataForTable =
    typeof total === "number"
      ? data
      : filtered.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

  const totalForPagination =
    typeof total === "number" ? total : filtered.length;
    
    function handleSubmit(e?: React.FormEvent) {
  e?.preventDefault();
  apply();
  setPage(1);
  consultar(1, pageSize);
}

  const FiltersBar = (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-pilar-default-bg2-dark p-4 mb-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-6">
          <DateRange
            start={draft.initialDate}
            end={draft.finalDate}
            onChange={({ start, end }) => setDraft({ initialDate: start, finalDate: end })}
            autoOrder={false}
          />
        </div>

        <div className="md:col-span-3">
          <DefaultSelect
            label="Status"
            value={draft.status}
            onChange={(e) => setDraft({ status: e.target.value as StatusOpt })}
            options={[
              { value: "ALL", label: "Todos" },
              { value: "SUCCESS", label: "SUCCESS" },
              { value: "FAILED", label: "FAILED" },
              { value: "RUNNING", label: "RUNNING" },
              { value: "SKIPPED", label: "SKIPPED" },
            ]}

            syncUrl
            paramKey="status"
            legacyKeys={["status"]}
            replaceHistory
          />
        </div>

        <div className="md:col-span-3 flex items-end md:justify-end">
          <DefaultButton
            type="submit"
            disabled={loading}
            className="w-full md:w-auto"
          >
            {loading ? "Consultando..." : "Consultar"}
          </DefaultButton>
        </div>
      </div>
    </form>
  );

  const PageInner = (
    <div className="p-6 h-full">
      <div className="max-w-8xl h-full bg-pilar-default-bg2-dark shadow rounded-lg p-4 overflow-y-scroll">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Execuções</h2>
        </div>

        {FiltersBar}

        <TableCard<JobRun>
          data={dataForTable}
          columns={columns}
          total={totalForPagination}
          page={page}
          pageSize={pageSize}
          loading={loading}
          error={error}
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
          className="mb-4"
          tableClassName="w-full text-sm text-left"
        />
      </div>
    </div>
  );

  return (
    <Layout title={`Job #${jobId} • Execuções`}>
      {isAdmin ? (
        PageInner
      ) : (
        <PermissionGate required="code-jobs:consultar">{PageInner}</PermissionGate>
      )}
    </Layout>
  );
}
