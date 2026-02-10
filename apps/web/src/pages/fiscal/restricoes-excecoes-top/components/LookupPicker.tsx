import { useEffect, useMemo, useState } from "react";
import AddIcon from "@mui/icons-material/Add";

import DefaultInput from "../../../../components/inputs/DefaultInput";
import TableCard from "../../../../components/table/TableCard";
import type { Column } from "../../../../components/table/SimpleTable";
import { IconButton } from "../../../../components/crud/primitives";

type Meta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type Paginated<T> = {
  data: T[];
  meta: Meta;
};

export type LookupItem = {
  id: number;
  label: string;
};

type Props<T> = {
  title: string;
  selectedIds: Set<number>;
  disabled?: boolean;
  placeholder?: string;

  fetchPage: (q: string, page: number, limit: number) => Promise<Paginated<T>>;
  mapRow: (row: T) => LookupItem;
  onAdd: (item: LookupItem) => void;
};

export default function LookupPicker<T>({
  title,
  selectedIds,
  disabled = false,
  placeholder = "Buscar por código ou descrição...",
  fetchPage,
  mapRow,
  onAdd,
}: Props<T>) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [q]);

  useEffect(() => {
    let active = true;
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchPage(q, page, limit);
        if (!active) return;
        setRows(res.data);
        setTotal(res.meta.total);
      } catch (e) {
        if (!active) return;
        setRows([]);
        setTotal(0);
        setError((e as Error)?.message || "Falha ao carregar dados");
      } finally {
        if (active) setLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [fetchPage, q, page, limit]);

  const columns = useMemo<Column<T>[]>(() => {
    return [
      {
        key: "id",
        header: "Código",
        cell: (r) => mapRow(r).id,
        width: 120,
      },
      {
        key: "label",
        header: "Descrição",
        cell: (r) => mapRow(r).label,
      },
      {
        key: "add",
        header: "",
        cell: (r) => {
          const item = mapRow(r);
          const already = selectedIds.has(item.id);
          return (
            <div className="flex justify-end">
              <IconButton
                title={already ? "Já incluído" : "Incluir"}
                variant={already ? "default" : "green"}
                disabled={disabled || already}
                onClick={() => onAdd(item)}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </div>
          );
        },
        width: 64,
        thClassName: "w-[64px]",
        tdClassName: "w-[64px]",
      },
    ];
  }, [disabled, mapRow, onAdd, selectedIds]);

return (
  <div className="space-y-2 flex flex-col min-h-0">
    <div className="flex flex-col gap-2 shrink-0">
      <div className="text-sm font-semibold text-neutral-700 dark:text-neutral-100">{title}</div>
      <DefaultInput
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className="w-full"
      />
    </div>

    {/* scroll só na tabela/paginação */}
    <div className="min-h-0 max-h-[60vh] overflow-y-auto">
      <TableCard<T>
        data={rows}
        columns={columns}
        total={total}
        page={page}
        pageSize={limit}
        loading={loading}
        error={error}
        onPageChange={(next) => setPage(Math.max(1, next))}
        onPageSizeChange={(next) => {
          setLimit(next);
          setPage(1);
        }}
        className="border border-gray-200 dark:border-neutral-700 dark:bg-neutral-900/35 dark:text-neutral-100"
        tableClassName="w-full text-sm text-left text-neutral-800 dark:text-neutral-100"
        getRowKey={(row, idx) => {
          const item = mapRow(row);
          return item?.id ?? idx;
        }}
        stickyHeader
      />
    </div>
  </div>
);

}
