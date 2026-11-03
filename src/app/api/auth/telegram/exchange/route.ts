import { NextResponse } from "next/server";
import { verifyBotLoginToken } from "@/lib/telegramBotLogin";
import { telegramConfigured } from "@/lib/telegramAuth";
import {
  applySessionCookie,
  createSession,
  findOrCreateTelegramUser,
  toAuthUser,
} from "@/lib/server/auth";

export async function POST(request: Request) {
  if (!telegramConfigured()) {
    return NextResponse.json({ error: "telegram_not_configured" }, { status: 503 });
  }
  try {
    const body = (await request.json().catch(() => null)) as { t?: string } | null;
    const t = body?.t?.trim() ?? "";
    if (!t) {
      return NextResponse.json({ error: "missing_token" }, { status: 400 });
    }

    const claims = verifyBotLoginToken(t, process.env.TELEGRAM_BOT_TOKEN!.trim());
    if (!claims) {
      return NextResponse.json({ error: "invalid_token" }, { status: 401 });
    }

    const name = [claims.first_name, claims.last_name].filter(Boolean).join(" ");
    const row = findOrCreateTelegramUser({
      id: claims.id,
      name,
      username: claims.username,
      photoUrl: claims.photo_url,
    });
    const sessionToken = await createSession(row.id, request);
    const response = NextResponse.json({ user: toAuthUser(row) });
    applySessionCookie(response, sessionToken, request);
    return response;
  } catch (error) {
    console.error("telegram exchange failed", error);
    return NextResponse.json({ error: "telegram_exchange_failed" }, { status: 500 });
  }
}
