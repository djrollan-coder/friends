import { NextResponse } from "next/server";
import {
  authUserFromBotClaims,
  signBotLoginToken,
  telegramDeepLoginLink,
} from "@/lib/telegramBotLogin";
import { telegramBotUsername, telegramConfigured } from "@/lib/telegramAuth";

type TgUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
};

type TgUpdate = {
  message?: {
    chat: { id: number };
    text?: string;
    from?: TgUser;
  };
};

async function tgApi(method: string, body: Record<string, unknown>) {
  const token = process.env.TELEGRAM_BOT_TOKEN!.trim();
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json().catch(() => null);
}

function siteOrigin() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://friends-two-amber.vercel.app"
  );
}

export async function POST(request: Request) {
  if (!telegramConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const update = (await request.json().catch(() => null)) as TgUpdate | null;
  const msg = update?.message;
  const text = msg?.text?.trim() ?? "";
  const from = msg?.from;

  if (!msg || !from || !text.startsWith("/start")) {
    return NextResponse.json({ ok: true });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN!.trim();
  const loginToken = signBotLoginToken(
    {
      id: from.id,
      first_name: from.first_name,
      last_name: from.last_name,
      username: from.username,
    },
    token,
  );
  const loginUrl = `${siteOrigin()}/login/telegram?t=${encodeURIComponent(loginToken)}`;
  const preview = authUserFromBotClaims({
    id: from.id,
    first_name: from.first_name,
    last_name: from.last_name,
    username: from.username,
    exp: 0,
  });

  await tgApi("sendMessage", {
    chat_id: msg.chat.id,
    text: `Привет, ${preview.name}!\n\nНажми кнопку ниже, чтобы войти в Friends.`,
    reply_markup: {
      inline_keyboard: [
        [{ text: "Открыть Friends и войти", url: loginUrl }],
      ],
    },
  });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    bot: telegramBotUsername() || null,
    deepLink: telegramDeepLoginLink(),
  });
}
