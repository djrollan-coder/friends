import { getDb } from "./db";

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Sliding fixed-window limiter backed by SQLite `auth_rate_limits`. */
export function bumpRateLimit(key: string, limit: number, windowMs: number) {
  const db = getDb();
  const now = Date.now();
  const row = db
    .prepare("SELECT key, count, window_start FROM auth_rate_limits WHERE key = ?")
    .get(key) as { key: string; count: number; window_start: number } | undefined;
  if (!row || now - row.window_start > windowMs) {
    db.prepare(
      `INSERT INTO auth_rate_limits (key, count, window_start) VALUES (?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET count = 1, window_start = excluded.window_start`,
    ).run(key, now);
    return;
  }
  if (Number(row.count) >= limit) throw new Error("rate_limited");
  db.prepare("UPDATE auth_rate_limits SET count = count + 1 WHERE key = ?").run(key);
}

export function rateLimitResponse() {
  return Response.json({ error: "rate_limited" }, { status: 429 });
}
