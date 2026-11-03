import { NextResponse } from "next/server";
import { readBody, withUser } from "@/lib/server/http";
import { bumpVideoViews, deleteVideo } from "@/lib/server/media";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return withUser(async (me) => {
    const body = await readBody<{ action?: string }>(request);
    if (body.action === "view") return NextResponse.json({ videos: bumpVideoViews(me.id, id) });
    return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  return withUser(async (me) => NextResponse.json({ videos: deleteVideo(me.id, id) }));
}
