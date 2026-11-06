import { NextResponse } from "next/server";
import { withAdmin, readBody } from "@/lib/server/http";
import {
  newsAgentEnabled,
  runNewsAgentSafe,
  setNewsAgentEnabled,
} from "@/lib/ai/newsAgent";
import { getSetting } from "@/lib/server/appSettings";
import { aiConfigured } from "@/lib/ai/model";

export const maxDuration = 60;

export async function GET() {
  return withAdmin(async () =>
    NextResponse.json({
      enabled: newsAgentEnabled(),
      aiConfigured: aiConfigured(),
      lastRun: Number(getSetting("news_agent_last_run", "0") || 0) || null,
      lastPostId: getSetting("news_agent_last_post", "") || null,
    }),
  );
}

export async function POST(request: Request) {
  return withAdmin(async () => {
    const body = await readBody<{ action?: string; topic?: string; enabled?: boolean }>(request);
    if (body.action === "toggle" && typeof body.enabled === "boolean") {
      setNewsAgentEnabled(body.enabled);
      return NextResponse.json({ enabled: newsAgentEnabled() });
    }
    if (!aiConfigured()) {
      return NextResponse.json({ error: "ai_not_configured" }, { status: 503 });
    }
    try {
      const result = await runNewsAgentSafe(body.topic);
      return NextResponse.json({ ok: true, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "news_failed";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  });
}
