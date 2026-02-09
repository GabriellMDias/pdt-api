import { api, authHeaders, API_BASE } from "./api";

export type Notification = {
  id: number;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any> | null;
  createdAt: string;
};

export type NotificationRecipient = {
  id: number;
  notificationId: number;
  userId: number;
  readAt?: string | null;
  notification: Notification;
};

export type NotificationsPage = {
  items: NotificationRecipient[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  unreadCount: number;
};

export async function fetchMyNotifications(
  token?: string | null,
  params?: { page?: number; limit?: number }
) {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));
  const qs = search.toString();

  return api<NotificationsPage>(`${API_BASE}/api/notifications/me${qs ? `?${qs}` : ""}`, {
    headers: authHeaders(token),
  });
}

export async function markNotificationRead(token: string | null | undefined, notificationId: number, read: boolean) {
  return api(`${API_BASE}/api/notifications/${notificationId}/read`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ read }),
  });
}

export async function markAllNotificationsRead(token: string | null | undefined) {
  return api(`${API_BASE}/api/notifications/me/read-all`, {
    method: "PATCH",
    headers: authHeaders(token),
  });
}

export async function deleteNotification(token: string | null | undefined, notificationId: number) {
  return api(`${API_BASE}/api/notifications/${notificationId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}
