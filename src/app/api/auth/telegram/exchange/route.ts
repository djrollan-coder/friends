import { NextResponse } from "next/server";
import { verifyBotLoginToken } from "@/lib/telegramBotLogin";
import { telegramConfigured } from "@/lib/telegramAuth";
import {
  createSession,
  findOrCreateTelegramUser,
  toAuthUser,
} from "@/lib/server/auth";

export async function POST(request: Request) {
  if (!telegramConfigured()) {
    return NextResponse.json({ error: "telegram_not_configured" }, { status: 503 });
  }
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
  await createSession(row.id, request);
  return NextResponse.json({ user: toAuthUser(row) });
}
