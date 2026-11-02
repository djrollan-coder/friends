import { createHash, createHmac, timingSafeEqual } from "crypto";
import type { AuthUser } from "@/lib/auth";
import type { TelegramLoginPayload } from "@/lib/telegramTypes";

export type { TelegramLoginPayload } from "@/lib/telegramTypes";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "TG";
}

/** Normalize widget/callback fields into string map for HMAC check. */
export function telegramFields(data: TelegramLoginPayload): Record<string, string> {
  const out: Record<string, string> = {
    id: String(data.id),
    first_name: data.first_name,
    auth_date: String(data.auth_date),
    hash: data.hash,
  };
  if (data.last_name) out.last_name = data.last_name;
  if (data.username) out.username = data.username;
  if (data.photo_url) out.photo_url = data.photo_url;
  return out;
}

export function verifyTelegramLogin(
  data: TelegramLoginPayload,
  botToken: string,
  maxAgeSec = 86400,
): boolean {
  if (!botToken || !data?.hash || data.first_name == null || data.id == null) {
    return false;
  }

  const fields = telegramFields(data);
  const { hash, ...rest } = fields;
  const checkString = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${rest[key]}`)
    .join("\n");

  const secretKey = createHash("sha256").update(botToken).digest();
  const computed = createHmac("sha256", secretKey).update(checkString).digest("hex");

  try {
    const a = Buffer.from(computed, "utf8");
    const b = Buffer.from(hash, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }

  const authDate = Number(fields.auth_date);
  if (!Number.isFinite(authDate)) return false;
  const age = Math.floor(Date.now() / 1000) - authDate;
  if (age < 0 || age > maxAgeSec) return false;

  return true;
}

export function authUserFromTelegram(data: TelegramLoginPayload): AuthUser {
  const name = [data.first_name, data.last_name].filter(Boolean).join(" ");
  return {
    id: `tg-${data.id}`,
    name,
    username: data.username,
    avatar: initials(name),
    photoUrl: data.photo_url,
    method: "telegram",
  };
}

export function telegramBotUsername() {
  return (
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.replace(/^@/, "").trim() ||
    process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "").trim() ||
    ""
  );
}

export function telegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim() && telegramBotUsername());
}
