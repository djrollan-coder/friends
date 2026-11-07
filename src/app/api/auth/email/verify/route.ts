import { NextResponse } from "next/server";
import { applySessionCookie, createSession } from "@/lib/server/auth";
import { verifyEmailCode, verifyEmailMagic } from "@/lib/server/emailAuth";
import { bumpRateLimit, clientIp, rateLimitResponse } from "@/lib/server/rateLimit";
import { emailVerifyBodySchema, parseBody } from "@/lib/server/validation";

export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  if (!raw) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  try {
    bumpRateLimit(`verify-ip:${clientIp(request)}`, 30, 15 * 60 * 1000);
    const body = parseBody(emailVerifyBodySchema, raw);
    const result = body.token
      ? verifyEmailMagic({ email: body.email, token: body.token })
      : verifyEmailCode({ email: body.email, code: body.code });
    const sessionToken = await createSession(result.row.id, request);
    const response = NextResponse.json({ user: result.user });
    applySessionCookie(response, sessionToken, request);
    return response;
  } catch (error) {
    const code = error instanceof Error ? error.message : "email_verify_failed";
    if (code === "rate_limited") return rateLimitResponse();
    const status =
      code === "banned" || code === "registration_closed" ? 403 : 401;
    return NextResponse.json({ error: code }, { status });
  }
}
