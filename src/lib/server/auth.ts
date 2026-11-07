import { cookies } from "next/headers";
import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { getDb, seedNewUserWorld, uid, type Row } from "./db";

export const SESSION_COOKIE = "friends_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const ONLINE_WINDOW_MS = 2 * 60 * 1000;

type PortableSession = {
  v: 1;
  uid: string;
  exp: number;
  name: string;
  avatar: string;
  method: string;
  email?: string | null;
  username?: string | null;
  photoUrl?: string | null;
  isAdmin?: number;
};

function sessionSecret() {
  const secret = process.env.FRIENDS_SESSION_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1") {
    throw new Error("FRIENDS_SESSION_SECRET is required in production");
  }
  return "friends-dev-session-secret";
}

function signPortableSession(payload: PortableSession) {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", sessionSecret()).update(body).digest("base64url");
  return `s1.${body}.${sig}`;
}

function verifyPortableSession(token: string): PortableSession | null {
  if (!token.startsWith("s1.")) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [, body, sig] = parts;
  const expected = createHmac("sha256", sessionSecret()).update(body).digest("base64url");
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(sig, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as PortableSession;
    if (payload?.v !== 1 || !payload.uid || !payload.exp || !payload.name) return null;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function upsertUserFromPortable(payload: PortableSession): UserRow {
  const db = getDb();
  const existing = findUserById(payload.uid);
  if (existing) {
    db.prepare(
      "UPDATE users SET name = ?, avatar = ?, photo_url = COALESCE(?, photo_url), last_seen = ?, online = 1 WHERE id = ?",
    ).run(payload.name, payload.avatar, payload.photoUrl ?? null, Date.now(), payload.uid);
    return findUserById(payload.uid)!;
  }
  const now = Date.now();
  db.prepare(
    `INSERT INTO users
      (id, name, username, email, password_hash, avatar, photo_url, cover_url, status, about, city, birthday, relationship, method, is_demo, is_admin, online, created_at, last_seen)
     VALUES (?, ?, ?, ?, NULL, ?, ?, NULL, '', '', '', '', '', ?, 0, ?, 1, ?, ?)`,
  ).run(
    payload.uid,
    payload.name,
    payload.username ?? null,
    payload.email ?? null,
    payload.avatar,
    payload.photoUrl ?? null,
    payload.method || "email",
    payload.isAdmin ? 1 : 0,
    now,
    now,
  );
  try {
    seedNewUserWorld(payload.uid);
  } catch (error) {
    console.error("seedNewUserWorld failed for portable session", error);
  }
  return findUserById(payload.uid)!;
}

export type AuthUser = {
  id: string;
  name: string;
  username?: string;
  avatar: string;
  photoUrl?: string;
  method: "telegram" | "qr" | "email";
  email?: string;
  isAdmin?: boolean;
};

export type UserRow = {
  id: string;
  name: string;
  username: string | null;
  email: string | null;
  password_hash: string | null;
  avatar: string;
  photo_url: string | null;
  cover_url: string | null;
  status: string;
  about: string;
  city: string;
  birthday: string;
  relationship: string;
  method: string;
  privacy_wall: string;
  privacy_messages: string;
  privacy_calls: string;
  searchable: number;
  show_online: number;
  is_demo: number;
  is_admin: number;
  banned: number;
  online: number;
  created_at: number;
  last_seen: number;
};

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string | null) {
  if (!stored) return false;
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function isSecureRequest(request?: Request) {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1") return true;
  if (!request) return false;
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0]?.trim() === "https";
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}

export function sessionCookieOptions(request?: Request) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    secure: isSecureRequest(request),
  };
}

export async function createSession(userId: string, request?: Request) {
  const db = getDb();
  const user = findUserById(userId);
  if (!user) throw new Error("user_not_found");
  const now = Date.now();
  // Signed portable token — survives Vercel instance hops where SQLite does not.
  const token = signPortableSession({
    v: 1,
    uid: user.id,
    exp: now + SESSION_TTL_MS,
    name: user.name,
    avatar: user.avatar,
    method: user.method,
    email: user.email,
    username: user.username,
    photoUrl: user.photo_url,
    isAdmin: Number(user.is_admin),
  });
  try {
    db.prepare(
      "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
    ).run(token, userId, now, now + SESSION_TTL_MS);
  } catch {
    /* local session mirror is best-effort */
  }
  try {
    const store = await cookies();
    store.set(SESSION_COOKIE, token, sessionCookieOptions(request));
  } catch {
    /* Route handlers should also call applySessionCookie on the response */
  }
  return token;
}

export function applySessionCookie(
  response: { cookies: { set: (name: string, value: string, options: object) => void } },
  token: string,
  request?: Request,
) {
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(request));
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
  }
  store.delete(SESSION_COOKIE);
}

const lastSeenCache = new Map<string, number>();

export function touchUser(userId: string) {
  const now = Date.now();
  const previous = lastSeenCache.get(userId) ?? 0;
  if (now - previous < 20_000) return;
  lastSeenCache.set(userId, now);
  try {
    getDb()
      .prepare("UPDATE users SET last_seen = ?, online = 1 WHERE id = ? AND is_demo = 0")
      .run(now, userId);
  } catch {
    /* presence is best-effort */
  }
}

export async function getSessionToken() {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function getCurrentUser(): Promise<UserRow | null> {
  const token = await getSessionToken();
  if (!token) return null;
  const db = getDb();

  const portable = verifyPortableSession(token);
  let user: UserRow | null = null;
  if (portable) {
    user = upsertUserFromPortable(portable);
  } else {
    const row = db
      .prepare(
        `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token = ? AND s.expires_at > ?`,
      )
      .get(token, Date.now()) as Row | undefined;
    user = row ? (row as unknown as UserRow) : null;
  }

  if (!user) return null;
  if (Number(user.banned) !== 0) {
    try {
      db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    } catch {
      /* ignore */
    }
    return null;
  }
  if (Number(user.is_admin) === 0 && isAdminEmail(user.email)) {
    db.prepare("UPDATE users SET is_admin = 1 WHERE id = ?").run(user.id);
    user.is_admin = 1;
  }
  touchUser(user.id);
  return user;
}

function isAdminEmail(email: string | null) {
  if (!email) return false;
  const list = (process.env.FRIENDS_ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export function findUserById(id: string): UserRow | null {
  const row = getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as
    | Row
    | undefined;
  return (row as unknown as UserRow) ?? null;
}

export function findUserByEmail(email: string): UserRow | null {
  const row = getDb()
    .prepare("SELECT * FROM users WHERE lower(email) = lower(?)")
    .get(email) as Row | undefined;
  return (row as unknown as UserRow) ?? null;
}

export function isOnline(user: Pick<UserRow, "online" | "last_seen" | "is_demo">) {
  if (user.is_demo) return Boolean(user.online);
  return Date.now() - user.last_seen < ONLINE_WINDOW_MS;
}

export function toAuthUser(user: UserRow): AuthUser {
  return {
    id: user.id,
    name: user.name,
    username: user.username ?? undefined,
    avatar: user.avatar,
    photoUrl: user.photo_url ?? undefined,
    email: user.email ?? undefined,
    method: (user.method === "telegram" || user.method === "qr" ? user.method : "email") as
      | "telegram"
      | "qr"
      | "email",
    isAdmin: Number(user.is_admin) !== 0,
  };
}

export function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "F"
  );
}

export type RegisterInput = {
  name?: string;
  email?: string;
  password?: string;
  method?: "email" | "telegram" | "qr";
  username?: string;
  avatar?: string;
  photoUrl?: string;
  telegramId?: string;
};

export function createUser(input: RegisterInput): UserRow {
  const db = getDb();
  const name = input.name?.trim() || "Друг";
  const email = input.email?.trim().toLowerCase() || null;
  const id = uid("u");
  const now = Date.now();
  // Never persist plaintext passwords — only scrypt digests (or NULL for OAuth/OTP-only).
  const passwordHash =
    input.password && input.password.length > 0 ? hashPassword(input.password) : null;
  if (passwordHash && !passwordHash.startsWith("scrypt:")) {
    throw new Error("password_hash_failed");
  }
  const adminCount = db
    .prepare("SELECT COUNT(*) AS n FROM users WHERE is_admin = 1 AND is_demo = 0")
    .get() as { n: number };
  const isAdmin = Number(adminCount.n) === 0 || isAdminEmail(email) ? 1 : 0;
  db.prepare(
    `INSERT INTO users
      (id, name, username, email, password_hash, avatar, photo_url, cover_url, status, about, city, birthday, relationship, method, is_demo, is_admin, online, created_at, last_seen)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, '', '', '', '', '', ?, 0, ?, 1, ?, ?)`,
  ).run(
    id,
    name,
    input.username?.trim() || null,
    email,
    passwordHash,
    input.avatar?.slice(0, 2).toUpperCase() || initials(name),
    input.photoUrl ?? null,
    input.method ?? "email",
    isAdmin,
    now,
    now,
  );
  try {
    seedNewUserWorld(id);
  } catch (error) {
    console.error("seedNewUserWorld failed", error);
  }
  return findUserById(id)!;
}

/** Telegram login payload → local account, creating one on first sign-in. */
export function findOrCreateTelegramUser(payload: {
  id: string | number;
  name: string;
  username?: string;
  photoUrl?: string;
}): UserRow {
  const db = getDb();
  const tgId = String(payload.id).replace(/^tg-/, "");
  const syntheticEmail = `tg-${tgId}@telegram.local`;

  const byEmail = findUserByEmail(syntheticEmail);
  if (byEmail) {
    db.prepare(
      "UPDATE users SET name = ?, photo_url = COALESCE(?, photo_url), last_seen = ?, online = 1 WHERE id = ?",
    ).run(payload.name, payload.photoUrl ?? null, Date.now(), byEmail.id);
    return findUserById(byEmail.id)!;
  }

  if (payload.username) {
    const byTgUsername = db
      .prepare("SELECT * FROM users WHERE username = ? AND method = 'telegram'")
      .get(payload.username) as Row | undefined;
    if (byTgUsername) return byTgUsername as unknown as UserRow;
  }

  // Avoid UNIQUE collisions with demo / email accounts that already took the handle.
  let username: string | undefined = payload.username?.trim() || undefined;
  if (username) {
    const taken = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
    if (taken) username = `tg_${tgId}`;
  } else {
    username = `tg_${tgId}`;
  }
  const takenAlias = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (takenAlias) username = undefined;

  return createUser({
    name: payload.name,
    email: syntheticEmail,
    method: "telegram",
    username,
    avatar: initials(payload.name),
    photoUrl: payload.photoUrl,
  });
}

export function requireUserMessage() {
  return { error: "unauthorized" as const };
}
