"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import type { TelegramLoginPayload } from "@/lib/telegramTypes";
import "@/app/login/login.css";

function TelegramCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    const payload: TelegramLoginPayload = {
      id: params.get("id") ?? "",
      first_name: params.get("first_name") ?? "",
      last_name: params.get("last_name") || undefined,
      username: params.get("username") || undefined,
      photo_url: params.get("photo_url") || undefined,
      auth_date: params.get("auth_date") ?? "",
      hash: params.get("hash") ?? "",
    };

    if (!payload.id || !payload.first_name || !payload.hash) {
      setError("missing_params");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.user) {
          if (!cancelled) setError(data.error ?? "invalid_telegram");
          return;
        }
        login(data.user);
        router.replace("/");
      } catch {
        if (!cancelled) setError("network");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params, login, router]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="vk-logo-mark">F</span>
          <div>
            <div className="auth-title">Friends</div>
            <div className="auth-sub">
              {error ? "Не удалось войти через Telegram" : "Входим через Telegram…"}
            </div>
          </div>
        </div>
        {error ? (
          <a className="auth-secondary-btn" href="/login">
            Назад ко входу
          </a>
        ) : null}
      </div>
    </div>
  );
}

export default function TelegramCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="auth-page">
          <div className="auth-card">
            <div className="auth-title">Friends</div>
            <div className="auth-sub">Входим через Telegram…</div>
          </div>
        </div>
      }
    >
      <TelegramCallbackInner />
    </Suspense>
  );
}
