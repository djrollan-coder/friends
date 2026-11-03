import { api } from "./api";
import type { NotificationItem } from "./dto";

export type { NotificationItem } from "./dto";

let unreadCache = 0;

export function getUnreadCount() {
  return unreadCache;
}

export async function fetchNotifications(): Promise<{
  items: NotificationItem[];
  unread: number;
}> {
  const data = await api<{ notifications: NotificationItem[]; unread: number }>(
    "/api/notifications",
  );
  unreadCache = data.unread;
  return { items: data.notifications, unread: data.unread };
}

export async function refreshUnread(): Promise<number> {
  const { unread } = await fetchNotifications();
  return unread;
}

export async function markRead(id: string): Promise<NotificationItem[]> {
  const data = await api<{ notifications: NotificationItem[]; unread: number }>(
    `/api/notifications/${id}`,
    { method: "POST" },
  );
  unreadCache = data.unread;
  return data.notifications;
}

export async function markAllRead(): Promise<NotificationItem[]> {
  return markRead("all");
}
