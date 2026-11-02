"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/AuthProvider";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { findAccount, registerAccount } from "@/lib/accounts";
import { consumeInvite, validateInvite } from "@/lib/circleStore";
import { useT } from "@/lib/i18n/I18nProvider";
import { openTelegramQrLogin } from "@/lib/telegramOAuth";
import "@/app/login/login.css";

type QrPayload = {
  token: string;
  qrDataUrl: string;
  confirmUrl: string;
};

type Tab = "email" | "telegram" | "qr";

type TgConfig = {
  configured: boolean;
  botUsername: string | null;
  botId: string | null;
};

export function LoginScreen() {
  const { login } = useAuth();
  const t = useT();
  const [tab, setTab] = useState<Tab>("email");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [qr, setQr] = useState<QrPayload | null>(null);
  const [qrStatus, setQrStatus] = useState<"loading" | "pending" | "confirmed" | "expired" | "error">("loading");
  const [tgBusy, setTgBusy] = useState(false);
  const [tgConfig, setTgConfig] = useState<TgConfig | null>(null);
  const [tgError, setTgError] = useState("");
  const [tgWaitingQr, setTgWaitingQr] = useState(false);
  const [name, setName] = useState("");
  const [invite, setInvite] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/telegram/config");
        const data = (await res.json()) as TgConfig;
        if (!cancelled) setTgConfig(data);
      } catch {
        if (!cancelled) {
          setTgConfig({ configured: false, botUsername: null, botId: null });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // After QR auth in popup, session lands in this tab via storage + focus.
  useEffect(() => {
    if (!tgWaitingQr) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === "friends.auth" && e.newValue) {
        window.location.assign("/");
      }
    };
    const onFocus = () => {
      try {
        if (localStorage.getItem("friends.auth")) {
          window.location.assign("/");
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(onFocus, 1500);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
    };
  }, [tgWaitingQr]);

  const startQr = useCallback(async () => {
    setQrStatus("loading");
    setQr(null);
    try {
      const res = await fetch("/api/auth/qr", { method: "POST" });
      if (!res.ok) throw new Error("qr_failed");
      const data = (await res.json()) as QrPayload;
      setQr(data);
      setQrStatus("pending");
    } catch {
      setQrStatus("error");
    }
  }, []);

  useEffect(() => {
    if (tab === "qr") {
      void startQr();
    }
  }, [tab, startQr]);

  useEffect(() => {
    if (tab !== "qr" || !qr?.token || qrStatus !== "pending") return;

    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/auth/qr/${qr.token}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "confirmed" && data.user) {
          setQrStatus("confirmed");
          login({
            id: data.user.id,
            name: data.user.name,
            username: data.user.username,
            avatar: data.user.avatar,
            method: "qr",
          });
        } else if (data.status === "expired") {
          setQrStatus("expired");
        }
      } catch {
        /* ignore transient errors */
      }
    }, 1500);

    return () => clearInterval(timer);
  }, [tab, qr, qrStatus, login]);

  async function loginTelegramDemo() {
    setTgBusy(true);
    setTgError("");
    await new Promise((r) => setTimeout(r, 400));
    login({
      id: "tg-42",
      name: "Роман Моторный",
      username: "roman",
      avatar: "РМ",
      method: "telegram",
    });
    setTgBusy(false);
  }

  function startTelegramQr() {
    setTgError("");
    if (!tgConfig?.botId) {
      setTgError(t("login.telegramNotConfigured"));
      return;
    }
    const popup = openTelegramQrLogin(tgConfig.botId);
    if (!popup) {
      // Popup blocked — full-page redirect with QR.
      window.location.href = `https://oauth.telegram.org/auth?bot_id=${encodeURIComponent(tgConfig.botId)}&origin=${encodeURIComponent(window.location.origin)}&request_access=write&return_to=${encodeURIComponent(`${window.location.origin}/login/telegram`)}`;
      return;
    }
    setTgBusy(true);
    setTgWaitingQr(true);
  }

  async function loginEmail(e: FormEvent) {
    e.preventDefault();
    setEmailError("");
    setEmailBusy(true);
    try {
      if (mode === "register") {
        const inviteCheck = validateInvite(invite);
        if (!inviteCheck.ok) {
          if (inviteCheck.error === "empty") setEmailError(t("login.inviteNeeded"));
          else if (inviteCheck.error === "exhausted") setEmailError(t("login.inviteExhausted"));
          else setEmailError(t("login.inviteInvalid"));
          return;
        }
        const result = registerAccount({ name, email, password });
        if ("error" in result) {
          if (result.error === "invalid_email") setEmailError(t("login.invalidEmail"));
          else if (result.error === "weak_password") setEmailError(t("login.weakPassword"));
          else if (result.error === "weak_name") setEmailError(t("login.weakName"));
          else if (result.error === "exists") setEmailError(t("login.exists"));
          else setEmailError(t("login.registerFail"));
          return;
        }
        consumeInvite(invite);
        login({
          id: result.id,
          name: result.name,
          email: result.email,
          avatar: result.avatar,
          method: "email",
        });
        return;
      }

      const local = findAccount(email, password);
      if (local) {
        login({
          id: local.id,
          name: local.name,
          email: local.email,
          avatar: local.avatar,
          method: "email",
        });
        return;
      }

      const res = await fetch("/api/auth/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "invalid_email") setEmailError(t("login.invalidEmail"));
        else if (data.error === "weak_password") setEmailError(t("login.weakPassword"));
        else setEmailError(t("login.loginFail"));
        return;
      }
      login(data.user);
    } catch {
      setEmailError(t("login.network"));
    } finally {
      setEmailBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-lang">
          <LanguageSwitch compact />
        </div>
        <div className="auth-brand">
          <span className="vk-logo-mark">F</span>
          <div>
            <div className="auth-title">Friends</div>
            <div className="auth-sub">{t("login.subtitle")}</div>
          </div>
        </div>

        <div className="auth-tabs auth-tabs-3" role="tablist">
          <button
            type="button"
            className={tab === "email" ? "is-active" : undefined}
            onClick={() => setTab("email")}
          >
            {t("login.emailTab")}
          </button>
          <button
            type="button"
            className={tab === "telegram" ? "is-active" : undefined}
            onClick={() => setTab("telegram")}
          >
            Telegram
          </button>
          <button
            type="button"
            className={tab === "qr" ? "is-active" : undefined}
            onClick={() => setTab("qr")}
          >
            QR
          </button>
        </div>

        {tab === "email" ? (
          <form className="auth-panel" onSubmit={loginEmail}>
            <p className="auth-text">
              {mode === "register" ? t("login.registerHint") : t("login.loginHint")}
            </p>
            {mode === "register" ? (
              <>
                <label className="auth-field">
                  <span>{t("login.inviteCode")}</span>
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="BLIZKIE"
                    value={invite}
                    onChange={(e) => setInvite(e.target.value)}
                    required
                  />
                </label>
                <label className="auth-field">
                  <span>{t("login.nameLabel")}</span>
                  <input
                    type="text"
                    autoComplete="name"
                    placeholder="Роман Моторный"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </label>
              </>
            ) : null}
            <label className="auth-field">
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                placeholder="name@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="auth-field">
              <span>{t("login.password")}</span>
              <input
                type="password"
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={4}
              />
            </label>
            {emailError ? <div className="auth-error">{emailError}</div> : null}
            <button type="submit" className="auth-primary-btn" disabled={emailBusy}>
              {emailBusy
                ? mode === "register"
                  ? t("login.creating")
                  : t("login.signingIn")
                : mode === "register"
                  ? t("login.register")
                  : t("login.signIn")}
            </button>
            <button
              type="button"
              className="auth-link-btn"
              style={{ marginTop: 12 }}
              onClick={() => {
                setMode((m) => (m === "login" ? "register" : "login"));
                setEmailError("");
              }}
            >
              {mode === "login" ? t("login.noAccount") : t("login.hasAccount")}
            </button>
          </form>
        ) : null}

        {tab === "telegram" ? (
          <div className="auth-panel">
            <p className="auth-text">
              {tgConfig?.configured
                ? t("login.telegramQrHint")
                : t("login.telegramHint")}
            </p>
            {tgConfig?.configured && tgConfig.botId ? (
              <>
                <button
                  type="button"
                  className="auth-telegram-btn"
                  onClick={startTelegramQr}
                  disabled={tgBusy}
                >
                  <span className="auth-tg-icon" aria-hidden>
                    ▣
                  </span>
                  {tgWaitingQr
                    ? t("login.telegramQrWaiting")
                    : t("login.telegramQrBtn")}
                </button>
                <div className="auth-muted">{t("login.telegramQrSteps")}</div>
              </>
            ) : (
              <button
                type="button"
                className="auth-telegram-btn"
                onClick={loginTelegramDemo}
                disabled={tgBusy}
              >
                <span className="auth-tg-icon" aria-hidden>
                  ▶
                </span>
                {tgBusy ? t("login.signingIn") : t("login.telegramBtn")}
              </button>
            )}
            {tgError ? <div className="auth-error">{tgError}</div> : null}
            {!tgConfig?.configured ? (
              <div className="auth-muted">{t("login.telegramSetup")}</div>
            ) : null}
          </div>
        ) : null}

        {tab === "qr" ? (
          <div className="auth-panel">
            <p className="auth-text">{t("login.qrHint")}</p>

            <div className="auth-qr-box">
              {qrStatus === "loading" && <div className="auth-muted">{t("login.qrLoading")}</div>}
              {qrStatus === "error" && (
                <div className="auth-muted">
                  {t("login.qrFail")}{" "}
                  <button type="button" className="auth-link-btn" onClick={startQr}>
                    {t("login.qrRetry")}
                  </button>
                </div>
              )}
              {qrStatus === "expired" && (
                <div className="auth-muted">
                  {t("login.qrExpired")}{" "}
                  <button type="button" className="auth-link-btn" onClick={startQr}>
                    {t("login.qrRefresh")}
                  </button>
                </div>
              )}
              {(qrStatus === "pending" || qrStatus === "confirmed") && qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr.qrDataUrl} alt={t("login.qrAlt")} className="auth-qr-img" />
              ) : null}
            </div>

            <div className="auth-muted" style={{ textAlign: "center" }}>
              {qrStatus === "pending" && t("login.qrPending")}
              {qrStatus === "confirmed" && t("login.qrConfirmed")}
            </div>

            {qr && qrStatus === "pending" ? (
              <a className="auth-secondary-btn" href={qr.confirmUrl} target="_blank" rel="noreferrer">
                {t("login.qrOpenConfirm")}
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
