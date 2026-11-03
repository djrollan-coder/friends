import { NextResponse } from "next/server";
import { withUser } from "@/lib/server/http";
import { listPeople } from "@/lib/server/social";
import { listFeed } from "@/lib/server/feed";
import { listGroups } from "@/lib/server/groups";

function matches(haystack: string, needle: string) {
  return haystack.toLowerCase().includes(needle);
}

export async function GET(request: Request) {
  return withUser(async (me) => {
    const q = (new URL(request.url).searchParams.get("q") ?? "").trim().toLowerCase();
    const people = listPeople(me.id).filter(
      (p) =>
        !q ||
        matches(p.name, q) ||
        matches(p.city ?? "", q) ||
        matches(p.bio ?? "", q),
    );
    const groups = listGroups().filter(
      (g) => !q || matches(g.name, q) || matches(g.desc, q),
    );
    const posts = listFeed(me.id, { query: q || undefined, limit: q ? 40 : 20 });
    return NextResponse.json({ people, groups, posts });
  });
}
