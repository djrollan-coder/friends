import { NextResponse } from "next/server";
import { readBody, withUser } from "@/lib/server/http";
import { getSettings, updateSettings, type PrivacySettings } from "@/lib/server/social";

export async function GET() {
  return withUser(async (me) => NextResponse.json(getSettings(me.id)));
}

export async function PATCH(request: Request) {
  return withUser(async (me) => {
    const body = await readBody<Partial<PrivacySettings>>(request);
    return NextResponse.json(updateSettings(me.id, body));
  });
}
