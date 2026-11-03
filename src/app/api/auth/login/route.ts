import { NextResponse } from "next/server";
import { createSession } from "@/lib/server/auth";
import { loginAccount } from "@/lib/server/accounts";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; password?: string }
    | null;
  if (!body) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  try {
    const { user } = loginAccount(body);
    await createSession(user.id, request);
    return NextResponse.json({ user });
  } catch (error) {
    const code = error instanceof Error ? error.message : "login_failed";
    return NextResponse.json({ error: code }, { status: 401 });
  }
}
