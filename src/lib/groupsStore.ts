import { getSessionUser } from "@/lib/sessionUser";
import { createPost, loadFeed } from "./feedStore";
import { pushNotification } from "./notify";

export const GROUPS_KEY = "friends.groups.v1";

export type Community = {
  id: string;
  name: string;
  desc: string;
  privacy: "public" | "private";
  ownerId: string;
  memberIds: string[];
  cover: string;
};

function seed(): Community[] {
  return [
    {
      id: "g1",
      name: "Friends Community",
      desc: "Новости продукта",
      privacy: "public",
      ownerId: getSessionUser().id,
      memberIds: [getSessionUser().id, "2", "3", "5"],
      cover: "FC",
    },
    {
      id: "g2",
      name: "Фильмы ужасов",
      desc: "Обсуждаем кино",
      privacy: "public",
      ownerId: "2",
      memberIds: [getSessionUser().id, "2", "4", "6"],
      cover: "ФУ",
    },
    {
      id: "g3",
      name: "Корона Вирус",
      desc: "Новости и мемы",
      privacy: "private",
      ownerId: "3",
      memberIds: [getSessionUser().id, "3"],
      cover: "КВ",
    },
  ];
}

export function loadGroups(): Community[] {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(GROUPS_KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as Community[];
    return Array.isArray(parsed) && parsed.length ? parsed : seed();
  } catch {
    return seed();
  }
}

export function saveGroups(next: Community[]) {
  localStorage.setItem(GROUPS_KEY, JSON.stringify(next));
}

export function getGroup(id: string) {
  return loadGroups().find((g) => g.id === id);
}

export function createGroup(input: {
  name: string;
  desc: string;
  privacy: "public" | "private";
}) {
  const group: Community = {
    id: `g_${Date.now()}`,
    name: input.name.trim() || "Новое сообщество",
    desc: input.desc.trim() || "Без описания",
    privacy: input.privacy,
    ownerId: getSessionUser().id,
    memberIds: [getSessionUser().id],
    cover: input.name.trim().slice(0, 2).toUpperCase() || "ГР",
  };
  const next = [group, ...loadGroups()];
  saveGroups(next);
  pushNotification({
    type: "group",
    title: "Сообщество создано",
    body: group.name,
    href: `/groups/${group.id}`,
  });
  return { groups: next, group };
}

export function joinGroup(groupId: string) {
  const next = loadGroups().map((g) => {
    if (g.id !== groupId) return g;
    if (g.memberIds.includes(getSessionUser().id)) return g;
    return { ...g, memberIds: [...g.memberIds, getSessionUser().id] };
  });
  saveGroups(next);
  return next;
}

export function leaveGroup(groupId: string) {
  const next = loadGroups().map((g) => {
    if (g.id !== groupId) return g;
    if (g.ownerId === getSessionUser().id) return g;
    return {
      ...g,
      memberIds: g.memberIds.filter((id) => id !== getSessionUser().id),
    };
  });
  saveGroups(next);
  return next;
}

export function updateGroupPrivacy(groupId: string, privacy: "public" | "private") {
  const next = loadGroups().map((g) =>
    g.id === groupId && g.ownerId === getSessionUser().id ? { ...g, privacy } : g,
  );
  saveGroups(next);
  return next;
}

export function postToGroup(groupId: string, text: string, image?: string) {
  const group = getGroup(groupId);
  if (!group) return loadFeed();
  createPost({
    text,
    image,
    groupId,
    author: {
      id: group.id,
      name: group.name,
      avatar: group.cover,
    },
  });
  return loadFeed();
}
