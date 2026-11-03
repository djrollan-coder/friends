import { NextResponse } from "next/server";
import { withUser, readBody } from "@/lib/server/http";
import { addChatMembers, clearChat, deleteChat, getChat } from "@/lib/server/chats";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  return withUser(async (me) => {
    const chat = getChat(me.id, id, true);
    if (!chat) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ chat });
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  return withUser(async (me) => {
    const body = await readBody<{ action?: string; memberIds?: string[] }>(request);
    if (body.action === "clear") {
      return NextResponse.json({ chat: clearChat(me.id, id) });
    }
    if (body.action === "addMembers") {
      return NextResponse.json({ chat: addChatMembers(me.id, id, body.memberIds ?? []) });
    }
    const chat = getChat(me.id, id, true);
    if (!chat) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ chat });
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  return withUser(async (me) => {
    return NextResponse.json({ chats: deleteChat(me.id, id) });
  });
}
