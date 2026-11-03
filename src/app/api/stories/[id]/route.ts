import { NextResponse } from "next/server";
import { withUser } from "@/lib/server/http";
import { deleteStory } from "@/lib/server/stories";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  return withUser(async (me) => NextResponse.json({ stories: deleteStory(me.id, id) }));
}
