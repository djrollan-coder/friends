import { NextResponse } from "next/server";
import { runNewsAgentSafe } from "@/lib/ai/newsAgent";
import { aiConfigured } from "@/lib/ai/model";

export const maxDuration = 60;

function authorized(request: Request) {
  if (request.headers.get("x-vercel-cron") === "1") return true;
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!aiConfigured()) {
    return NextResponse.json({ error: "ai_not_configured" }, { status: 503 });
  }
  try {
    const result = await runNewsAgentSafe();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "news_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
