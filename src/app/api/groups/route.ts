import { NextResponse } from "next/server";
import { withUser, readBody } from "@/lib/server/http";
import { createGroup, listGroups } from "@/lib/server/groups";

export async function GET() {
  return withUser(async () => {
    return NextResponse.json({ groups: listGroups() });
  });
}

export async function POST(request: Request) {
  return withUser(async (me) => {
    const body = await readBody<{
      name?: string;
      desc?: string;
      privacy?: "public" | "private";
    }>(request);
    const result = createGroup(me.id, body);
    return NextResponse.json(result);
  });
}
