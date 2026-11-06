import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/server/http";
import { getAdminBootstrap } from "@/lib/server/admin";

export async function GET() {
  return withAdmin(async () => NextResponse.json(getAdminBootstrap()));
}
