import { NextResponse } from "next/server";
import { withUser, readBody } from "@/lib/server/http";
import { sendMessage } from "@/lib/server/chats";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return withUser(async (me) => {
    const body = await readBody<{ text?: string; silent?: boolean }>(request);
    const chat = sendMessage(me.id, id, body.text ?? "", { silent: body.silent });
    return NextResponse.json({ chat });
  });
}
