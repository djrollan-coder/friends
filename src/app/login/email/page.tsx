"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import type { AuthUser } from "@/lib/auth";
import "@/app/login/login.css";

function EmailMagicInner() {
  const params = useSearchParams();
  const { login, refresh } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    const email = params.get("email");
    const token = params.get("token");
    let cancelled = false;

    (async () => {
      if (!email || !token) {
        if (!cancelled) setError("missing_params");
        return;
      }
      try {
        const res = await fetch("/api/auth/email/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ email, token }),
        });
        const data = await res.json();
        if (!res.ok || !data.user) {
          if (!cancelled) setError(data.error ?? "invalid_token");
          return;
        }
        if (!cancelled) {
          login(data.user as AuthUser);
          await refresh();
          window.location.replace("/");
        }
      } catch {
        if (!cancelled) setError("network");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params, login, refresh]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="vk-logo-mark">F</span>
          <div>
            <div className="auth-title">Friends</div>
            <div className="auth-sub">
              {error ? "Не удалось войти по ссылке из письма" : "Входим по ссылке из письма…"}
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

export default function EmailMagicPage() {
  return (
    <Suspense
      fallback={
        <div className="auth-page">
          <div className="auth-card">
            <div className="auth-title">Friends</div>
            <div className="auth-sub">Входим по ссылке из письма…</div>
          </div>
        </div>
      }
    >
      <EmailMagicInner />
    </Suspense>
  );
}
