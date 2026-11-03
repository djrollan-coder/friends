import { api } from "./api";
import type { ProfileDTO } from "./dto";

export type { ProfileDTO } from "./dto";

export type ProfileBio = {
  status: string;
  about: string;
  city: string;
  birthday: string;
  relationship: string;
};

export const emptyProfileBio: ProfileBio = {
  status: "",
  about: "",
  city: "",
  birthday: "",
  relationship: "",
};

export function bioFromProfile(profile: ProfileDTO): ProfileBio {
  return {
    status: profile.status ?? "",
    about: profile.bio ?? "",
    city: profile.city ?? "",
    birthday: profile.birthday ?? "",
    relationship: profile.relationship ?? "",
  };
}

export async function fetchProfile(id?: string): Promise<ProfileDTO | null> {
  try {
    const data = await api<{ profile: ProfileDTO }>(id ? `/api/users/${id}` : "/api/profile");
    return data.profile;
  } catch {
    return null;
  }
}

export async function saveProfile(patch: {
  name?: string;
  status?: string;
  about?: string;
  city?: string;
  birthday?: string;
  relationship?: string;
  photo?: string | null;
  cover?: string | null;
}): Promise<ProfileDTO> {
  const data = await api<{ profile: ProfileDTO }>("/api/profile", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return data.profile;
}
