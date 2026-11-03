import type { AuthUser } from "@/lib/auth";

export type TelegramLoginSession = {
  token: string;
  status: "pending" | "confirmed" | "expired";
  createdAt: number;
  user?: AuthUser;
};

const TTL_SEC = 5 * 60;
const TOKEN_RE = /^[a-f0-9]{24}$/i;

const g = globalThis as typeof globalThis & {
  __friendsTgLoginSessions?: Map<string, TelegramLoginSession>;
};

function memory() {
  if (!g.__friendsTgLoginSessions) {
    g.__friendsTgLoginSessions = new Map();
  }
  return g.__friendsTgLoginSessions;
}

function cacheKey(token: string) {
  return `friends:tg-login:${token}`;
}

async function cacheGet(token: string): Promise<TelegramLoginSession | null> {
  try {
    const { getCache } = await import("@vercel/functions");
    const value = await getCache({ namespace: "friends-tg-login" }).get(cacheKey(token));
    if (value && typeof value === "object") {
      return value as TelegramLoginSession;
    }
  } catch {
    /* local / unavailable */
  }
  return null;
}

async function cacheSet(session: TelegramLoginSession) {
  try {
    const { getCache } = await import("@vercel/functions");
    await getCache({ namespace: "friends-tg-login" }).set(cacheKey(session.token), session, {
      ttl: TTL_SEC,
      name: `tg-login:${session.token}`,
    });
  } catch {
    /* local / unavailable */
  }
}

function touchExpiry(session: TelegramLoginSession) {
  if (Date.now() - session.createdAt > TTL_SEC * 1000) {
    session.status = "expired";
  }
  return session;
}

export async function createTelegramLoginSession(): Promise<TelegramLoginSession> {
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  const session: TelegramLoginSession = {
    token,
    status: "pending",
    createdAt: Date.now(),
  };
  memory().set(token, session);
  await cacheSet(session);
  return session;
}

export async function getTelegramLoginSession(token: string) {
  if (!TOKEN_RE.test(token)) return null;
  const local = memory().get(token);
  if (local) return touchExpiry(local);

  const remote = await cacheGet(token);
  if (!remote) return null;
  memory().set(token, remote);
  return touchExpiry(remote);
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
  };
  memory().set(token, session);
  await cacheSet(session);
  return session;
}
