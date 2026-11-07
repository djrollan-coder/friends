import { NextResponse, type NextRequest } from "next/server";
import { assertSameOrigin, csrfRejectedResponse, isCsrfExempt } from "@/lib/server/csrf";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function wantsHttpsRedirect(request: NextRequest) {
  if (process.env.VERCEL !== "1" && process.env.NODE_ENV !== "production") return false;
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return proto === "http";
}

export function proxy(request: NextRequest) {
  if (wantsHttpsRedirect(request)) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }

  const { pathname } = request.nextUrl;

  // Same-origin API only — never advertise CORS allow-headers.
  if (pathname.startsWith("/api/") && request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        Allow: "GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS",
      },
    });
  }

  if (pathname.startsWith("/api/") && MUTATING.has(request.method) && !isCsrfExempt(pathname)) {
    try {
      assertSameOrigin(request);
    } catch {
      return csrfRejectedResponse();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
