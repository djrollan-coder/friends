import { NextResponse } from "next/server";
import { withUser } from "@/lib/server/http";
import { getProfile } from "@/lib/server/social";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  return withUser(async (me) => {
    const profile = getProfile(me.id, id);
    if (!profile) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ profile });
  });
}
