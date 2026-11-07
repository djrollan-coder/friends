import { NextResponse } from "next/server";
import { withUser, readBody } from "@/lib/server/http";
import { sendMessage } from "@/lib/server/chats";
import { parseBody, messageBodySchema } from "@/lib/server/validation";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return withUser(async (me) => {
    const raw = await readBody(request);
    const body = parseBody(messageBodySchema, raw);
    const chat = sendMessage(me.id, id, body.text, { silent: body.silent });
    return NextResponse.json({ chat });
  });
}
