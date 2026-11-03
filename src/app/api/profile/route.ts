import { NextResponse } from "next/server";
import { withUser, readBody } from "@/lib/server/http";
import { getProfile, updateProfile } from "@/lib/server/social";

export async function GET() {
  return withUser(async (me) => {
    return NextResponse.json({ profile: getProfile(me.id, me.id) });
  });
}

export async function PATCH(request: Request) {
  return withUser(async (me) => {
    const body = await readBody<{
      name?: string;
      status?: string;
      about?: string;
      city?: string;
      birthday?: string;
      relationship?: string;
      photo?: string | null;
      cover?: string | null;
    }>(request);
    const profile = updateProfile(me.id, body);
    return NextResponse.json({ profile });
  });
}
