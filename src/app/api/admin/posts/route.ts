import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/server/http";
import { listAdminPosts } from "@/lib/server/admin";

export async function GET(request: Request) {
  return withAdmin(async () => {
    const url = new URL(request.url);
    return NextResponse.json({
      posts: listAdminPosts(
        url.searchParams.get("q") ?? "",
        url.searchParams.get("status") ?? "all",
      ),
    });
  });
}
