import { NextResponse } from "next/server";
import {
  telegramBotId,
  telegramBotUsername,
  telegramConfigured,
} from "@/lib/telegramAuth";

export async function GET() {
  const botUsername = telegramBotUsername();
  const botId = telegramBotId();
  return NextResponse.json({
    configured: telegramConfigured(),
    botUsername: botUsername || null,
    botId: botId || null,
  });
}
