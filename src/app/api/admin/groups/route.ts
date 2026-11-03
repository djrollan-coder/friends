import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/server/http";
import { listAdminGroups } from "@/lib/server/admin";

export async function GET() {
  return withAdmin(async () => NextResponse.json({ groups: listAdminGroups() }));
}
