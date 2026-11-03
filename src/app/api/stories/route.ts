import { NextResponse } from "next/server";
import { readBody, withUser } from "@/lib/server/http";
import { addStory, listStories } from "@/lib/server/stories";

export async function GET() {
  return withUser(async (me) => NextResponse.json({ stories: listStories(me.id) }));
}

export async function POST(request: Request) {
  return withUser(async (me) => {
    const body = await readBody<{ url?: string; caption?: string }>(request);
    if (!body.url) return NextResponse.json({ error: "missing_url" }, { status: 400 });
    return NextResponse.json({ stories: addStory(me.id, body.url, body.caption ?? "") });
  });
}
