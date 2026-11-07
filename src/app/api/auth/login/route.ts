import { NextResponse } from "next/server";
import { createSession } from "@/lib/server/auth";
import { loginAccount } from "@/lib/server/accounts";
import { bumpRateLimit, clientIp, rateLimitResponse } from "@/lib/server/rateLimit";
import { loginBodySchema, parseBody } from "@/lib/server/validation";

export async function POST(request: Request) {
  try {
    bumpRateLimit(`login:ip:${clientIp(request)}`, 20, 15 * 60 * 1000);
  } catch {
    return rateLimitResponse();
  }

  const raw = await request.json().catch(() => null);
  if (!raw) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  try {
    const body = parseBody(loginBodySchema, raw);
    const { user } = loginAccount(body);
    await createSession(user.id, request);
    return NextResponse.json({ user });
  } catch (error) {
    const code = error instanceof Error ? error.message : "login_failed";
    return NextResponse.json({ error: code }, { status: code === "banned" ? 403 : 401 });
  }
}
