import { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../../../components/Layout";
import ConfirmModal from "../../../components/modals/ConfirmModal";
import NotificationDetailsModal from "../../../components/modals/NotificationDetailsModal";
import { useNotifications } from "../../../hooks/useNotifications";
import type { NotificationRecipient } from "../../../services/notifications";

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function formatDateTime(input: string): string {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  return date.toLocaleString();
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
  const [activeNotification, setActiveNotification] =
    useState<NotificationRecipient | null>(null);
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
      setItems((prev) =>
        prev.map((entry) => (entry.readAt ? entry : { ...entry, readAt })),
      );
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

  const canGoPrev = page === 1;
  const canGoNext = page === totalPages;

  const paginationControls = (
    <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-600 dark:border-white/10 dark:bg-pilar-default-bg-dark/35 dark:text-neutral-300">
      <span>
        Pagina {page} de {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-transparent dark:text-neutral-200 dark:hover:bg-white/10"
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={canGoPrev}
        >
          Anterior
        </button>
        <button
          type="button"
          className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-transparent dark:text-neutral-200 dark:hover:bg-white/10"
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={canGoNext}
        >
          Proxima
        </button>
      </div>
    </div>
  );

  return (
    <Layout title="Notificacoes">
      <div className="space-y-5 p-6">
        <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-pilar-default-bg-dark/35">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center rounded-full border border-neutral-300 bg-neutral-100 px-2 py-0.5 font-medium text-neutral-700 dark:border-white/15 dark:bg-white/10 dark:text-neutral-200">
                Total: {total}
              </span>
              <span className="inline-flex items-center rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 font-medium text-sky-700 dark:border-sky-500/35 dark:bg-sky-500/12 dark:text-sky-200">
                Nao lidas: {unreadCount}
              </span>
              <span className="inline-flex items-center rounded-full border border-neutral-300 bg-neutral-100 px-2 py-0.5 font-medium text-neutral-700 dark:border-white/15 dark:bg-white/10 dark:text-neutral-200">
                Exibindo: {pagedLabel}
              </span>
            </div>

            <button
              type="button"
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-500/35 dark:bg-emerald-500/12 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
            >
              Marcar tudo como lido
            </button>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        )}

        {loading && (
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-600 dark:border-white/10 dark:bg-pilar-default-bg-dark/30 dark:text-neutral-300">
            Carregando notificacoes...
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-500 dark:border-white/10 dark:bg-pilar-default-bg-dark/30 dark:text-neutral-300">
            Nenhuma notificacao encontrada.
          </div>
        )}

        {items.length > 0 && paginationControls}

        <div className="space-y-3">
          {items.map((item) => {
            const unread = !item.readAt;

            return (
              <article
                key={item.id}
                className={`rounded-2xl border p-4 shadow-sm ${
                  unread
                    ? "border-sky-200 bg-sky-50/70 dark:border-sky-500/35 dark:bg-sky-500/12"
                    : "border-neutral-200 bg-white dark:border-white/10 dark:bg-pilar-default-bg-dark/35"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                        {item.notification.title}
                      </p>
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                          unread
                            ? "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/35 dark:bg-sky-500/12 dark:text-sky-200"
                            : "border-neutral-300 bg-neutral-100 text-neutral-600 dark:border-white/15 dark:bg-white/10 dark:text-neutral-300"
                        }`}
                      >
                        {unread ? "Nao lida" : "Lida"}
                      </span>
                    </div>

                    <p className="whitespace-pre-line text-sm text-neutral-600 dark:text-neutral-300">
                      {item.notification.message}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                    <button
                      type="button"
                      className="rounded-md border border-sky-300 bg-sky-50 px-2.5 py-1 text-sky-700 transition-colors hover:bg-sky-100 dark:border-sky-500/35 dark:bg-sky-500/12 dark:text-sky-200 dark:hover:bg-sky-500/20"
                      onClick={() => handleToggleRead(item)}
                    >
                      {item.readAt ? "Marcar como nao lida" : "Marcar como lida"}
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-white/15 dark:bg-transparent dark:text-neutral-200 dark:hover:bg-white/10"
                      onClick={() => setActiveNotification(item)}
                    >
                      Ver detalhes
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-red-300 bg-red-50 px-2.5 py-1 text-red-700 transition-colors hover:bg-red-100 dark:border-red-500/35 dark:bg-red-500/12 dark:text-red-200 dark:hover:bg-red-500/20"
                      onClick={() => setDeleteTargetId(item.notificationId)}
                    >
                      Excluir
                    </button>
                  </div>
                </div>

                <p className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">
                  {formatDateTime(item.notification.createdAt)}
                </p>
              </article>
            );
          })}
        </div>

        {items.length > 0 && paginationControls}
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
