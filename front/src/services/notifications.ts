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

export async function fetchMyNotifications(token?: string | null) {
  return api<NotificationRecipient[]>(`${API_BASE}/api/notifications/me`, {
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
