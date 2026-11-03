import { NextResponse } from "next/server";
import { readBody, withUser } from "@/lib/server/http";
import { createReport } from "@/lib/server/admin";

export async function POST(request: Request) {
  return withUser(async (me) => {
    const body = await readBody<{ targetType?: string; targetId?: string; reason?: string }>(
      request,
    );
    return NextResponse.json(createReport(me.id, body));
  });
}
