import { NextResponse } from "next/server";
import { readBody, withUser } from "@/lib/server/http";
import { addVideo, listVideos } from "@/lib/server/media";

export async function GET() {
  return withUser(async (me) => NextResponse.json({ videos: listVideos(me.id) }));
}

export async function POST(request: Request) {
  return withUser(async (me) => {
    const body = await readBody<{
      title?: string;
      description?: string;
      src?: string;
      duration?: string;
    }>(request);
    return NextResponse.json({ videos: addVideo(me.id, body) });
  });
}
