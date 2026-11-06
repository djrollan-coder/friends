import { convertToModelMessages, type UIMessage } from "ai";
import { withUser } from "@/lib/server/http";
import { createSupportAgent, supportAgentEnabled } from "@/lib/ai/supportAgent";
import { aiConfigured } from "@/lib/ai/model";

export const maxDuration = 60;

export async function POST(request: Request) {
  return withUser(async (me) => {
    if (!supportAgentEnabled()) {
      return Response.json({ error: "support_disabled" }, { status: 403 });
    }
    if (!aiConfigured()) {
      return Response.json({ error: "ai_not_configured" }, { status: 503 });
    }

    const body = (await request.json().catch(() => null)) as { messages?: UIMessage[] } | null;
    const messages = body?.messages ?? [];
    if (!messages.length) {
      return Response.json({ error: "empty" }, { status: 400 });
    }

    const agent = createSupportAgent(me);
    const result = await agent.stream({
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  });
}
