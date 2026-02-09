import { createContext } from "react";
import type { NotificationRecipient, NotificationsPage } from "../services/notifications";

export type NotificationsContextValue = {
  items: NotificationRecipient[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  lastEventAt: number;
  reloadLatest: () => Promise<void>;
  fetchPage: (page: number, limit: number) => Promise<NotificationsPage>;
  toggleRead: (notificationId: number, read: boolean) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (notificationId: number) => Promise<void>;
};

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);
