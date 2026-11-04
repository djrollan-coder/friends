import { NextResponse } from "next/server";
import {
  claimTelegramLoginSession,
  getTelegramLoginSession,
} from "@/lib/telegramLoginSessions";
import {
  applySessionCookie,
  createSession,
  findOrCreateTelegramUser,
  toAuthUser,
} from "@/lib/server/auth";

type Params = { params: Promise<{ token: string }> };

export async function GET(request: Request, { params }: Params) {
  const { token } = await params;
  try {
    const session = await getTelegramLoginSession(token);
    if (!session) {
      return NextResponse.json({ status: "missing" }, { status: 404 });
    }

    if (session.status !== "confirmed" || !session.user) {
      return NextResponse.json({ status: session.status });
    }

    const claimed = await claimTelegramLoginSession(token);
    const raw = claimed?.user ?? session.user;
    const numericId = raw.id.startsWith("tg-") ? raw.id.slice(3) : raw.id;
    const row = findOrCreateTelegramUser({
      id: numericId,
      name: raw.name,
      username: raw.username,
      photoUrl: raw.photoUrl,
    });
    const sessionToken = await createSession(row.id, request);
    const response = NextResponse.json({
      status: "confirmed",
      user: toAuthUser(row),
    });
    applySessionCookie(response, sessionToken, request);
    return response;
  } catch (error) {
    console.error("telegram bot-session failed", error);
    return NextResponse.json(
      {
        status: "error",
        error: "telegram_session_failed",
        detail: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 },
    );
  }
}
