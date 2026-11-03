import { NextResponse } from "next/server";
import { withUser } from "@/lib/server/http";
import { deleteListing } from "@/lib/server/market";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  return withUser(async (me) => NextResponse.json({ listings: deleteListing(me.id, id) }));
}
