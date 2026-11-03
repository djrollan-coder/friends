import { NextResponse } from "next/server";
import { getTelegramLoginSession } from "@/lib/telegramLoginSessions";

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;
  const session = await getTelegramLoginSession(token);
  if (!session) {
    return NextResponse.json({ status: "missing" }, { status: 404 });
  }
  return NextResponse.json({
    status: session.status,
    user: session.status === "confirmed" ? session.user : undefined,
  });
}
