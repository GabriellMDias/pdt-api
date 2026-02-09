import { useCallback, useEffect, useRef, useState } from "react";
import { NotificationsContext } from "./NotificationsContext";
import {
  deleteNotification,
  fetchMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRecipient,
  type NotificationsPage,
} from "../services/notifications";
import { useAuth } from "../hooks/useAuth";
import { API_BASE } from "../services/api";

const LATEST_PAGE_SIZE = 6;

type NotificationsProviderProps = {
  children: React.ReactNode;
};

export function NotificationsProvider({ children }: NotificationsProviderProps) {
  const { token } = useAuth();
  const [items, setItems] = useState<NotificationRecipient[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastEventAt, setLastEventAt] = useState(0);
  const loadingRef = useRef(false);

  const fetchPage = useCallback(
    async (page: number, limit: number): Promise<NotificationsPage> => {
      if (!token) {
        return { items: [], page: 1, pageSize: limit, total: 0, totalPages: 1, unreadCount: 0 };
      }

      try {
        const data = await fetchMyNotifications(token, { page, limit });
        if (page === 1 && limit === LATEST_PAGE_SIZE) {
          setItems(data.items);
        }
        if (typeof data.unreadCount === "number") {
          setUnreadCount(data.unreadCount);
        }
        return data;
      } catch (err: any) {
        setError(String(err?.message ?? err));
        throw err;
      }
    },
    [token]
  );

  const reloadLatest = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!token) {
        setItems([]);
        setUnreadCount(0);
        setError(null);
        setLoading(false);
        return;
      }

      if (loadingRef.current) return;
      loadingRef.current = true;

      if (!opts?.silent) {
        setLoading(true);
      }

      setError(null);
      try {
        const data = await fetchMyNotifications(token, { page: 1, limit: LATEST_PAGE_SIZE });
        setItems(data.items);
        setUnreadCount(data.unreadCount ?? 0);
      } catch (err: any) {
        setError(String(err?.message ?? err));
      } finally {
        loadingRef.current = false;
        if (!opts?.silent) {
          setLoading(false);
        }
      }
    },
    [token]
  );

  useEffect(() => {
    reloadLatest();
  }, [reloadLatest]);

  useEffect(() => {
    if (!token) return;
    const url = `${API_BASE}/api/notifications/stream?token=${encodeURIComponent(token)}`;
    const source = new EventSource(url);
    const handleEvent = () => {
      setLastEventAt(Date.now());
      reloadLatest({ silent: true });
    };

    source.addEventListener("notification.created", handleEvent);
    source.addEventListener("notification.updated", handleEvent);
    source.addEventListener("notification.deleted", handleEvent);

    return () => source.close();
  }, [token, reloadLatest]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        reloadLatest({ silent: true });
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [reloadLatest]);

  const toggleRead = useCallback(
    async (notificationId: number, read: boolean) => {
      if (!token) return;
      try {
        await markNotificationRead(token, notificationId, read);
        await reloadLatest({ silent: true });
      } catch (err: any) {
        setError(String(err?.message ?? err));
      }
    },
    [token, reloadLatest]
  );

  const markAllRead = useCallback(async () => {
    if (!token) return;
    try {
      await markAllNotificationsRead(token);
      await reloadLatest({ silent: true });
    } catch (err: any) {
      setError(String(err?.message ?? err));
    }
  }, [token, reloadLatest]);

  const removeNotification = useCallback(
    async (notificationId: number) => {
      if (!token) return;
      try {
        await deleteNotification(token, notificationId);
        await reloadLatest({ silent: true });
      } catch (err: any) {
        setError(String(err?.message ?? err));
      }
    },
    [token, reloadLatest]
  );

  return (
    <NotificationsContext.Provider
      value={{
        items,
        unreadCount,
        loading,
        error,
        lastEventAt,
        reloadLatest,
        fetchPage,
        toggleRead,
        markAllRead,
        deleteNotification: removeNotification,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}
