import { NextResponse } from "next/server";
import { readBody, withUser } from "@/lib/server/http";
import { createInvite, listInvites } from "@/lib/server/social";

export async function GET() {
  return withUser(async (me) => NextResponse.json({ invites: listInvites(me.id) }));
}

export async function POST(request: Request) {
  return withUser(async (me) => {
    const body = await readBody<{ note?: string }>(request);
    return NextResponse.json(createInvite(me.id, body.note ?? ""));
  });
}
