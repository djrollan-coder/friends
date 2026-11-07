"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/AuthProvider";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { useT } from "@/lib/i18n/I18nProvider";
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

type BotLoginUi = {
  botUsername: string;
  deepLink: string;
  qrDataUrl: string;
  sessionToken: string;
};

const TG_PENDING_KEY = "friends.tg.pendingSession";

function readPendingSession() {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(TG_PENDING_KEY);
  } catch {
    return null;
  }
}

function writePendingSession(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (!token) sessionStorage.removeItem(TG_PENDING_KEY);
    else sessionStorage.setItem(TG_PENDING_KEY, token);
  } catch {
    /* ignore */
  }
}

export function LoginScreen() {
  const { login, refresh } = useAuth();
  const t = useT();
  const [tab, setTab] = useState<Tab>("email");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [qr, setQr] = useState<QrPayload | null>(null);
  const [qrStatus, setQrStatus] = useState<"loading" | "pending" | "confirmed" | "expired" | "error">("loading");
  const [tgBusy, setTgBusy] = useState(false);
  const [tgWaiting, setTgWaiting] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [tgConfig, setTgConfig] = useState<TgConfig | null>(null);
  const [botLogin, setBotLogin] = useState<BotLoginUi | null>(null);
  const [tgError, setTgError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailStep, setEmailStep] = useState<"request" | "code" | "password">("request");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [pollTick, setPollTick] = useState(0);

  const refreshBotLogin = useCallback(async () => {
    const botRes = await fetch("/api/auth/telegram/bot-login?session=1");
    if (!botRes.ok) throw new Error("bot_login_failed");
    return (await botRes.json()) as BotLoginUi;
  }, []);

  const finishTelegramLogin = useCallback(
    async (user: { id: string; name: string; username?: string; avatar: string; photoUrl?: string }) => {
      writePendingSession(null);
      setPendingToken(null);
      setTgWaiting(false);
      setTgBusy(false);
      login({
        id: user.id,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        photoUrl: user.photoUrl,
        method: "telegram",
      });
      // Prefer cookie session from /api/auth/me after Set-Cookie.
      const synced = await refresh();
      if (!synced) {
        login({
          id: user.id,
          name: user.name,
          username: user.username,
          avatar: user.avatar,
          photoUrl: user.photoUrl,
          method: "telegram",
        });
      }
    },
    [login, refresh],
  );

  useEffect(() => {
    const pending = readPendingSession();
    if (pending) {
      setPendingToken(pending);
      setTgWaiting(true);
      setTab("telegram");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/telegram/config");
        const data = (await res.json()) as TgConfig;
        if (!cancelled) setTgConfig(data);
        if (data.configured) {
          const botData = await refreshBotLogin();
          if (!cancelled) setBotLogin(botData);
        }
      } catch {
        if (!cancelled) {
          setTgConfig({ configured: false, botUsername: null, botId: null });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshBotLogin]);

  // Resume polling when returning from Telegram (iOS suspends timers in background).
  useEffect(() => {
    const bump = () => setPollTick((n) => n + 1);
    const onVis = () => {
      if (document.visibilityState === "visible") bump();
    };
    window.addEventListener("focus", bump);
    window.addEventListener("pageshow", bump);
    document.addEventListener("visibilitychange", onVis);
    (window as Window & { __FRIENDS_RESUME_AUTH__?: () => void }).__FRIENDS_RESUME_AUTH__ = bump;
    return () => {
      window.removeEventListener("focus", bump);
      window.removeEventListener("pageshow", bump);
      document.removeEventListener("visibilitychange", onVis);
      delete (window as Window & { __FRIENDS_RESUME_AUTH__?: () => void }).__FRIENDS_RESUME_AUTH__;
    };
  }, []);

  useEffect(() => {
    const token = pendingToken || botLogin?.sessionToken;
    if (!tgWaiting || !token) return;

    let stopped = false;
    const check = async () => {
      try {
        const res = await fetch(`/api/auth/telegram/bot-session/${token}`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!res.ok || stopped) return;
        const data = await res.json();
        if (data.status === "confirmed" && data.user) {
          await finishTelegramLogin(data.user);
        } else if (data.status === "expired") {
          writePendingSession(null);
          setPendingToken(null);
          setTgWaiting(false);
          setTgBusy(false);
          setTgError(t("login.telegramSessionExpired"));
        }
      } catch {
        /* ignore transient errors */
      }
    };

    void check();
    const timer = setInterval(() => void check(), 1200);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [tgWaiting, pendingToken, botLogin, finishTelegramLogin, t, pollTick]);

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
          const claim = await fetch(`/api/auth/qr/${qr.token}/claim`, { method: "POST" });
          const claimed = await claim.json();
          if (!claim.ok || !claimed.user) {
            setQrStatus("error");
            return;
          }
          login({ ...claimed.user, method: "qr" });
        } else if (data.status === "expired") {
          setQrStatus("expired");
        }
      } catch {
        /* ignore transient errors */
      }
    }, 1500);

    return () => clearInterval(timer);
  }, [tab, qr, qrStatus, login]);

  async function openTelegramBot() {
    setTgError("");
    setTgBusy(true);
    try {
      const session = await refreshBotLogin();
      setBotLogin(session);
      writePendingSession(session.sessionToken);
      setPendingToken(session.sessionToken);
      setTgWaiting(true);

      const native = (window as Window & {
        __FRIENDS_NATIVE__?: boolean;
        webkit?: { messageHandlers?: { friends?: { postMessage: (v: unknown) => void } } };
      }).webkit?.messageHandlers?.friends;

      // Native shell: open Telegram app, keep WebView on /login and poll session.
      if ((window as Window & { __FRIENDS_NATIVE__?: boolean }).__FRIENDS_NATIVE__ && native) {
        native.postMessage({ type: "openTelegram", url: session.deepLink });
        return;
      }

      // Browser: open Telegram in a new tab/app, stay on login and poll.
      window.open(session.deepLink, "_blank", "noopener,noreferrer");
    } catch {
      writePendingSession(null);
      setPendingToken(null);
      setTgWaiting(false);
      setTgError(t("login.telegramNotConfigured"));
    } finally {
      setTgBusy(false);
    }
  }

  function mapEmailError(code: string) {
    if (code === "invalid_email") return t("login.invalidEmail");
    if (code === "weak_password") return t("login.weakPassword");
    if (code === "weak_name") return t("login.weakName");
    if (code === "need_name") return t("login.needName");
    if (code === "exists") return t("login.exists");
    if (code === "invalid_credentials") return t("login.loginFail");
    if (code === "invalid_code") return t("login.invalidCode");
    if (code === "code_expired") return t("login.codeExpired");
    if (code === "code_locked") return t("login.codeLocked");
    if (code === "rate_limited") return t("login.rateLimited");
    if (code === "email_not_configured") return t("login.emailNotConfigured");
    if (code === "email_send_failed") return t("login.emailSendFail");
    if (code === "registration_closed") return t("login.registrationClosed");
    if (code === "banned") return t("login.banned");
    return mode === "register" ? t("login.registerFail") : t("login.loginFail");
  }

  async function requestEmailCode() {
    setEmailError("");
    setEmailBusy(true);
    try {
      const res = await fetch("/api/auth/email/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: mode === "register" ? name : undefined,
          mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailError(mapEmailError(data.error ?? "email_start_failed"));
        return;
      }
      setEmailCode("");
      setEmailStep("code");
    } catch {
      setEmailError(t("login.network"));
    } finally {
      setEmailBusy(false);
    }
  }

  async function verifyEmailCode(e: FormEvent) {
    e.preventDefault();
    setEmailError("");
    setEmailBusy(true);
    try {
      const res = await fetch("/api/auth/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, code: emailCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailError(mapEmailError(data.error ?? "invalid_code"));
        return;
      }
      login(data.user);
      await refresh();
    } catch {
      setEmailError(t("login.network"));
    } finally {
      setEmailBusy(false);
    }
  }

  async function loginEmailPassword(e: FormEvent) {
    e.preventDefault();
    setEmailError("");
    setEmailBusy(true);
    try {
      const res = await fetch(
        mode === "register" ? "/api/auth/register" : "/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setEmailError(mapEmailError(data.error ?? "login_failed"));
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
          <form
            className="auth-panel"
            onSubmit={
              emailStep === "code"
                ? verifyEmailCode
                : emailStep === "password"
                  ? loginEmailPassword
                  : (e) => {
                      e.preventDefault();
                      void requestEmailCode();
                    }
            }
          >
            <p className="auth-text">
              {emailStep === "code"
                ? t("login.codeHint")
                : emailStep === "password"
                  ? mode === "register"
                    ? t("login.registerHint")
                    : t("login.loginHint")
                  : t("login.emailCodeHint")}
            </p>
            {emailStep !== "code" && mode === "register" ? (
              <label className="auth-field">
                <span>{t("login.nameLabel")}</span>
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Роман Моторный"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={mode === "register"}
                />
              </label>
            ) : null}
            {emailStep !== "code" ? (
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
            ) : (
              <div className="auth-muted" style={{ marginBottom: 10 }}>
                {email}
              </div>
            )}
            {emailStep === "code" ? (
              <label className="auth-field">
                <span>{t("login.codeLabel")}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  minLength={8}
                  maxLength={6}
                />
              </label>
            ) : null}
            {emailStep === "password" ? (
              <label className="auth-field">
                <span>{t("login.password")}</span>
                <input
                  type="password"
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </label>
            ) : null}
            {emailError ? <div className="auth-error">{emailError}</div> : null}
            <button type="submit" className="auth-primary-btn" disabled={emailBusy}>
              {emailBusy
                ? emailStep === "code" || emailStep === "password"
                  ? t("login.signingIn")
                  : t("login.sendingCode")
                : emailStep === "code"
                  ? t("login.signIn")
                  : emailStep === "password"
                    ? mode === "register"
                      ? t("login.register")
                      : t("login.signIn")
                    : t("login.sendCode")}
            </button>
            {emailStep === "code" ? (
              <button
                type="button"
                className="auth-link-btn"
                style={{ marginTop: 12 }}
                disabled={emailBusy}
                onClick={() => {
                  void requestEmailCode();
                }}
              >
                {t("login.resendCode")}
              </button>
            ) : null}
            <button
              type="button"
              className="auth-link-btn"
              style={{ marginTop: 12 }}
              onClick={() => {
                setEmailError("");
                if (emailStep === "password") setEmailStep("request");
                else if (emailStep === "code") {
                  setEmailStep("request");
                  setEmailCode("");
                } else setEmailStep("password");
              }}
            >
              {emailStep === "password" ? t("login.useEmailCode") : t("login.usePassword")}
            </button>
            {emailStep !== "code" ? (
              <button
                type="button"
                className="auth-link-btn"
                style={{ marginTop: 8 }}
                onClick={() => {
                  setMode((m) => (m === "login" ? "register" : "login"));
                  setEmailError("");
                }}
              >
                {mode === "login" ? t("login.noAccount") : t("login.hasAccount")}
              </button>
            ) : null}
          </form>
        ) : null}

        {tab === "telegram" ? (
          <div className="auth-panel">
            <p className="auth-text">
              {tgConfig?.configured
                ? t("login.telegramBotHint")
                : t("login.telegramHint")}
            </p>
            {tgConfig?.configured && botLogin ? (
              <>
                <div className="auth-qr-box">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={botLogin.qrDataUrl}
                    alt={t("login.telegramBotQrAlt")}
                    className="auth-qr-img"
                  />
                </div>
                <button
                  type="button"
                  className="auth-telegram-btn"
                  onClick={() => void openTelegramBot()}
                  disabled={tgBusy || tgWaiting}
                >
                  <span className="auth-tg-icon" aria-hidden>
                    ▶
                  </span>
                  {tgWaiting
                    ? t("login.telegramQrWaiting")
                    : tgBusy
                      ? t("login.signingIn")
                      : t("login.telegramBotBtn")}
                </button>
                <div className="auth-muted">
                  {tgWaiting ? t("login.telegramBotWaiting") : t("login.telegramBotSteps")}
                </div>
              </>
            ) : tgConfig?.configured ? (
              <div className="auth-muted">{t("login.qrLoading")}</div>
            ) : (
              <div className="auth-muted">{t("login.telegramSetup")}</div>
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
