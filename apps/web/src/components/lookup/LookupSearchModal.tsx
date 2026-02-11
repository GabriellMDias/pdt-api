import CloseIcon from "@mui/icons-material/Close";
import { fieldControlBaseClass } from "../inputs/styles";

export type LookupSearchItem = {
  id: number;
  label: string;
};

type LookupSearchModalProps = {
  open: boolean;
  title: string;
  search: string;
  onSearchChange: (value: string) => void;
  loading?: boolean;
  rows: LookupSearchItem[];
  onSelect: (id: number) => void;
  onClose: () => void;
  emptyMessage?: string;
  searchPlaceholder?: string;
  idHeader?: string;
  labelHeader?: string;
};

export default function LookupSearchModal({
  open,
  title,
  search,
  onSearchChange,
  loading = false,
  rows,
  onSelect,
  onClose,
  emptyMessage = "Nenhum resultado encontrado.",
  searchPlaceholder = "Buscar...",
  idHeader = "ID",
  labelHeader = "Descricao",
}: LookupSearchModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-modal="true"
      role="dialog"
    >
      <div className="w-full max-w-3xl rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-200 p-4 dark:border-neutral-700">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
            {title}
          </h2>
          <button
            type="button"
            className="cursor-pointer text-neutral-500 transition-colors hover:text-neutral-700 dark:text-neutral-300 dark:hover:text-white"
            onClick={onClose}
            aria-label="Fechar"
          >
            <CloseIcon fontSize="small" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <input
            className={fieldControlBaseClass}
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {loading ? (
            <div className="text-sm text-neutral-500 dark:text-neutral-400">
              Carregando...
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
              <table className="min-w-full text-sm text-neutral-700 dark:text-neutral-100">
                <thead className="bg-neutral-100 text-left text-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-300">
                  <tr>
                    <th className="p-3 w-28">{idHeader}</th>
                    <th className="p-3">{labelHeader}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="cursor-pointer border-t border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800/60"
                      onClick={() => onSelect(row.id)}
                    >
                      <td className="p-3 text-neutral-700 dark:text-neutral-100">
                        {row.id}
                      </td>
                      <td className="p-3 text-neutral-700 dark:text-neutral-200">
                        {row.label}
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={2}
                        className="p-4 text-center text-neutral-500 dark:text-neutral-400"
                      >
                        {emptyMessage}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
