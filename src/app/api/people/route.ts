import { NextResponse } from "next/server";
import { withUser } from "@/lib/server/http";
import { listPeople } from "@/lib/server/social";

export async function GET() {
  return withUser(async (me) => {
    return NextResponse.json({ people: listPeople(me.id) });
  });
}
