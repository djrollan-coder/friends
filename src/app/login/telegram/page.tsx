"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import type { AuthUser } from "@/lib/auth";
import type { TelegramLoginPayload } from "@/lib/telegramTypes";
import "@/app/login/login.css";

function readOauthPayload(search: URLSearchParams): TelegramLoginPayload | null {
  const fromSearch = {
    id: search.get("id") ?? "",
    first_name: search.get("first_name") ?? "",
    last_name: search.get("last_name") || undefined,
    username: search.get("username") || undefined,
    photo_url: search.get("photo_url") || undefined,
    auth_date: search.get("auth_date") ?? "",
    hash: search.get("hash") ?? "",
  };
  if (fromSearch.id && fromSearch.first_name && fromSearch.hash) return fromSearch;

  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return null;
  const hp = new URLSearchParams(hash);
  const fromHash = {
    id: hp.get("id") ?? "",
    first_name: hp.get("first_name") ?? "",
    last_name: hp.get("last_name") || undefined,
    username: hp.get("username") || undefined,
    photo_url: hp.get("photo_url") || undefined,
    auth_date: hp.get("auth_date") ?? "",
    hash: hp.get("hash") ?? "",
  };
  if (fromHash.id && fromHash.first_name && fromHash.hash) return fromHash;
  return null;
}

function finishLogin(user: AuthUser, login: (u: AuthUser) => void) {
  login(user);
  if (typeof window !== "undefined" && window.opener && !window.opener.closed) {
    try {
      window.opener.location.href = "/";
    } catch {
      /* ignore */
    }
    window.close();
    return;
  }
  window.location.replace("/");
}

function TelegramCallbackInner() {
  const params = useSearchParams();
  const { login } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    const botToken = params.get("t");
    let cancelled = false;

    (async () => {
      try {
        if (botToken) {
          const res = await fetch("/api/auth/telegram/exchange", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ t: botToken }),
          });
          const data = await res.json();
          if (!res.ok || !data.user) {
            if (!cancelled) setError(data.error ?? "invalid_token");
            return;
          }
          if (!cancelled) finishLogin(data.user as AuthUser, login);
          return;
        }

        const payload = readOauthPayload(params);
        if (!payload) {
          if (!cancelled) setError("missing_params");
          return;
        }

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
        if (!cancelled) finishLogin(data.user as AuthUser, login);
      } catch {
        if (!cancelled) setError("network");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params, login]);

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
