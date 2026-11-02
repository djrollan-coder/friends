export type AuthUser = {
  id: string;
  name: string;
  username?: string;
  avatar: string;
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

export function telegramLoginUrl(botUsername: string, origin: string) {
  const returnTo = encodeURIComponent(`${origin}/login/telegram`);
  return `https://oauth.telegram.org/auth?bot_id=${encodeURIComponent(botUsername)}&origin=${encodeURIComponent(origin)}&request_access=write&return_to=${returnTo}`;
}
