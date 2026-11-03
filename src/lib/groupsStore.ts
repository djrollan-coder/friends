import { api } from "./api";
import type { Community } from "./dto";

export type { Community } from "./dto";

export async function fetchGroups(): Promise<Community[]> {
  const data = await api<{ groups: Community[] }>("/api/groups");
  return data.groups;
}

export async function fetchGroup(id: string): Promise<{ group: Community; posts: import("./dto").FeedPost[] } | null> {
  try {
    return await api<{ group: Community; posts: import("./dto").FeedPost[] }>(`/api/groups/${id}`);
  } catch {
    return null;
  }
}

export async function createGroup(input: {
  name: string;
  desc: string;
  privacy: "public" | "private";
}): Promise<Community[]> {
  const data = await api<{ groups: Community[] }>("/api/groups", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.groups;
}

export type GroupAction = "join" | "leave" | "privacy" | "delete";

export async function groupAction(
  id: string,
  action: GroupAction,
  privacy?: "public" | "private",
): Promise<Community[]> {
  const data = await api<{ groups?: Community[]; group?: Community; ok?: boolean }>(
    `/api/groups/${id}`,
    {
      method: "POST",
      body: JSON.stringify({ action, privacy }),
    },
  );
  if (data.groups) return data.groups;
  return fetchGroups();
}
