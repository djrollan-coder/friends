import { getSessionUser } from "@/lib/sessionUser";

export const PROFILE_BIO_KEY = "friends.profile.bio";

export type ProfileBio = {
  status: string;
  about: string;
  city: string;
  birthday: string;
  relationship: string;
};

const defaults: ProfileBio = {
  status: "Круг близких · без лишнего шума",
  about: "",
  city: "",
  birthday: "",
  relationship: "",
};

function keyFor(userId?: string) {
  const id = userId ?? getSessionUser().id;
  return `${PROFILE_BIO_KEY}.${id}`;
}

export function loadProfileBio(userId?: string): ProfileBio {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return { ...defaults };
    return { ...defaults, ...(JSON.parse(raw) as Partial<ProfileBio>) };
  } catch {
    return { ...defaults };
  }
}

export function saveProfileBio(next: ProfileBio, userId?: string) {
  localStorage.setItem(keyFor(userId), JSON.stringify(next));
}

export function clearProfileBio(userId?: string) {
  localStorage.removeItem(keyFor(userId));
}
