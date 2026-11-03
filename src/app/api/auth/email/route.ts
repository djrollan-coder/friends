import { NextResponse } from "next/server";
import { createSession } from "@/lib/server/auth";
import { loginAccount, registerAccount } from "@/lib/server/accounts";

/**
 * Email sign-in endpoint. `mode: "register"` creates an account, anything else
 * signs in an existing one. Kept as a single endpoint for the login screen.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { name?: string; email?: string; password?: string; mode?: "login" | "register" }
    | null;
  if (!body) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

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
      code === "exists" ? 409 : code === "invalid_credentials" ? 401 : 400;
    return NextResponse.json({ error: code }, { status });
  }
}
