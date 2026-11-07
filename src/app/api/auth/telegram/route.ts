import { NextResponse } from "next/server";
import {
  telegramConfigured,
  verifyTelegramLogin,
  type TelegramLoginPayload,
} from "@/lib/telegramAuth";
import {
  applySessionCookie,
  createSession,
  findOrCreateTelegramUser,
  toAuthUser,
} from "@/lib/server/auth";
import { bumpRateLimit, clientIp, rateLimitResponse } from "@/lib/server/rateLimit";

export async function POST(request: Request) {
  const ip = clientIp(request);
  try {
    bumpRateLimit(`telegram_auth:ip:${ip}`, 20, 15 * 60 * 1000);
  } catch {
    return rateLimitResponse();
  }

  if (!telegramConfigured()) {
    return NextResponse.json(
      { error: "telegram_not_configured" },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json().catch(() => null)) as TelegramLoginPayload | null;
    if (!body) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN!.trim();
    if (!verifyTelegramLogin(body, token)) {
      return NextResponse.json({ error: "invalid_telegram" }, { status: 401 });
    }

    const name = [body.first_name, body.last_name].filter(Boolean).join(" ");
    const row = findOrCreateTelegramUser({
      id: body.id,
      name,
      username: body.username,
      photoUrl: body.photo_url,
    });
    const sessionToken = await createSession(row.id, request);
    const response = NextResponse.json({ user: toAuthUser(row) });
    applySessionCookie(response, sessionToken, request);
    return response;
  } catch (error) {
    console.error("telegram login failed", error);
    return NextResponse.json({ error: "telegram_login_failed" }, { status: 500 });
  }
}
