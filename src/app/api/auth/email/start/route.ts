import { NextResponse } from "next/server";
import { startEmailLogin } from "@/lib/server/emailAuth";
import { emailStartBodySchema, parseBody } from "@/lib/server/validation";

export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  if (!raw) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  try {
    const body = parseBody(emailStartBodySchema, raw);
    const result = await startEmailLogin(request, body);
    return NextResponse.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "email_start_failed";
    const status =
      code === "rate_limited"
        ? 429
        : code === "banned" || code === "registration_closed"
          ? 403
          : code === "email_not_configured" || code === "email_send_failed"
            ? 503
            : 400;
    return NextResponse.json({ error: code }, { status });
  }
}
