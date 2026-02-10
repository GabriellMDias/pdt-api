import CloseIcon from "@mui/icons-material/Close";
import type { NotificationRecipient } from "../../services/notifications";

interface NotificationDetailsModalProps {
  open: boolean;
  onClose: () => void;
  item: NotificationRecipient | null;
}

function formatDateTime(input: string): string {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  return date.toLocaleString();
}

export default function NotificationDetailsModal({
  open,
  onClose,
  item,
}: NotificationDetailsModalProps) {
  if (!open || !item) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-900/45 px-4 backdrop-blur-sm dark:bg-black/65"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-modal="true"
      role="dialog"
    >
      <div className="w-full max-w-xl rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-pilar-default-bg-dark">
        <div className="flex items-center justify-between gap-3 border-b border-neutral-200 p-4 dark:border-white/10">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-neutral-800 dark:text-neutral-100">
              {item.notification.title}
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {formatDateTime(item.notification.createdAt)}
            </p>
          </div>

          <button
            type="button"
            className="cursor-pointer rounded-md p-1 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-neutral-100"
            onClick={onClose}
            aria-label="Fechar"
          >
            <CloseIcon fontSize="small" />
          </button>
        </div>

        <div className="p-4">
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-white/10 dark:bg-white/5">
            <p className="whitespace-pre-line text-sm text-neutral-700 dark:text-neutral-200">
              {item.notification.message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
