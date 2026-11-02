import { NextResponse } from "next/server";
import {
  authUserFromTelegram,
  telegramConfigured,
  verifyTelegramLogin,
  type TelegramLoginPayload,
} from "@/lib/telegramAuth";

export async function POST(request: Request) {
  if (!telegramConfigured()) {
    return NextResponse.json(
      { error: "telegram_not_configured" },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as TelegramLoginPayload | null;
  if (!body) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN!.trim();
  if (!verifyTelegramLogin(body, token)) {
    return NextResponse.json({ error: "invalid_telegram" }, { status: 401 });
  }

  return NextResponse.json({ user: authUserFromTelegram(body) });
}
