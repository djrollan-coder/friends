import { NextResponse } from "next/server";
import {
  authUserFromBotClaims,
  verifyBotLoginToken,
} from "@/lib/telegramBotLogin";
import { telegramConfigured } from "@/lib/telegramAuth";

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

  return NextResponse.json({ user: authUserFromBotClaims(claims) });
}
