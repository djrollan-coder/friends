/** Client-safe helpers for Telegram OAuth (QR login page). */

export function buildTelegramOAuthUrl(opts: {
  botId: string;
  origin: string;
  returnPath?: string;
}) {
  const returnTo = `${opts.origin}${opts.returnPath ?? "/login/telegram"}`;
  const params = new URLSearchParams({
    bot_id: opts.botId,
    origin: opts.origin,
    request_access: "write",
    return_to: returnTo,
  });
  return `https://oauth.telegram.org/auth?${params.toString()}`;
}

/** Same-tab redirect — popup return often never hits our callback. */
export function startTelegramQrLogin(botId: string) {
  if (typeof window === "undefined" || !botId) return;
  window.location.assign(
    buildTelegramOAuthUrl({
      botId,
      origin: window.location.origin,
    }),
  );
}
