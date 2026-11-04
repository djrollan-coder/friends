import type { AuthUser } from "@/lib/auth";
import { getDb } from "@/lib/server/db";

export type TelegramLoginSession = {
  token: string;
  status: "pending" | "confirmed" | "expired";
  createdAt: number;
  user?: AuthUser;
  claimedAt?: number | null;
};

const TTL_MS = 5 * 60 * 1000;
const TOKEN_RE = /^[a-f0-9]{24}$/i;

function cacheKey(token: string) {
  return `friends:tg-login:${token}`;
}

async function cacheGet(token: string): Promise<TelegramLoginSession | null> {
  try {
    const { getCache } = await import("@vercel/functions");
    const value = await getCache({ namespace: "friends-tg-login" }).get(cacheKey(token));
    if (value && typeof value === "object") return value as TelegramLoginSession;
  } catch {
    /* unavailable */
  }
  return null;
}

async function cacheSet(session: TelegramLoginSession) {
  try {
    const { getCache } = await import("@vercel/functions");
    await getCache({ namespace: "friends-tg-login" }).set(cacheKey(session.token), session, {
      ttl: Math.floor(TTL_MS / 1000),
      name: `tg-login:${session.token}`,
    });
  } catch {
    /* unavailable */
  }
}

function rowToSession(row: {
  token: string;
  status: string;
  user_json: string | null;
  created_at: number;
  claimed_at: number | null;
}): TelegramLoginSession {
  const session: TelegramLoginSession = {
    token: row.token,
    status: row.status as TelegramLoginSession["status"],
    createdAt: row.created_at,
    claimedAt: row.claimed_at,
  };
  if (row.user_json) {
    try {
      session.user = JSON.parse(row.user_json) as AuthUser;
    } catch {
      /* ignore */
    }
  }
  if (Date.now() - session.createdAt > TTL_MS) {
    session.status = "expired";
  }
  return session;
}

function readDb(token: string): TelegramLoginSession | null {
  try {
    const row = getDb()
      .prepare(
        "SELECT token, status, user_json, created_at, claimed_at FROM tg_login_sessions WHERE token = ?",
      )
      .get(token) as
      | {
          token: string;
          status: string;
          user_json: string | null;
          created_at: number;
          claimed_at: number | null;
        }
      | undefined;
    if (!row) return null;
    return rowToSession(row);
  } catch {
    return null;
  }
}

function writeDb(session: TelegramLoginSession) {
  try {
    getDb()
      .prepare(
        `INSERT INTO tg_login_sessions (token, status, user_json, created_at, claimed_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(token) DO UPDATE SET
           status = excluded.status,
           user_json = excluded.user_json,
           claimed_at = excluded.claimed_at`,
      )
      .run(
        session.token,
        session.status,
        session.user ? JSON.stringify(session.user) : null,
        session.createdAt,
        session.claimedAt ?? null,
      );
  } catch {
    /* db unavailable */
  }
}

export async function createTelegramLoginSession(): Promise<TelegramLoginSession> {
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  const session: TelegramLoginSession = {
    token,
    status: "pending",
    createdAt: Date.now(),
  };
  writeDb(session);
  await cacheSet(session);
  return session;
}

export async function getTelegramLoginSession(token: string) {
  if (!TOKEN_RE.test(token)) return null;
  const fromDb = readDb(token);
  const remote = await cacheGet(token);
  if (remote && Date.now() - remote.createdAt > TTL_MS) {
    remote.status = "expired";
  }

  // Prefer confirmed (or newer) cache over a stale local pending row — serverless
  // instances each have their own SQLite file.
  if (remote && (!fromDb || remote.status === "confirmed" || remote.createdAt >= fromDb.createdAt)) {
    writeDb(remote);
    return remote;
  }
  if (fromDb) return fromDb;
  return null;
}

export async function confirmTelegramLoginSession(token: string, user: AuthUser) {
  if (!TOKEN_RE.test(token)) return null;
  const existing = await getTelegramLoginSession(token);
  if (existing?.status === "expired") return null;

  const session: TelegramLoginSession = {
    token,
    status: "confirmed",
    createdAt: existing?.createdAt ?? Date.now(),
    user,
    claimedAt: existing?.claimedAt ?? null,
  };
  writeDb(session);
  await cacheSet(session);
  return session;
}

export async function claimTelegramLoginSession(token: string) {
  const session = await getTelegramLoginSession(token);
  if (!session || session.status !== "confirmed" || !session.user) return null;
  if (!session.claimedAt) {
    session.claimedAt = Date.now();
    writeDb(session);
    await cacheSet(session);
  }
  return session;
}
