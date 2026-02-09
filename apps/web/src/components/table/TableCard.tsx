import PaginationBar from "./PaginationBar";
import SimpleTable, { type Column } from "./SimpleTable";

type Props<T> = {
  data: T[];
  columns: Column<T>[];
  total: number;
  page: number;
  pageSize: number;
  loading?: boolean;
  error?: string | null;

  onPageChange: (nextPage: number) => void;
  onPageSizeChange?: (next: number) => void;

  emptyMessage?: string;
  tableClassName?: string;
  className?: string;

  // repasses opcionais do SimpleTable (se você usa em outras telas também)
  stickyHeader?: boolean;
  getRowKey?: (row: T, idx: number) => React.Key;
  onRowDoubleClick?: (row: T, idx: number) => void;
  rowClassName?: (row: T, idx: number) => string;
};

export default function TableCard<T>({
  data,
  columns,
  total,
  page,
  pageSize,
  loading,
  error,
  onPageChange,
  onPageSizeChange,
  emptyMessage = "Nenhum registro encontrado.",
  tableClassName,
  className = "",
  stickyHeader,
  getRowKey,
  onRowDoubleClick,
  rowClassName,
}: Props<T>) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 text-black ${className}`}>
      <PaginationBar
        total={total}
        page={page}
        pageSize={pageSize}
        loading={!!loading}
        className="border-b"
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
      <SimpleTable<T>
        data={data}
        columns={columns}
        loading={!!loading}
        emptyMessage={error ?? emptyMessage}
        tableClassName={tableClassName ?? "w-full text-sm text-left"}
        stickyHeader={stickyHeader}
        getRowKey={getRowKey}
        onRowDoubleClick={onRowDoubleClick}
        rowClassName={rowClassName}
      />
    </div>
  );
}
