import { NextResponse } from "next/server";
import { withUser, readBody } from "@/lib/server/http";
import {
  acceptFriend,
  cancelOutgoing,
  declineFriend,
  removeFriend,
  sendFriendRequest,
  toggleFollow,
} from "@/lib/server/social";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return withUser(async (me) => {
    const body = await readBody<{ action?: string }>(request);
    switch (body.action) {
      case "request":
        return NextResponse.json({ state: sendFriendRequest(me.id, id) });
      case "accept":
        return NextResponse.json({ state: acceptFriend(me.id, id) });
      case "decline":
        return NextResponse.json({ state: declineFriend(me.id, id) });
      case "cancel":
        return NextResponse.json({ state: cancelOutgoing(me.id, id) });
      case "remove":
        return NextResponse.json({ state: removeFriend(me.id, id) });
      case "follow":
        return NextResponse.json({ state: toggleFollow(me.id, id) });
      default:
        return NextResponse.json({ error: "unknown_action" }, { status: 400 });
    }
  });
}
