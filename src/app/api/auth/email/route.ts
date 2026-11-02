import { NextResponse } from "next/server";

function initialsFromEmail(email: string) {
  const local = email.split("@")[0] ?? "U";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

function nameFromEmail(email: string) {
  const local = email.split("@")[0] ?? "user";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; password?: string }
    | null;

  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (password.length < 4) {
    return NextResponse.json({ error: "weak_password" }, { status: 400 });
  }

  // Demo auth — replace with real credentials / magic link later.
  return NextResponse.json({
    user: {
      id: `email-${Buffer.from(email).toString("base64url").slice(0, 12)}`,
      name: nameFromEmail(email),
      username: email.split("@")[0],
      avatar: initialsFromEmail(email),
      email,
      method: "email" as const,
    },
  });
}
