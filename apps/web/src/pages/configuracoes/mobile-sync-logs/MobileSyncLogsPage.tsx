import { useCallback, useEffect, useMemo, useState } from "react";
import ManageHistoryIcon from "@mui/icons-material/ManageHistory";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Layout from "../../../components/Layout";
import PermissionGate from "../../../components/PermissionGate";
import DateRange from "../../../components/inputs/DateRange";
import DefaultButton from "../../../components/inputs/DefaultButton";
import DefaultSelect from "../../../components/inputs/DefaultSelect";
import StoreMultiSelect from "../../../components/inputs/StoreMultiSelect";
import Tag from "../../../components/Tag";
import TableCard from "../../../components/table/TableCard";
import { type Column } from "../../../components/table/SimpleTable";
import { useAuth } from "../../../hooks/useAuth";
import { useFilterDraft } from "../../../hooks/useFilterDraft";
import { toast } from "react-toastify";
import TransmissionLogDetailsModal from "./TransmissionLogDetailsModal";
import { mobileSyncLogsApi } from "./api";
import type {
  MobileSyncLogRoutineType,
  MobileTransmissionLog,
  MobileTransmissionLogUserOption,
} from "./types";

const VIEW_PERMISSION = "mobile-sync-logs:consultar";

type Filters = {
  initialDate: string;
  finalDate: string;
  userId: string;
  routineType: "" | MobileSyncLogRoutineType;
  storeIds: Array<number | string>;
};

const INITIAL_FILTERS: Filters = {
  initialDate: "",
  finalDate: "",
  userId: "",
  routineType: "",
  storeIds: [],
};

const ROUTINE_OPTIONS: Array<{ value: "" | MobileSyncLogRoutineType; label: string }> = [
  { value: "", label: "Todas as rotinas" },
  { value: "balanco", label: "Balanco" },
  { value: "consumo", label: "Consumo" },
  { value: "troca", label: "Troca" },
  { value: "ruptura", label: "Ruptura" },
  { value: "producao", label: "Producao" },
  { value: "outro", label: "Outros" },
];

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("pt-BR");
}

function formatDuration(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "-";
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toFixed(2)} s`;
}

function statusClassName(status: MobileTransmissionLog["status"]) {
  switch (status) {
    case "processed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200";
    case "processing":
      return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200";
    case "temporary_error":
      return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200";
    case "permanent_error":
      return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200";
    default:
      return "border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200";
  }
}

function routineClassName(routineType: MobileTransmissionLog["routineType"]) {
  switch (routineType) {
    case "balanco":
      return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200";
    case "consumo":
      return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200";
    case "troca":
      return "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-200";
    case "ruptura":
      return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-500/30 dark:bg-fuchsia-500/10 dark:text-fuchsia-200";
    case "producao":
      return "border-lime-200 bg-lime-50 text-lime-700 dark:border-lime-500/30 dark:bg-lime-500/10 dark:text-lime-200";
    default:
      return "border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200";
  }
}

export default function MobileSyncLogsPage() {
  const { token, userId } = useAuth();
  const isAdmin = userId === 0;
  const { applied, draft, setDraft, setApplied } = useFilterDraft<Filters>(INITIAL_FILTERS);

  const [rows, setRows] = useState<MobileTransmissionLog[]>([]);
  const [users, setUsers] = useState<MobileTransmissionLogUserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [selectedItem, setSelectedItem] = useState<MobileTransmissionLog | null>(null);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const nextUsers = await mobileSyncLogsApi.listUsers(token);
      setUsers(nextUsers);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Nao foi possivel carregar os usuarios para filtro.";
      toast.error(message);
    } finally {
      setLoadingUsers(false);
    }
  }, [token]);

  const loadLogs = useCallback(
    async (nextPage: number, nextPageSize: number, filters: Filters) => {
      setLoading(true);
      setError(null);

      try {
        const response = await mobileSyncLogsApi.list(token, nextPage, nextPageSize, {
          initialDate: filters.initialDate || undefined,
          finalDate: filters.finalDate || undefined,
          userId: filters.userId ? Number(filters.userId) : undefined,
          routineType: filters.routineType || undefined,
          storeIds: filters.storeIds,
        });

        setRows(response.items);
        setTotal(response.total);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Nao foi possivel consultar os logs de transmissao.";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    void loadLogs(page, pageSize, applied);
  }, [applied, loadLogs, page, pageSize]);

  const userOptions = useMemo(
    () => [
      { value: "", label: loadingUsers ? "Carregando usuarios..." : "Todos os usuarios" },
      ...users.map((user) => ({
        value: String(user.id),
        label: user.name?.trim() || user.email?.trim() || `Usuario #${user.id}`,
      })),
    ],
    [loadingUsers, users],
  );

  const columns: Column<MobileTransmissionLog>[] = useMemo(
    () => [
      {
        key: "createdAt",
        header: "Data/Hora",
        width: 180,
        cell: (row) => (
          <div className="leading-tight">
            <div>{formatDateTime(row.createdAt)}</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              {formatDuration(row.durationMs)}
            </div>
          </div>
        ),
      },
      {
        key: "user",
        header: "Usuario",
        width: 220,
        cell: (row) => (
          <div className="leading-tight">
            <div className="font-medium">{row.userName ?? `Usuario #${row.userId}`}</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              {row.userEmail ?? "-"}
            </div>
          </div>
        ),
      },
      {
        key: "routine",
        header: "Tipo",
        width: 120,
        cell: (row) => (
          <Tag className={routineClassName(row.routineType)}>{row.routineLabel}</Tag>
        ),
      },
      {
        key: "store",
        header: "Loja",
        width: 180,
        cell: (row) => row.storeLabel ?? "-",
      },
      {
        key: "status",
        header: "Status",
        width: 150,
        cell: (row) => (
          <Tag className={statusClassName(row.status)}>{row.statusLabel}</Tag>
        ),
      },
      {
        key: "summary",
        header: "Resumo da transmissao",
        width: 380,
        overflow: "wrap",
        cell: (row) => (
          <div className="max-w-[380px] leading-tight">
            <div>{row.summary}</div>
            <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {row.aggregateKey ?? row.eventId}
            </div>
          </div>
        ),
      },
      {
        key: "details",
        header: "Detalhes",
        width: 110,
        align: "center",
        cell: (row) => (
          <button
            type="button"
            className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-100 dark:hover:bg-neutral-800"
            onClick={(event) => {
              event.stopPropagation();
              setSelectedItem(row);
            }}
          >
            <InfoOutlinedIcon sx={{ fontSize: 16 }} />
            Ver
          </button>
        ),
      },
    ],
    [],
  );

  function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    setPage(1);
    setApplied(draft);
  }

  function handleClear() {
    setPage(1);
    setDraft(INITIAL_FILTERS);
    setApplied(INITIAL_FILTERS);
  }

  const pageInner = (
    <div className="h-full p-6">
      <div className="mx-auto flex h-full max-w-[1600px] flex-col gap-4 overflow-y-auto rounded-2xl border border-neutral-200 bg-white/95 p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/35">
        <section className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-neutral-200 bg-white/90 p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/30">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <ManageHistoryIcon fontSize="small" />
              <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100">
                Logs de Transmissao Mobile
              </h2>
            </div>
            <p className="max-w-3xl text-sm text-neutral-500 dark:text-neutral-400">
              Acompanhe eventos enviados pelo app mobile, com filtros por periodo, usuario, rotina e loja.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-right dark:border-neutral-700 dark:bg-neutral-950/30">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Total encontrado
            </div>
            <div className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100">
              {loading ? "..." : total.toLocaleString("pt-BR")}
            </div>
          </div>
        </section>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-neutral-200 bg-white/90 p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/30"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="md:col-span-6">
              <DateRange
                start={draft.initialDate}
                end={draft.finalDate}
                onChange={({ start, end }) =>
                  setDraft({ initialDate: start, finalDate: end })
                }
                autoOrder={false}
              />
            </div>

            <div className="md:col-span-3">
              <DefaultSelect
                label="Usuario"
                value={draft.userId}
                onChangeValue={(value) => setDraft({ userId: String(value ?? "") })}
                options={userOptions}
                paramKey="userId"
                legacyKeys={["usuarioId"]}
                replaceHistory
              />
            </div>

            <div className="md:col-span-3">
              <DefaultSelect
                label="Rotina"
                value={draft.routineType}
                onChangeValue={(value) =>
                  setDraft({ routineType: (String(value || "") as Filters["routineType"]) })
                }
                options={ROUTINE_OPTIONS}
                paramKey="routineType"
                legacyKeys={["tipoRotina"]}
                replaceHistory
              />
            </div>

            <div className="md:col-span-8">
              <StoreMultiSelect
                permissionCode={VIEW_PERMISSION}
                value={draft.storeIds}
                onChange={(ids) => setDraft({ storeIds: ids })}
                placeholder="Filtrar lojas..."
                onlyActive
                urlParamKey="storeIds"
                legacyUrlKeys={["lojas"]}
                replaceHistory
              />
            </div>

            <div className="md:col-span-4 flex items-end justify-end gap-3">
              <DefaultButton
                type="button"
                variant="secondary"
                className="w-full md:w-auto"
                onClick={handleClear}
              >
                Limpar filtros
              </DefaultButton>
              <DefaultButton
                type="submit"
                className="w-full md:w-auto"
                disabled={loading}
              >
                {loading ? "Consultando..." : "Consultar"}
              </DefaultButton>
            </div>
          </div>
        </form>

        <TableCard<MobileTransmissionLog>
          data={rows}
          columns={columns}
          total={total}
          page={page}
          pageSize={pageSize}
          loading={loading}
          error={error}
          emptyMessage="Nenhum log de transmissao encontrado."
          onPageChange={(nextPage) => setPage(nextPage)}
          onPageSizeChange={(nextSize) => {
            setPage(1);
            setPageSize(nextSize);
          }}
          getRowKey={(row) => row.receiptId}
          onRowDoubleClick={(row) => setSelectedItem(row)}
          rowClassName={() => "cursor-pointer"}
          className="mb-4"
          tableClassName="w-full text-sm text-left text-neutral-800 dark:text-neutral-100"
        />
      </div>

      <TransmissionLogDetailsModal
        open={selectedItem != null}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );

  return (
    <Layout title="Logs de Transmissao Mobile">
      {isAdmin ? pageInner : <PermissionGate required={VIEW_PERMISSION}>{pageInner}</PermissionGate>}
    </Layout>
  );
}
