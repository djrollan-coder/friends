import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/server/http";
import { listAdminUsers } from "@/lib/server/admin";

export async function GET(request: Request) {
  return withAdmin(async () => {
    const q = new URL(request.url).searchParams.get("q") ?? "";
    return NextResponse.json({ users: listAdminUsers(q) });
  });
}
