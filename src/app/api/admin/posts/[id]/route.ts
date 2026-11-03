import { NextResponse } from "next/server";
import { readBody, withAdmin } from "@/lib/server/http";
import { adminPostAction } from "@/lib/server/admin";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return withAdmin(async () => {
    const body = await readBody<{ action?: string }>(request);
    return NextResponse.json(adminPostAction(id, body.action ?? ""));
  });
}
