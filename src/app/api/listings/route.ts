import { NextResponse } from "next/server";
import { readBody, withUser } from "@/lib/server/http";
import { createListing, listListings } from "@/lib/server/market";

export async function GET() {
  return withUser(async () => NextResponse.json({ listings: listListings() }));
}

export async function POST(request: Request) {
  return withUser(async (me) => {
    const body = await readBody<{
      title?: string;
      description?: string;
      price?: number;
      imageUrl?: string;
    }>(request);
    return NextResponse.json({ listings: createListing(me.id, body) });
  });
}
