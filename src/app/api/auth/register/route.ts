import { NextResponse } from "next/server";
import { createSession } from "@/lib/server/auth";
import { registerAccount } from "@/lib/server/accounts";
import { bumpRateLimit, clientIp, rateLimitResponse } from "@/lib/server/rateLimit";
import { parseBody, registerBodySchema } from "@/lib/server/validation";

export async function POST(request: Request) {
  try {
    bumpRateLimit(`register:ip:${clientIp(request)}`, 10, 60 * 60 * 1000);
  } catch {
    return rateLimitResponse();
  }

  const raw = await request.json().catch(() => null);
  if (!raw) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  try {
    const body = parseBody(registerBodySchema, raw);
    const { user } = registerAccount(body);
    await createSession(user.id, request);
    return NextResponse.json({ user });
  } catch (error) {
    const code = error instanceof Error ? error.message : "register_failed";
    const status =
      code === "exists" ? 409 : code === "registration_closed" ? 403 : 400;
    return NextResponse.json({ error: code }, { status });
  }
}
