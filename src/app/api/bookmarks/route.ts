import { NextResponse } from "next/server";
import { withUser } from "@/lib/server/http";
import { listBookmarks } from "@/lib/server/feed";

export async function GET() {
  return withUser(async (me) => {
    return NextResponse.json({ posts: listBookmarks(me.id) });
  });
}
