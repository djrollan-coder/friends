"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/I18nProvider";
import "@/app/login/login.css";

export function QrConfirmScreen({ token }: { token: string }) {
  const t = useT();
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/qr/${token}`, { method: "POST" });
      if (!res.ok) throw new Error("fail");
      setStatus("ok");
    } catch {
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="vk-logo-mark">F</span>
          <div>
            <div className="auth-title">{t("login.confirmTitle")}</div>
            <div className="auth-sub">Friends · QR</div>
          </div>
        </div>

        {status === "ok" ? (
          <p className="auth-text">{t("login.confirmOk")}</p>
        ) : (
          <>
            <p className="auth-text">{t("login.confirmPrompt")}</p>
            <button
              type="button"
              className="auth-telegram-btn"
              onClick={confirm}
              disabled={busy}
            >
              {busy ? t("login.confirmBusy") : t("login.confirmBtn")}
            </button>
            {status === "error" ? (
              <p className="auth-muted">{t("login.confirmInvalid")}</p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
