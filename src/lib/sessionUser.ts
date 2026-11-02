import { loadAuth } from "@/lib/auth";
import { currentUser as fallbackUser, type User } from "@/data/mock";

/** Logged-in person for UI/stores (falls back to mock only if logged out). */
export function getSessionUser(): User {
  const auth = loadAuth();
  if (!auth) return fallbackUser;
  return {
    id: auth.id,
    name: auth.name,
    avatar: auth.avatar,
    photo: auth.photoUrl,
    online: true,
  };
}

export function isSessionUserId(id: string) {
  return id === getSessionUser().id;
}
