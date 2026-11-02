export const NOTIFICATIONS_KEY = "friends.notifications.v1";

export type NotificationItem = {
  id: string;
  type: "message" | "like" | "comment" | "friend" | "repost" | "group";
  title: string;
  body: string;
  href: string;
  createdAt: string;
  read: boolean;
};

function nowLabel() {
  const d = new Date();
  return `сегодня в ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function loadNotifications(): NotificationItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!raw) return seedNotifications();
    const parsed = JSON.parse(raw) as NotificationItem[];
    return Array.isArray(parsed) ? parsed : seedNotifications();
  } catch {
    return seedNotifications();
  }
}

function seedNotifications(): NotificationItem[] {
  return [
    {
      id: "n1",
      type: "friend",
      title: "Новая заявка в друзья",
      body: "Кира Лебедева хочет добавить вас в друзья",
      href: "/friends?tab=requests",
      createdAt: "сегодня в 18:20",
      read: false,
    },
    {
      id: "n2",
      type: "comment",
      title: "Новый комментарий",
      body: "Анна Ковалёва ответила на вашу запись",
      href: "/feed",
      createdAt: "сегодня в 12:04",
      read: false,
    },
  ];
}

export function saveNotifications(next: NotificationItem[]) {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(next));
}

export function pushNotification(
  partial: Omit<NotificationItem, "id" | "createdAt" | "read"> & {
    createdAt?: string;
    read?: boolean;
  },
) {
  const list = loadNotifications();
  const item: NotificationItem = {
    id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: partial.createdAt ?? nowLabel(),
    read: partial.read ?? false,
    type: partial.type,
    title: partial.title,
    body: partial.body,
    href: partial.href,
  };
  const next = [item, ...list].slice(0, 80);
  saveNotifications(next);
  return item;
}

export function unreadCount(list = loadNotifications()) {
  return list.filter((n) => !n.read).length;
}

export function markAllRead() {
  const next = loadNotifications().map((n) => ({ ...n, read: true }));
  saveNotifications(next);
  return next;
}

export function markRead(id: string) {
  const next = loadNotifications().map((n) =>
    n.id === id ? { ...n, read: true } : n,
  );
  saveNotifications(next);
  return next;
}
