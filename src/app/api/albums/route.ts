import { NextResponse } from "next/server";
import { readBody, withUser } from "@/lib/server/http";
import { createAlbum } from "@/lib/server/media";

export async function POST(request: Request) {
  return withUser(async (me) => {
    const body = await readBody<{ title?: string }>(request);
    return NextResponse.json(createAlbum(me.id, body.title ?? ""));
  });
}
