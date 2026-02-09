import CloseIcon from "@mui/icons-material/Close";
import type { NotificationRecipient } from "../../services/notifications";

interface NotificationDetailsModalProps {
  open: boolean;
  onClose: () => void;
  item: NotificationRecipient | null;
}

export default function NotificationDetailsModal({ open, onClose, item }: NotificationDetailsModalProps) {
  if (!open || !item) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-modal="true"
      role="dialog"
    >
      <div className="w-full max-w-lg rounded-xl bg-pilar-default-bg-light dark:bg-pilar-default-bg-dark border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-white/10">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-black dark:text-white truncate">
              {item.notification.title}
            </h2>
            <p className="text-[11px] text-black/60 dark:text-white/60">
              {new Date(item.notification.createdAt).toLocaleString()}
            </p>
          </div>
          <button
            type="button"
            className="text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
            onClick={onClose}
            aria-label="Fechar"
          >
            <CloseIcon fontSize="small" />
          </button>
        </div>

        <div className="p-4">
          <div className="rounded-lg border border-white/10 bg-black/5 dark:bg-white/5 p-3">
            <p className="text-sm text-black/90 dark:text-white/90 whitespace-pre-line">
              {item.notification.message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
