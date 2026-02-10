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
    <div
      className={`rounded-lg border border-gray-200 bg-white text-black dark:border-neutral-700 dark:bg-neutral-900/35 dark:text-neutral-100 ${className}`}
    >
      <PaginationBar
        total={total}
        page={page}
        pageSize={pageSize}
        loading={!!loading}
        className="border-b border-gray-200 dark:border-neutral-700"
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
      <SimpleTable<T>
        data={data}
        columns={columns}
        loading={!!loading}
        emptyMessage={error ?? emptyMessage}
        tableClassName={tableClassName ?? "w-full text-sm text-left"}
        headerWrapperClassName="bg-neutral-100 text-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-200"
        headerCellClassName="border-b border-gray-200 dark:border-neutral-700"
        stickyHeader={stickyHeader}
        getRowKey={getRowKey}
        onRowDoubleClick={onRowDoubleClick}
        rowClassName={rowClassName}
      />
    </div>
  );
}
