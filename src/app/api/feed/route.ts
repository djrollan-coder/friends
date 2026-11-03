import { NextResponse } from "next/server";
import { withUser, readBody } from "@/lib/server/http";
import { createPost, listFeed } from "@/lib/server/feed";

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
    const body = await readBody<{
      text?: string;
      image?: string;
      video?: string;
      groupId?: string;
      attachment?: unknown;
    }>(request);
    const post = createPost(me.id, body);
    return NextResponse.json({ post });
  });
}
