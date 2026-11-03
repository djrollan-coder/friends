import { NextResponse } from "next/server";
import { withUser } from "@/lib/server/http";
import { getFriendsState, listPeople, onlineFriends } from "@/lib/server/social";

export async function GET() {
  return withUser(async (me) => {
    const state = getFriendsState(me.id);
    return NextResponse.json({
      state,
      people: listPeople(me.id),
      online: onlineFriends(me.id).map((u) => u.id),
    });
  });
}
