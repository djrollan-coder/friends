import { NextResponse } from "next/server";
import { withAdmin, readBody } from "@/lib/server/http";
import {
  listOpenSupportTickets,
  resolveSupportTicket,
  supportAgentEnabled,
} from "@/lib/ai/supportAgent";
import { setSetting } from "@/lib/server/appSettings";
import { aiConfigured } from "@/lib/ai/model";

export async function GET() {
  return withAdmin(async () =>
    NextResponse.json({
      enabled: supportAgentEnabled(),
      aiConfigured: aiConfigured(),
      tickets: listOpenSupportTickets(),
    }),
  );
}

export async function POST(request: Request) {
  return withAdmin(async () => {
    const body = await readBody<{ action?: string; enabled?: boolean; ticketId?: string }>(
      request,
    );
    if (body.action === "toggle" && typeof body.enabled === "boolean") {
      setSetting("support_agent", body.enabled ? "1" : "0");
      return NextResponse.json({ enabled: supportAgentEnabled() });
    }
    if (body.action === "resolve" && body.ticketId) {
      return NextResponse.json(resolveSupportTicket(body.ticketId));
    }
    return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  });
}
