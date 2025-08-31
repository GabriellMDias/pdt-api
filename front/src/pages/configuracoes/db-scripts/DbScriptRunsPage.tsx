// src/pages/configuracoes/db-scripts/DbScriptRunsPage.tsx
import { useEffect, useMemo, useState } from "react";
import Layout from "../../../components/Layout";
import PermissionGate from "../../../components/PermissionGate";
import { useParams } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { dbScriptsApi } from "./api";
import type { DbScriptRun } from "./types";
import SimpleTable, { type Column } from "../../../components/table/SimpleTable";
import PaginationBar from "../../../components/table/PaginationBar";

function fmtDate(s?: string | null) {
  if (!s) return "";
  try { return new Date(s).toLocaleString(); } catch { return s ?? ""; }
}

export default function DbScriptRunsPage() {
  const { id } = useParams<{ id: string }>();
  const scriptId = Number(id);
  const { token, userId } = useAuth();
  const isAdmin = userId === 0;

  const [data, setData] = useState<DbScriptRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination when backend provides it; fallback to no pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState<number | null>(null);

  const columns: Column<DbScriptRun>[] = useMemo(() => [
    { key: "id", header: "ID", width: "80px" },
    { key: "startedAt", header: "Início", width: "200px", render: (r) => fmtDate(r.startedAt) },
    { key: "finishedAt", header: "Fim", width: "200px", render: (r) => fmtDate(r.finishedAt) },
    { key: "status", header: "Status", width: "120px" },
    { key: "rowsAffected", header: "Linhas", width: "100px" },
    { key: "durationMs", header: "Duração (ms)", width: "140px" },
    { key: "triggeredBy", header: "Origem", width: "140px" },
    { key: "error", header: "Erro/Msg", render: (r) => r.error ?? "" },
  ], []);

  useEffect(() => {
    let cancel = false;
    async function load() {
      try {
        setLoading(true);
        const resp = await dbScriptsApi.runs(scriptId, token, page, pageSize);
        if (cancel) return;
        if (Array.isArray(resp)) {
          setData(resp);
          setTotal(resp.length);
        } else {
          setData(resp.items);
          setTotal(resp.total);
        }
      } catch (e: any) {
        setError(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => { cancel = true };
  }, [scriptId, token, page, pageSize]);

  const Table = (
    <div className="flex flex-col gap-2">
      <SimpleTable rows={data} columns={columns} loading={loading} emptyMessage={error ?? "Sem dados"} />
      {typeof total === "number" && (
        <PaginationBar
          total={total}
          page={page}
          pageSize={pageSize}
          onChangePage={setPage}
          onChangePageSize={setPageSize}
        />
      )}
    </div>
  );

  return (
    <Layout title={`DB Script #${scriptId} • Execuções`}>
      {isAdmin ? (
        Table
      ) : (
        <PermissionGate required="dbScripts:consultar">{Table}</PermissionGate>
      )}
    </Layout>
  );
}
