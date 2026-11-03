import { cookies } from "next/headers";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getDb, seedNewUserWorld, uid, type Row } from "./db";

export const SESSION_COOKIE = "friends_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const ONLINE_WINDOW_MS = 2 * 60 * 1000;

export type AuthUser = {
  id: string;
  name: string;
  username?: string;
  avatar: string;
  photoUrl?: string;
  method: "telegram" | "qr" | "email";
  email?: string;
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
  if (!request) return false;
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}

export async function createSession(userId: string, request?: Request) {
  const db = getDb();
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  db.prepare(
    "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
  ).run(token, userId, now, now + SESSION_TTL_MS);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    secure: isSecureRequest(request),
  });
  return token;
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
  const row = db
    .prepare(
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > ?`,
    )
    .get(token, Date.now()) as Row | undefined;
  if (!row) return null;
  const user = row as unknown as UserRow;
  touchUser(user.id);
  return user;
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
  db.prepare(
    `INSERT INTO users
      (id, name, username, email, password_hash, avatar, photo_url, cover_url, status, about, city, birthday, relationship, method, is_demo, online, created_at, last_seen)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, '', '', '', '', '', ?, 0, 1, ?, ?)`,
  ).run(
    id,
    name,
    input.username?.trim() || null,
    email,
    input.password ? hashPassword(input.password) : null,
    input.avatar?.slice(0, 2).toUpperCase() || initials(name),
    input.photoUrl ?? null,
    input.method ?? "email",
    now,
    now,
  );
  seedNewUserWorld(id);
  return findUserById(id)!;
}

/** Telegram login payload → local account, creating one on first sign-in. */
export function findOrCreateTelegramUser(payload: {
  id: string | number;
  name: string;
  username?: string;
  photoUrl?: string;
}): UserRow {
  const existingUsername = payload.username
    ? (getDb()
        .prepare("SELECT * FROM users WHERE username = ? AND method = 'telegram'")
        .get(payload.username) as Row | undefined)
    : undefined;
  if (existingUsername) return existingUsername as unknown as UserRow;

  const syntheticEmail = `tg-${payload.id}@telegram.local`;
  const existing = findUserByEmail(syntheticEmail);
  if (existing) {
    if (payload.photoUrl && payload.photoUrl !== existing.photo_url) {
      getDb()
        .prepare("UPDATE users SET photo_url = ?, name = ? WHERE id = ?")
        .run(payload.photoUrl, payload.name, existing.id);
    }
    return findUserById(existing.id)!;
  }

  return createUser({
    name: payload.name,
    email: syntheticEmail,
    method: "telegram",
    username: payload.username,
    avatar: initials(payload.name),
    photoUrl: payload.photoUrl,
  });
}

export function requireUserMessage() {
  return { error: "unauthorized" as const };
}
