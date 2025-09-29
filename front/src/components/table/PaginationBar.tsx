type Props = {
  total: number;
  page: number;
  pageSize: number;
  loading?: boolean;

  onPageChange: (nextPage: number) => void;
  onPageSizeChange?: (nextSize: number) => void;

  pageSizeOptions?: number[];
  className?: string;
};

export default function PaginationBar({
  total,
  page,
  pageSize,
  loading = false,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className,
}: Props) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / (pageSize || 1)));
  const showingStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingEnd = Math.min(page * pageSize, total);

  return (
    <div className={`flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-2 ${className || ""}`}>
      <span className="text-gray-600 text-sm">
        {loading ? "Carregando..." : `${total} resultados`}
        {total > 0 && (
          <span className="ml-2 text-gray-400">(mostrando {showingStart}–{showingEnd})</span>
        )}
      </span>

      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <>
            <label className="text-sm text-gray-500">Itens por página</label>
            <select
              className="border rounded px-2 py-1 text-sm cursor-pointer"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </>
        )}

        <div className="flex items-center gap-2">
          <button
            className="px-2 py-1 border rounded text-sm disabled:opacity-60 cursor-pointer"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || loading}
          >
            Anterior
          </button>
          <span className="text-sm text-gray-600">
            Página {page} de {totalPages}
          </span>
          <button
            className="px-2 py-1 border rounded text-sm disabled:opacity-60 cursor-pointer"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || loading}
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}
