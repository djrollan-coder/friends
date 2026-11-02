import { currentUser } from "@/data/mock";

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
  about:
    "Friends — место для своих: семья, близкие друзья, общие чаты, музыка и звонки. Не площадка для всех подряд.",
  city: "Москва",
  birthday: "1 ноября",
  relationship: "в близком круге",
};

export function loadProfileBio(): ProfileBio {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(PROFILE_BIO_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...(JSON.parse(raw) as Partial<ProfileBio>) };
  } catch {
    return defaults;
  }
}

export function saveProfileBio(next: ProfileBio) {
  localStorage.setItem(PROFILE_BIO_KEY, JSON.stringify(next));
}

export function clearProfileBio() {
  localStorage.removeItem(PROFILE_BIO_KEY);
}
