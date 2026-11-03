import { NextResponse } from "next/server";
import { getTelegramLoginSession } from "@/lib/telegramLoginSessions";
import {
  createSession,
  findOrCreateTelegramUser,
  toAuthUser,
} from "@/lib/server/auth";

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;
  const session = await getTelegramLoginSession(token);
  if (!session) {
    return NextResponse.json({ status: "missing" }, { status: 404 });
  }

  if (session.status !== "confirmed" || !session.user) {
    return NextResponse.json({ status: session.status });
  }

  const raw = session.user;
  const numericId = raw.id.startsWith("tg-") ? raw.id.slice(3) : raw.id;
  const row = findOrCreateTelegramUser({
    id: numericId,
    name: raw.name,
    username: raw.username,
    photoUrl: raw.photoUrl,
  });
  await createSession(row.id, _request);
  return NextResponse.json({
    status: session.status,
    user: toAuthUser(row),
  });
}
