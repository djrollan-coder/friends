import { NextResponse } from "next/server";
import { readBody, withAdmin } from "@/lib/server/http";
import { adminUpdateSettings, getAdminSettings } from "@/lib/server/admin";
import type { AppSettings } from "@/lib/server/appSettings";

export async function GET() {
  return withAdmin(async () => NextResponse.json(getAdminSettings()));
}

export async function PATCH(request: Request) {
  return withAdmin(async () => {
    const body = await readBody<Partial<AppSettings>>(request);
    return NextResponse.json(adminUpdateSettings(body));
  });
}
