import { NextResponse } from "next/server";
import { withUser } from "@/lib/server/http";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadNotifications,
} from "@/lib/server/social";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  return withUser(async (me) => {
    if (id === "all") markAllNotificationsRead(me.id);
    else markNotificationRead(me.id, id);
    return NextResponse.json({
      notifications: listNotifications(me.id),
      unread: unreadNotifications(me.id),
    });
  });
}
