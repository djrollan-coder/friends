import { NextResponse } from "next/server";
import { getQrSession } from "@/lib/qr-sessions";
import { createSession, findUserById, toAuthUser } from "@/lib/server/auth";

type Params = { params: Promise<{ token: string }> };

/** Desktop side: exchanges a confirmed QR session for a real login cookie. */
export async function POST(request: Request, { params }: Params) {
  const { token } = await params;
  const session = getQrSession(token);
  if (!session || session.status !== "confirmed" || !session.user) {
    return NextResponse.json({ error: "not_confirmed" }, { status: 409 });
  }
  const row = findUserById(session.user.id);
  if (!row) {
    return NextResponse.json({ error: "user_missing" }, { status: 404 });
  }
  await createSession(row.id, request);
  // A QR token is single-use.
  session.status = "expired";
  return NextResponse.json({ user: toAuthUser(row) });
}
