import { currentUser as fallbackUser, type User } from "@/data/mock";
import type { AuthUser } from "@/lib/auth";

let cached: AuthUser | null = null;

/** AuthProvider keeps this cache in sync with the server session. */
export function setSessionAuthUser(user: AuthUser | null) {
  cached = user;
}

export function getSessionAuthUser() {
  return cached;
}

/** Logged-in person for UI/stores (falls back to mock only before hydration). */
export function getSessionUser(): User {
  if (!cached) return fallbackUser;
  return {
    id: cached.id,
    name: cached.name,
    avatar: cached.avatar,
    photo: cached.photoUrl,
    online: true,
  };
}

export function isSessionUserId(id: string) {
  return id === getSessionUser().id;
}
