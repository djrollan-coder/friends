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

export function openTelegramQrLogin(botId: string) {
  if (typeof window === "undefined" || !botId) return null;
  const url = buildTelegramOAuthUrl({
    botId,
    origin: window.location.origin,
  });
  return window.open(
    url,
    "TelegramLogin",
    "toolbar=0,scrollbars=1,status=0,resizable=1,location=0,menuBar=0,width=560,height=620",
  );
}
