import { NextResponse } from "next/server";
import { readBody, withUser } from "@/lib/server/http";
import { addPhoto, listAlbums, listPhotos } from "@/lib/server/media";

export async function GET() {
  return withUser(async (me) =>
    NextResponse.json({ albums: listAlbums(me.id), photos: listPhotos(me.id) }),
  );
}

export async function POST(request: Request) {
  return withUser(async (me) => {
    const body = await readBody<{ albumId?: string; title?: string; url?: string }>(request);
    if (!body.url) return NextResponse.json({ error: "missing_url" }, { status: 400 });
    return NextResponse.json({ photos: addPhoto(me.id, { ...body, url: body.url }) });
  });
}
