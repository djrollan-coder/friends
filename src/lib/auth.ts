export type AuthUser = {
  id: string;
  name: string;
  username?: string;
  avatar: string;
  /** Telegram (or other) profile photo URL when available */
  photoUrl?: string;
  method: "telegram" | "qr" | "email";
  email?: string;
};

export const AUTH_STORAGE_KEY = "friends.auth";

export function loadAuth(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function saveAuth(user: AuthUser) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

/** Old mock Telegram login before the real widget was wired. */
export function isDemoTelegramUser(user: AuthUser | null | undefined) {
  return Boolean(
    user &&
      user.method === "telegram" &&
      (user.id === "tg-42" || user.username === "roman"),
  );
}

export function telegramLoginUrl(botId: string, origin: string) {
  const returnTo = `${origin}/login/telegram`;
  const params = new URLSearchParams({
    bot_id: botId,
    origin,
    request_access: "write",
    return_to: returnTo,
  });
  return `https://oauth.telegram.org/auth?${params.toString()}`;
}
