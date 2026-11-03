import { NextResponse } from "next/server";
import {
  authUserFromBotClaims,
  signBotLoginToken,
  telegramDeepLoginLink,
} from "@/lib/telegramBotLogin";
import { telegramBotUsername, telegramConfigured } from "@/lib/telegramAuth";
import { confirmTelegramLoginSession } from "@/lib/telegramLoginSessions";

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

function siteOrigin(request: Request) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    new URL(request.url).origin
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

  const payload = text.split(/\s+/)[1] ?? "";
  const botToken = process.env.TELEGRAM_BOT_TOKEN!.trim();
  const claims = {
    id: from.id,
    first_name: from.first_name,
    last_name: from.last_name,
    username: from.username,
    photo_url: undefined as string | undefined,
  };

  // Skip profile photo on the hot path — keeps webhook under Telegram's timeout.
  const preview = authUserFromBotClaims({ ...claims, exp: Math.floor(Date.now() / 1000) + 600 });
  const loginToken = signBotLoginToken(claims, botToken);
  const bridgeUrl = `${siteOrigin(request)}/api/auth/telegram/open-app?t=${encodeURIComponent(loginToken)}`;
  const webUrl = `${siteOrigin(request)}/login/telegram?t=${encodeURIComponent(loginToken)}`;

  if (payload.startsWith("f_") && payload.length > 4) {
    const sessionToken = payload.slice(2);
    const user = authUserFromBotClaims({ ...claims, exp: Math.floor(Date.now() / 1000) + 600 });
    await confirmTelegramLoginSession(sessionToken, user);
    await tgApi("sendMessage", {
      chat_id: msg.chat.id,
      text: `Готово, ${preview.name}!\n\nВернись в Friends — вход уже идёт.\nЕсли не вошло само, нажми кнопку:`,
      reply_markup: {
        inline_keyboard: [[{ text: "Открыть Friends", url: bridgeUrl }]],
      },
    });
    return NextResponse.json({ ok: true });
  }

  await tgApi("sendMessage", {
    chat_id: msg.chat.id,
    text: `Привет, ${preview.name}!\n\nНажми кнопку ниже, чтобы войти в Friends.`,
    reply_markup: {
      inline_keyboard: [
        [{ text: "Открыть Friends", url: bridgeUrl }],
        [{ text: "Открыть в браузере", url: webUrl }],
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
