/** Paths that receive cross-origin POSTs by design (bots, cron). */
const CSRF_EXEMPT_PREFIXES = [
  "/api/auth/telegram/webhook",
  "/api/cron/",
];

export function isCsrfExempt(pathname: string) {
  return CSRF_EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}

function allowedOrigins(request: Request): Set<string> {
  const set = new Set<string>();
  // Use Host header — it always reflects the host the browser sees, unlike
  // request.url which may carry an internal rewrite address in the proxy.
  const host = request.headers.get("host");
  if (host) {
    set.add(`http://${host}`);
    set.add(`https://${host}`);
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (site) {
    try {
      set.add(new URL(site).origin);
    } catch {
      /* ignore */
    }
  }
  return set;
}

/**
 * Same-site cookie apps still benefit from Origin checks on mutating API calls.
 * Missing Origin (native WebView, curl, server) is allowed; a foreign Origin is not.
 */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  if (!allowedOrigins(request).has(origin)) {
    throw new Error("csrf_rejected");
  }
}

export function csrfRejectedResponse() {
  return Response.json({ error: "csrf_rejected" }, { status: 403 });
}
