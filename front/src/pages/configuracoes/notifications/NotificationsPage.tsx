import Layout from "../../../components/Layout";
import { useAuth } from "../../../hooks/useAuth";
import { useNotifications } from "../../../hooks/useNotifications";

export default function NotificationsPage() {
  const { token } = useAuth();
  const { items, loading, error, toggleRead } = useNotifications(token);

  return (
    <Layout title="Notificações">
      <div className="space-y-4 p-4">
        {error && (
          <div className="rounded-xl border border-red-700 bg-red-900/30 p-3 text-sm text-red-200">
            {error}
          </div>
        )}
        {loading && (
          <div className="rounded-xl border border-neutral-700 bg-neutral-900/30 p-3 text-sm text-neutral-300">
            Carregando notificações...
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="rounded-xl border border-neutral-700 bg-neutral-900/30 p-6 text-sm text-neutral-300">
            Nenhuma notificação encontrada.
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
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {item.notification.title}
                  </p>
                  <p className="text-xs text-neutral-300">
                    {item.notification.message}
                  </p>
                </div>
                <button
                  className="text-xs text-blue-300 hover:text-blue-200"
                  onClick={() => toggleRead(item.notificationId, !item.readAt)}
                >
                  {item.readAt ? "Marcar como não lida" : "Marcar como lida"}
                </button>
              </div>
              <p className="mt-2 text-[11px] text-neutral-400">
                {new Date(item.notification.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
