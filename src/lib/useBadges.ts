"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useLive } from "@/lib/live";

export function useUnreadBadges() {
  const [messages, setMessages] = useState(0);
  const [notifications, setNotifications] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const [chats, notes] = await Promise.all([
        api<{ chats: Array<{ unread: number }> }>("/api/chats"),
        api<{ unread: number }>("/api/notifications"),
      ]);
      setMessages(chats.chats.reduce((sum, chat) => sum + (chat.unread ?? 0), 0));
      setNotifications(notes.unread ?? 0);
    } catch {
      /* offline */
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 20_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  useLive(["message", "notification"], (event) => {
    if (event.read) return;
    void refresh();
  });

  return { messages, notifications };
}
