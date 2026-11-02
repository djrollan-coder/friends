import { createHmac, timingSafeEqual } from "crypto";
import type { AuthUser } from "@/lib/auth";
import { telegramBotUsername } from "@/lib/telegramAuth";

export type BotLoginClaims = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  exp: number;
};

function b64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf8");
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromB64url(input: string) {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const raw = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(raw, "base64");
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "TG"
  );
}

export function signBotLoginToken(
  claims: Omit<BotLoginClaims, "exp">,
  botToken: string,
  ttlSec = 10 * 60,
) {
  const payload: BotLoginClaims = {
    ...claims,
    exp: Math.floor(Date.now() / 1000) + ttlSec,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(
    createHmac("sha256", botToken).update(body).digest(),
  );
  return `${body}.${sig}`;
}

export function verifyBotLoginToken(token: string, botToken: string) {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = b64url(
    createHmac("sha256", botToken).update(body).digest(),
  );
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(sig, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const claims = JSON.parse(fromB64url(body).toString("utf8")) as BotLoginClaims;
    if (!claims?.id || !claims.first_name || !claims.exp) return null;
    if (claims.exp < Math.floor(Date.now() / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}

export function authUserFromBotClaims(claims: BotLoginClaims): AuthUser {
  const name = [claims.first_name, claims.last_name].filter(Boolean).join(" ");
  return {
    id: `tg-${claims.id}`,
    name,
    username: claims.username,
    avatar: initials(name),
    method: "telegram",
  };
}

export function telegramDeepLoginLink() {
  const username = telegramBotUsername();
  if (!username) return null;
  return `https://t.me/${username}?start=web_login`;
}
