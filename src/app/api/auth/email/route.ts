import { NextResponse } from "next/server";
import { createSession } from "@/lib/server/auth";
import { loginAccount, registerAccount } from "@/lib/server/accounts";
import { bumpRateLimit, clientIp, rateLimitResponse } from "@/lib/server/rateLimit";
import { parseBody } from "@/lib/server/validation";
import { z } from "zod";

const emailAuthSchema = z.object({
  mode: z.enum(["login", "register"]).optional(),
  name: z.string().max(80).optional(),
  email: z.string().email().max(254).optional(),
  password: z.string().max(256).optional(),
});

/**
 * Email sign-in endpoint. `mode: "register"` creates an account, anything else
 * signs in an existing one. Kept as a single endpoint for the login screen.
 */
export async function POST(request: Request) {
  const ip = clientIp(request);
  try {
    bumpRateLimit(`email_auth:ip:${ip}`, 20, 15 * 60 * 1000);
  } catch {
    return rateLimitResponse();
  }

  const raw = await request.json().catch(() => null);
  if (!raw) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  type EmailAuthBody = z.infer<typeof emailAuthSchema>;
  let body: EmailAuthBody;
  try {
    body = parseBody(emailAuthSchema, raw);
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const result =
      body.mode === "register"
        ? registerAccount({ name: body.name, email: body.email, password: body.password })
        : loginAccount({ email: body.email, password: body.password });
    await createSession(result.user.id, request);
    return NextResponse.json({ user: result.user });
  } catch (error) {
    const code = error instanceof Error ? error.message : "auth_failed";
    const status =
      code === "exists"
        ? 409
        : code === "registration_closed" || code === "banned"
          ? 403
          : code === "invalid_credentials"
            ? 401
            : 400;
    return NextResponse.json({ error: code }, { status });
  }
}
