"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  loadNotifications,
  markAllRead,
  markRead,
  type NotificationItem,
} from "@/lib/notify";
import { useT } from "@/lib/i18n/I18nProvider";

export default function NotificationsPage() {
  const t = useT();
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    setItems(loadNotifications());
  }, []);

  return (
    <div className="vk-card vk-main-pad">
      <div className="messages-head">
        <h1 className="vk-page-title">{t("notifications.title")}</h1>
        <button type="button" onClick={() => setItems(markAllRead())}>
          {t("notifications.readAll")}
        </button>
      </div>

      <div className="vk-list">
        {items.length ? (
          items.map((n) => (
            <Link
              key={n.id}
              href={n.href}
              className={`vk-list-row notify-row${n.read ? "" : " is-unread"}`}
              onClick={() => setItems(markRead(n.id))}
            >
              <div className="notify-type">{n.type}</div>
              <div style={{ minWidth: 0 }}>
                <strong>{n.title}</strong>
                <div style={{ color: "var(--vk-muted)", marginTop: 2 }}>{n.body}</div>
              </div>
              <div className="vk-list-meta">{n.createdAt}</div>
            </Link>
          ))
        ) : (
          <div className="vk-empty">{t("notifications.empty")}</div>
        )}
      </div>
    </div>
  );
}
