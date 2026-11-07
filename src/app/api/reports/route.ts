import { NextResponse } from "next/server";
import { readBody, withUser } from "@/lib/server/http";
import { createReport } from "@/lib/server/admin";
import { parseBody, reportBodySchema } from "@/lib/server/validation";

export async function POST(request: Request) {
  return withUser(async (me) => {
    const raw = await readBody(request);
    const body = parseBody(reportBodySchema, raw);
    return NextResponse.json(createReport(me.id, body));
  });
}
