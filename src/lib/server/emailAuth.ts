import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { getDb, uid } from "./db";
import {
  createUser,
  findUserByEmail,
  toAuthUser,
  type AuthUser,
  type UserRow,
} from "./auth";
import { getSetting } from "./appSettings";
import { emailSendingConfigured, sendLoginEmail } from "./mail";
import { bumpRateLimit, clientIp } from "./rateLimit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const START_PER_EMAIL = 3;
const START_EMAIL_WINDOW_MS = 15 * 60 * 1000;
const START_PER_IP = 10;
const START_IP_WINDOW_MS = 60 * 60 * 1000;

type Purpose = "login" | "register";

function otpSecret() {
  const secret = process.env.FRIENDS_SESSION_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("email_not_configured");
  }
  return "friends-dev-otp-secret";
}

function hashSecret(value: string) {
  return createHmac("sha256", otpSecret()).update(value).digest("hex");
}

function safeEqualHex(a: string, b: string) {
  try {
    const left = Buffer.from(a, "hex");
    const right = Buffer.from(b, "hex");
    if (left.length !== right.length) return false;
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function siteOrigin(request: Request) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    new URL(request.url).origin
  );
}


async function cacheSet(id: string, payload: Record<string, unknown>) {
  try {
    const { getCache } = await import("@vercel/functions");
    await getCache({ namespace: "friends-email-otp" }).set(`otp:${id}`, payload, {
      ttl: Math.floor(CODE_TTL_MS / 1000),
      name: `email-otp:${id}`,
    });
  } catch {
    /* optional */
  }
}

export function emailAuthConfigured() {
  return emailSendingConfigured() || process.env.NODE_ENV !== "production";
}

export async function startEmailLogin(
  request: Request,
  input: { email?: string; name?: string; mode?: "login" | "register" },
) {
  if (!emailAuthConfigured()) throw new Error("email_not_configured");

  const email = normalizeEmail(input.email ?? "");
  if (!EMAIL_RE.test(email)) throw new Error("invalid_email");

  const mode = input.mode === "register" ? "register" : "login";
  const existing = findUserByEmail(email);
  const purpose: Purpose = existing ? "login" : "register";
  let name = input.name?.trim() || existing?.name || "";

  // Uniform success response — do not leak whether the email exists / is banned.
  const genericOk = {
    ok: true as const,
    expiresInSec: Math.floor(CODE_TTL_MS / 1000),
  };

  bumpRateLimit(`email:${email}`, START_PER_EMAIL, START_EMAIL_WINDOW_MS);
  bumpRateLimit(`ip:${clientIp(request)}`, START_PER_IP, START_IP_WINDOW_MS);

  if (existing && Number(existing.banned) !== 0) {
    return genericOk;
  }

  if (purpose === "register") {
    if (getSetting("registration", "1") === "0") {
      // Still look like success to the client.
      return genericOk;
    }
    if (name.length < 2) {
      name = email.split("@")[0]?.slice(0, 40) || "Друг";
    }
  }

  const db = getDb();
  const now = Date.now();
  // Invalidate previous unused codes for this email.
  db.prepare(
    "UPDATE email_login_codes SET consumed_at = ? WHERE email = ? AND consumed_at IS NULL",
  ).run(now, email);

  const code = String(randomInt(100000, 1000000));
  const magic = randomBytes(24).toString("base64url");
  const id = uid("em");
  const expiresAt = now + CODE_TTL_MS;
  db.prepare(
    `INSERT INTO email_login_codes
      (id, email, code_hash, magic_hash, name, purpose, attempts, created_at, expires_at, consumed_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, NULL)`,
  ).run(id, email, hashSecret(code), hashSecret(magic), name || null, purpose, now, expiresAt);

  await cacheSet(id, {
    email,
    purpose,
    name,
    expiresAt,
  });

  const origin = siteOrigin(request);
  const magicUrl = `${origin}/login/email?email=${encodeURIComponent(email)}&token=${encodeURIComponent(magic)}`;
  await sendLoginEmail({
    to: email,
    code,
    magicUrl,
    name: name || undefined,
  });

  return genericOk;
}

function loadActiveCode(email: string) {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT * FROM email_login_codes
       WHERE email = ? AND consumed_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get(email) as
    | {
        id: string;
        email: string;
        code_hash: string;
        magic_hash: string;
        name: string | null;
        purpose: string;
        attempts: number;
        created_at: number;
        expires_at: number;
        consumed_at: number | null;
      }
    | undefined;
  return row ?? null;
}

function consumeAndAuthenticate(
  row: NonNullable<ReturnType<typeof loadActiveCode>>,
): { user: AuthUser; row: UserRow } {
  const db = getDb();
  const now = Date.now();
  if (row.expires_at < now) {
    db.prepare(
      "UPDATE email_login_codes SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL",
    ).run(now, row.id);
    throw new Error("code_expired");
  }
  if (Number(row.attempts) >= MAX_ATTEMPTS) {
    db.prepare(
      "UPDATE email_login_codes SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL",
    ).run(now, row.id);
    throw new Error("code_locked");
  }

  const consumed = db
    .prepare(
      "UPDATE email_login_codes SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL",
    )
    .run(now, row.id);
  if (Number(consumed.changes ?? 0) === 0) throw new Error("invalid_code");

  let userRow = findUserByEmail(row.email);
  if (!userRow) {
    if (getSetting("registration", "1") === "0") throw new Error("registration_closed");
    const name = row.name?.trim() || row.email.split("@")[0] || "Друг";
    userRow = createUser({
      name,
      email: row.email,
      method: "email",
    });
  } else if (Number(userRow.banned) !== 0) {
    throw new Error("banned");
  }

  return { user: toAuthUser(userRow), row: userRow };
}

export function verifyEmailCode(input: { email?: string; code?: string }) {
  const email = normalizeEmail(input.email ?? "");
  const code = (input.code ?? "").replace(/\s+/g, "");
  if (!EMAIL_RE.test(email)) throw new Error("invalid_email");
  if (!/^\d{6}$/.test(code)) throw new Error("invalid_code");

  const row = loadActiveCode(email);
  if (!row) throw new Error("invalid_code");

  const db = getDb();
  if (row.expires_at < Date.now()) {
    db.prepare("UPDATE email_login_codes SET consumed_at = ? WHERE id = ?").run(Date.now(), row.id);
    throw new Error("code_expired");
  }
  if (Number(row.attempts) >= MAX_ATTEMPTS) {
    db.prepare("UPDATE email_login_codes SET consumed_at = ? WHERE id = ?").run(Date.now(), row.id);
    throw new Error("code_locked");
  }

  if (!safeEqualHex(row.code_hash, hashSecret(code))) {
    db.prepare("UPDATE email_login_codes SET attempts = attempts + 1 WHERE id = ?").run(row.id);
    const next = Number(row.attempts) + 1;
    if (next >= MAX_ATTEMPTS) {
      db.prepare("UPDATE email_login_codes SET consumed_at = ? WHERE id = ?").run(Date.now(), row.id);
      throw new Error("code_locked");
    }
    throw new Error("invalid_code");
  }

  return consumeAndAuthenticate(row);
}

export function verifyEmailMagic(input: { email?: string; token?: string }) {
  const email = normalizeEmail(input.email ?? "");
  const token = (input.token ?? "").trim();
  if (!EMAIL_RE.test(email)) throw new Error("invalid_email");
  if (!token || token.length < 16) throw new Error("invalid_token");

  const row = loadActiveCode(email);
  if (!row) throw new Error("invalid_token");

  const db = getDb();
  if (row.expires_at < Date.now()) {
    db.prepare("UPDATE email_login_codes SET consumed_at = ? WHERE id = ?").run(Date.now(), row.id);
    throw new Error("code_expired");
  }
  if (Number(row.attempts) >= MAX_ATTEMPTS) {
    db.prepare("UPDATE email_login_codes SET consumed_at = ? WHERE id = ?").run(Date.now(), row.id);
    throw new Error("code_locked");
  }

  if (!safeEqualHex(row.magic_hash, hashSecret(token))) {
    db.prepare("UPDATE email_login_codes SET attempts = attempts + 1 WHERE id = ?").run(row.id);
    const next = Number(row.attempts) + 1;
    if (next >= MAX_ATTEMPTS) {
      db.prepare(
        "UPDATE email_login_codes SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL",
      ).run(Date.now(), row.id);
      throw new Error("code_locked");
    }
    throw new Error("invalid_token");
  }

  return consumeAndAuthenticate(row);
}
