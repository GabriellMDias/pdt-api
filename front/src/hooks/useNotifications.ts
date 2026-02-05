import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchMyNotifications, markNotificationRead, type NotificationRecipient } from "../services/notifications";

export function useNotifications(token?: string | null) {
  const [items, setItems] = useState<NotificationRecipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyNotifications(token);
      setItems(data);
    } catch (err: any) {
      setError(String(err?.message ?? err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const unreadCount = useMemo(() => items.filter((item) => !item.readAt).length, [items]);

  const toggleRead = useCallback(
    async (notificationId: number, read: boolean) => {
      if (!token) return;
      await markNotificationRead(token, notificationId, read);
      setItems((prev) =>
        prev.map((item) =>
          item.notificationId === notificationId ? { ...item, readAt: read ? new Date().toISOString() : null } : item
        )
      );
    },
    [token]
  );

  return { items, unreadCount, loading, error, reload: load, toggleRead } as const;
}
