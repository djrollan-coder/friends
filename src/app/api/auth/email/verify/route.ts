import { NextResponse } from "next/server";
import { applySessionCookie, createSession } from "@/lib/server/auth";
import { verifyEmailCode, verifyEmailMagic } from "@/lib/server/emailAuth";
import { getDb } from "@/lib/server/db";

function bumpVerifyLimit(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";
  const key = `verify-ip:${ip}`;
  const db = getDb();
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const limit = 30;
  const row = db
    .prepare("SELECT count, window_start FROM auth_rate_limits WHERE key = ?")
    .get(key) as { count: number; window_start: number } | undefined;
  if (!row || now - row.window_start > windowMs) {
    db.prepare(
      `INSERT INTO auth_rate_limits (key, count, window_start) VALUES (?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET count = 1, window_start = excluded.window_start`,
    ).run(key, now);
    return;
  }
  if (Number(row.count) >= limit) throw new Error("rate_limited");
  db.prepare("UPDATE auth_rate_limits SET count = count + 1 WHERE key = ?").run(key);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; code?: string; token?: string }
    | null;
  if (!body) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  try {
    bumpVerifyLimit(request);
    const result = body.token
      ? verifyEmailMagic({ email: body.email, token: body.token })
      : verifyEmailCode({ email: body.email, code: body.code });
    const sessionToken = await createSession(result.row.id, request);
    const response = NextResponse.json({ user: result.user });
    applySessionCookie(response, sessionToken, request);
    return response;
  } catch (error) {
    const code = error instanceof Error ? error.message : "email_verify_failed";
    const status =
      code === "banned" || code === "registration_closed"
        ? 403
        : code === "rate_limited"
          ? 429
          : 401;
    return NextResponse.json({ error: code }, { status });
  }
}
