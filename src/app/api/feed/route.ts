import { NextResponse } from "next/server";
import { withUser, readBody } from "@/lib/server/http";
import { createPost, listFeed } from "@/lib/server/feed";
import { parseBody, postBodySchema } from "@/lib/server/validation";

export async function GET(request: Request) {
  return withUser(async (me) => {
    const url = new URL(request.url);
    const posts = listFeed(me.id, {
      authorId: url.searchParams.get("author") ?? undefined,
      groupId: url.searchParams.get("group") ?? undefined,
      query: url.searchParams.get("q") ?? undefined,
      limit: Number(url.searchParams.get("limit") ?? 60),
    });
    return NextResponse.json({ posts });
  });
}

export async function POST(request: Request) {
  return withUser(async (me) => {
    const raw = await readBody(request);
    const body = parseBody(postBodySchema, raw);
    const post = createPost(me.id, {
      text: body.text,
      image: body.image ?? undefined,
      video: body.video ?? undefined,
      groupId: body.groupId ?? undefined,
      attachment: body.attachment ?? undefined,
    });
    return NextResponse.json({ post });
  });
}
