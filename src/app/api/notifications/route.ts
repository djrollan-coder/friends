import { NextResponse } from "next/server";
import { withUser } from "@/lib/server/http";
import { listNotifications, unreadNotifications } from "@/lib/server/social";

export async function GET() {
  return withUser(async (me) => {
    return NextResponse.json({
      notifications: listNotifications(me.id),
      unread: unreadNotifications(me.id),
    });
  });
}
