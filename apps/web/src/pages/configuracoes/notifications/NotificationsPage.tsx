import { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../../../components/Layout";
import NotificationDetailsModal from "../../../components/modals/NotificationDetailsModal";
import ConfirmModal from "../../../components/modals/ConfirmModal";
import { useNotifications } from "../../../hooks/useNotifications";
import type { NotificationRecipient } from "../../../services/notifications";

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export default function NotificationsPage() {
  const {
    fetchPage,
    toggleRead,
    markAllRead,
    deleteNotification,
    unreadCount,
    lastEventAt,
  } = useNotifications();

  const [items, setItems] = useState<NotificationRecipient[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeNotification, setActiveNotification] = useState<NotificationRecipient | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const pageSize = 10;

  const loadPage = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPage(targetPage, pageSize);
        setItems(data.items);
        setPage(data.page);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      } catch (err: unknown) {
        setError(toErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [fetchPage, pageSize],
  );

  useEffect(() => {
    loadPage(page);
  }, [loadPage, page]);

  useEffect(() => {
    if (lastEventAt) {
      loadPage(page);
    }
  }, [lastEventAt, loadPage, page]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pagedLabel = useMemo(() => {
    if (total === 0) return "0";
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return `${start}-${end}`;
  }, [page, pageSize, total]);

  const handleToggleRead = async (item: NotificationRecipient) => {
    try {
      await toggleRead(item.notificationId, !item.readAt);
      setItems((prev) =>
        prev.map((entry) =>
          entry.notificationId === item.notificationId
            ? { ...entry, readAt: entry.readAt ? null : new Date().toISOString() }
            : entry,
        ),
      );
    } catch (err: unknown) {
      setError(toErrorMessage(err));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      const readAt = new Date().toISOString();
      setItems((prev) => prev.map((entry) => (entry.readAt ? entry : { ...entry, readAt })));
    } catch (err: unknown) {
      setError(toErrorMessage(err));
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteTargetId === null) return;

    setDeleting(true);
    try {
      await deleteNotification(deleteTargetId);
      setDeleteTargetId(null);
      await loadPage(page);
    } catch (err: unknown) {
      setError(toErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout title="Notificacoes">
      <div className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/5 dark:bg-white/5 p-3">
          <div className="text-xs text-black/70 dark:text-white/70">
            <span className="font-semibold text-black dark:text-white">Total:</span> {total}
            <span className="mx-2 text-black/40 dark:text-white/30">|</span>
            <span className="font-semibold text-black dark:text-white">Nao lidas:</span> {unreadCount}
            <span className="mx-2 text-black/40 dark:text-white/30">|</span>
            <span className="font-semibold text-black dark:text-white">Exibindo:</span> {pagedLabel}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-blue-400/40 px-3 py-1 text-[11px] text-blue-200 hover:text-blue-100 disabled:text-black/40 dark:disabled:text-white/30"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
            >
              Marcar tudo como lido
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-700 bg-red-900/30 p-3 text-sm text-red-200">
            {error}
          </div>
        )}
        {loading && (
          <div className="rounded-xl border border-neutral-700 bg-neutral-900/30 p-3 text-sm text-neutral-300">
            Carregando notificacoes...
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="rounded-xl border border-neutral-700 bg-neutral-900/30 p-6 text-sm text-neutral-300">
            Nenhuma notificacao encontrada.
          </div>
        )}

        {items.length > 0 && (
          <div className="flex items-center justify-between text-xs text-black/70 dark:text-white/70">
            <span>Pagina {page} de {totalPages}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md border border-white/10 px-2 py-1 hover:border-white/30 disabled:text-black/30 dark:disabled:text-white/30"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
              >
                Anterior
              </button>
              <button
                type="button"
                className="rounded-md border border-white/10 px-2 py-1 hover:border-white/30 disabled:text-black/30 dark:disabled:text-white/30"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
              >
                Proxima
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={[
                "rounded-xl border border-neutral-800 p-4",
                item.readAt ? "bg-neutral-900/30" : "bg-blue-500/10",
              ].join(" ")}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{item.notification.title}</p>
                  <p className="text-xs text-neutral-300 whitespace-pre-line">{item.notification.message}</p>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <button className="text-blue-300 hover:text-blue-200" onClick={() => handleToggleRead(item)}>
                    {item.readAt ? "Marcar como nao lida" : "Marcar como lida"}
                  </button>
                  <button className="text-neutral-300 hover:text-white" onClick={() => setActiveNotification(item)}>
                    Ver detalhes
                  </button>
                  <button className="text-red-300 hover:text-red-200" onClick={() => setDeleteTargetId(item.notificationId)}>
                    Excluir
                  </button>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-neutral-400">
                {new Date(item.notification.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className="flex items-center justify-between text-xs text-black/70 dark:text-white/70">
            <span>Pagina {page} de {totalPages}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md border border-white/10 px-2 py-1 hover:border-white/30 disabled:text-black/30 dark:disabled:text-white/30"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
              >
                Anterior
              </button>
              <button
                type="button"
                className="rounded-md border border-white/10 px-2 py-1 hover:border-white/30 disabled:text-black/30 dark:disabled:text-white/30"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
              >
                Proxima
              </button>
            </div>
          </div>
        )}
      </div>

      <NotificationDetailsModal
        open={Boolean(activeNotification)}
        item={activeNotification}
        onClose={() => setActiveNotification(null)}
      />
      <ConfirmModal
        open={deleteTargetId !== null}
        title="Excluir notificacao"
        message="Deseja excluir esta notificacao?"
        confirmLabel={deleting ? "Excluindo..." : "Excluir"}
        cancelLabel="Cancelar"
        confirmTone="danger"
        loading={deleting}
        onCancel={() => {
          if (deleting) return;
          setDeleteTargetId(null);
        }}
        onConfirm={() => void handleConfirmDelete()}
      />
    </Layout>
  );
}
