import { NextResponse } from "next/server";
import { telegramBotUsername, telegramConfigured } from "@/lib/telegramAuth";

export async function GET() {
  const botUsername = telegramBotUsername();
  return NextResponse.json({
    configured: telegramConfigured(),
    botUsername: botUsername || null,
  });
}
