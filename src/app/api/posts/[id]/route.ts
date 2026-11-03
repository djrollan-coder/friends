import { NextResponse } from "next/server";
import { withUser, readBody } from "@/lib/server/http";
import {
  addComment,
  deletePost,
  repost,
  toggleBookmark,
  toggleLike,
} from "@/lib/server/feed";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return withUser(async (me) => {
    const body = await readBody<{ action?: string; text?: string }>(request);
    switch (body.action) {
      case "like":
        return NextResponse.json(await toggleLike(me.id, id));
      case "comment":
        return NextResponse.json(await addComment(me.id, id, body.text ?? ""));
      case "repost":
        return NextResponse.json(await repost(me.id, id));
      case "bookmark":
        return NextResponse.json(await toggleBookmark(me.id, id));
      default:
        return NextResponse.json({ error: "unknown_action" }, { status: 400 });
    }
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  return withUser(async (me) => {
    const ok = deletePost(me.id, id);
    return NextResponse.json({ ok });
  });
}
