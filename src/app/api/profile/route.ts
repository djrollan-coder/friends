import { NextResponse } from "next/server";
import { withUser, readBody, fail } from "@/lib/server/http";
import { getProfile, updateProfile } from "@/lib/server/social";
import { parseBody, profileBodySchema } from "@/lib/server/validation";

export async function GET() {
  return withUser(async (me) => {
    return NextResponse.json({ profile: getProfile(me.id, me.id) });
  });
}

export async function PATCH(request: Request) {
  return withUser(async (me) => {
    let body;
    try {
      body = parseBody(profileBodySchema, await readBody(request));
    } catch (error) {
      const message = error instanceof Error ? error.message : "invalid_body";
      return fail(message, 400);
    }
    const profile = updateProfile(me.id, {
      name: body.name,
      status: body.status,
      about: body.about,
      city: body.city,
      birthday: body.birthday,
      relationship: body.relationship,
      photo: body.photo ?? body.photoUrl,
      cover: body.cover ?? body.coverUrl,
    });
    return NextResponse.json({ profile });
  });
}
