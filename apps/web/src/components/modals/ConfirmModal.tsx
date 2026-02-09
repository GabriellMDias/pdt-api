import CloseIcon from "@mui/icons-material/Close";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmTone?: "primary" | "danger";
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  confirmTone = "primary",
  loading = false,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  if (!open) return null;

  const confirmClass =
    confirmTone === "danger"
      ? "bg-red-600 text-white hover:bg-red-500"
      : "bg-pilar-green text-white hover:bg-pilar-green/90";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
      aria-modal="true"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-pilar-default-bg-light dark:bg-pilar-default-bg-dark shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
          <h2 className="text-base font-semibold text-black dark:text-white">{title}</h2>
          <button
            type="button"
            className="text-black/70 transition-colors hover:text-black dark:text-white/70 dark:hover:text-white"
            onClick={onCancel}
            disabled={loading}
            aria-label="Fechar"
          >
            <CloseIcon fontSize="small" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-sm text-black/90 dark:text-white/90 whitespace-pre-line">
            {message}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/10 p-4">
          <button
            type="button"
            className="rounded-lg border border-white/15 px-3 py-2 text-sm text-black hover:bg-black/5 dark:text-white dark:hover:bg-white/10 disabled:opacity-50"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${confirmClass} disabled:opacity-50`}
            onClick={onConfirm}
            disabled={loading}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
