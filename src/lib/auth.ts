export type AuthUser = {
  id: string;
  name: string;
  username?: string;
  avatar: string;
  /** Telegram (or other) profile photo URL when available */
  photoUrl?: string;
  method: "telegram" | "qr" | "email";
  email?: string;
  isAdmin?: boolean;
};

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
