import { NextResponse } from "next/server";
import { confirmQrSession, getQrSession } from "@/lib/qr-sessions";
import { getCurrentUser, toAuthUser } from "@/lib/server/auth";

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;
  const session = getQrSession(token);
  if (!session) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({
    token: session.token,
    status: session.status,
    user: session.user ?? null,
  });
}

/** Called from the already-signed-in phone after scanning the QR code. */
export async function POST(_request: Request, { params }: Params) {
  const { token } = await params;
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const session = confirmQrSession(token, toAuthUser(me));
  if (!session) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  return NextResponse.json({
    token: session.token,
    status: session.status,
    user: session.user,
  });
}
