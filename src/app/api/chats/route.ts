import { NextResponse } from "next/server";
import { withUser, readBody } from "@/lib/server/http";
import { createGroupChat, ensureDm, listChats } from "@/lib/server/chats";

export async function GET() {
  return withUser(async (me) => {
    return NextResponse.json({ chats: listChats(me.id) });
  });
}

export async function POST(request: Request) {
  return withUser(async (me) => {
    const body = await readBody<{
      type?: "dm" | "group";
      userId?: string;
      title?: string;
      memberIds?: string[];
    }>(request);
    if (body.type === "group") {
      const result = createGroupChat(me.id, body.title ?? "", body.memberIds ?? []);
      return NextResponse.json(result);
    }
    if (!body.userId) return NextResponse.json({ error: "missing_user" }, { status: 400 });
    const result = ensureDm(me.id, body.userId);
    return NextResponse.json(result);
  });
}
