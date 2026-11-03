import { NextResponse } from "next/server";
import { getCurrentUser, type UserRow } from "./auth";

export function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export function unauthorized() {
  return fail("unauthorized", 401);
}

export async function readBody<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}

/**
 * Runs a handler with the authenticated user. Any thrown Error is mapped to a
 * 400 with its message, which the client uses as a stable error code.
 */
export async function withUser(
  handler: (me: UserRow) => Promise<Response> | Response,
): Promise<Response> {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  try {
    return await handler(me);
  } catch (error) {
    const message = error instanceof Error ? error.message : "server_error";
    if (message === "unauthorized") return unauthorized();
    return fail(message, 400);
  }
}
