import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { createTelegramLoginSession } from "@/lib/telegramLoginSessions";
import { telegramBotUsername, telegramConfigured } from "@/lib/telegramAuth";

export async function GET(request: Request) {
  if (!telegramConfigured()) {
    return NextResponse.json({ error: "telegram_not_configured" }, { status: 503 });
  }
  const botUsername = telegramBotUsername();
  if (!botUsername) {
    return NextResponse.json({ error: "telegram_not_configured" }, { status: 503 });
  }

  const url = new URL(request.url);
  const wantSession = url.searchParams.get("session") === "1";

  if (wantSession) {
    const session = await createTelegramLoginSession();
    const deepLink = `https://t.me/${botUsername}?start=f_${session.token}`;
    const qrDataUrl = await QRCode.toDataURL(deepLink, {
      margin: 1,
      width: 280,
      color: { dark: "#111111", light: "#ffffff" },
    });
    return NextResponse.json({
      botUsername,
      deepLink,
      qrDataUrl,
      sessionToken: session.token,
    });
  }

  const deepLink = `https://t.me/${botUsername}?start=web_login`;
  const qrDataUrl = await QRCode.toDataURL(deepLink, {
    margin: 1,
    width: 280,
    color: { dark: "#111111", light: "#ffffff" },
  });

  return NextResponse.json({
    botUsername,
    deepLink,
    qrDataUrl,
  });
}
