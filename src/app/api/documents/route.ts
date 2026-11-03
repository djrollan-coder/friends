import { NextResponse } from "next/server";
import { readBody, withUser } from "@/lib/server/http";
import { addDocument, listDocuments } from "@/lib/server/documents";

export async function GET() {
  return withUser(async (me) => NextResponse.json({ documents: listDocuments(me.id) }));
}

export async function POST(request: Request) {
  return withUser(async (me) => {
    const body = await readBody<{ name?: string; size?: number; type?: string; url?: string }>(
      request,
    );
    if (!body.url) return NextResponse.json({ error: "missing_url" }, { status: 400 });
    return NextResponse.json({
      documents: addDocument(me.id, { ...body, url: body.url }),
    });
  });
}
