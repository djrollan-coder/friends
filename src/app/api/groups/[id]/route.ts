import { NextResponse } from "next/server";
import { withUser, readBody } from "@/lib/server/http";
import {
  deleteGroup,
  getGroup,
  joinGroup,
  leaveGroup,
  updateGroupPrivacy,
} from "@/lib/server/groups";
import { listFeed } from "@/lib/server/feed";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  return withUser(async (me) => {
    const group = getGroup(id);
    if (!group) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ group, posts: listFeed(me.id, { groupId: id, limit: 50 }) });
  });
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return withUser(async (me) => {
    const body = await readBody<{ action?: string; privacy?: "public" | "private" }>(request);
    switch (body.action) {
      case "join":
        return NextResponse.json({ groups: joinGroup(me.id, id) });
      case "leave":
        return NextResponse.json({ groups: leaveGroup(me.id, id) });
      case "privacy":
        return NextResponse.json({
          group: updateGroupPrivacy(me.id, id, body.privacy === "private" ? "private" : "public"),
        });
      case "delete":
        return NextResponse.json({ ok: deleteGroup(me.id, id) });
      default:
        return NextResponse.json({ error: "unknown_action" }, { status: 400 });
    }
  });
}
