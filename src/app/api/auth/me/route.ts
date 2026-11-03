import { NextResponse } from "next/server";
import { getCurrentUser, toAuthUser, touchUser } from "@/lib/server/auth";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ user: null });
  touchUser(me.id);
  return NextResponse.json({ user: toAuthUser(me) });
}
