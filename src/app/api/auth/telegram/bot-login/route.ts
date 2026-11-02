import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { telegramDeepLoginLink } from "@/lib/telegramBotLogin";
import { telegramBotUsername, telegramConfigured } from "@/lib/telegramAuth";

export async function GET() {
  if (!telegramConfigured()) {
    return NextResponse.json({ error: "telegram_not_configured" }, { status: 503 });
  }
  const deepLink = telegramDeepLoginLink();
  const botUsername = telegramBotUsername();
  if (!deepLink || !botUsername) {
    return NextResponse.json({ error: "telegram_not_configured" }, { status: 503 });
  }

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
