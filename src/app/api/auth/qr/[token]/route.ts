import { NextResponse } from "next/server";
import { confirmQrSession, getQrSession } from "@/lib/qr-sessions";

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

export async function POST(_request: Request, { params }: Params) {
  const { token } = await params;
  const session = confirmQrSession(token);
  if (!session) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  return NextResponse.json({
    token: session.token,
    status: session.status,
    user: session.user,
  });
}
