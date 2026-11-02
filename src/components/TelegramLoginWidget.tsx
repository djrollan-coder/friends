"use client";

import { useEffect, useRef } from "react";
import type { TelegramLoginPayload } from "@/lib/telegramTypes";

declare global {
  interface Window {
    onFriendsTelegramAuth?: (user: TelegramLoginPayload) => void;
  }
}

type Props = {
  botUsername: string;
  onAuth: (user: TelegramLoginPayload) => void;
  onError?: () => void;
};

export function TelegramLoginWidget({ botUsername, onAuth, onError }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onAuthRef = useRef(onAuth);
  onAuthRef.current = onAuth;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !botUsername) return;

    // Keep callback as fallback if Telegram calls it without redirect.
    window.onFriendsTelegramAuth = (user) => {
      onAuthRef.current(user);
    };

    const authUrl = `${window.location.origin}/login/telegram`;

    host.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "12");
    // Redirect mode is more reliable than onauth popup on desktop.
    script.setAttribute("data-auth-url", authUrl);
    script.setAttribute("data-request-access", "write");
    script.onerror = () => onError?.();
    host.appendChild(script);

    return () => {
      delete window.onFriendsTelegramAuth;
      host.innerHTML = "";
    };
  }, [botUsername, onError]);

  return <div className="auth-tg-widget" ref={hostRef} />;
}
