import { NextResponse } from "next/server";
import { createSession } from "@/lib/server/auth";
import { registerAccount } from "@/lib/server/accounts";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { name?: string; email?: string; password?: string }
    | null;
  if (!body) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  try {
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
