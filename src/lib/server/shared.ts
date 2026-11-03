import type { UserRow } from "./auth";
import { isOnline } from "./auth";
import { getDb, type Row } from "./db";

export type UserDTO = {
  id: string;
  name: string;
  avatar: string;
  photo?: string;
  cover?: string;
  status?: string;
  online: boolean;
  city?: string;
  bio?: string;
};

export type CommentDTO = {
  id: string;
  author: UserDTO;
  text: string;
  createdAt: string;
  createdAtIso: string;
};

export type PostDTO = {
  id: string;
  author: UserDTO;
  text: string;
  createdAt: string;
  createdAtIso: string;
  likes: number;
  comments: number;
  reposts: number;
  likedByMe: boolean;
  bookmarked: boolean;
  image?: string;
  video?: string;
  attachment?: { name: string; size: string; type: "file" | "photo" };
  commentList: CommentDTO[];
  groupId?: string;
};

export type GroupDTO = {
  id: string;
  name: string;
  desc: string;
  privacy: "public" | "private";
  ownerId: string;
  memberIds: string[];
  cover: string;
  createdAt: number;
};

export type MessageDTO = {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
  createdAtIso: string;
  silent?: boolean;
};

export type ChatDTO = {
  id: string;
  type: "dm" | "group";
  title: string;
  memberIds: string[];
  messages: MessageDTO[];
  unread: number;
  peer?: UserDTO | null;
  members?: UserDTO[];
};

export type NotificationDTO = {
  id: string;
  type: "message" | "like" | "comment" | "friend" | "repost" | "group";
  title: string;
  body: string;
  href: string;
  createdAt: string;
  createdAtIso: string;
  read: boolean;
};

export type FriendsStateDTO = {
  friendIds: string[];
  incoming: string[];
  outgoing: string[];
  following: string[];
};

export function formatWhen(timestamp: number) {
  const date = new Date(timestamp);
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  if (dayDiff <= 0) return `сегодня в ${time}`;
  if (dayDiff === 1) return `вчера в ${time}`;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
}

export function userDTO(row: Row | UserRow | undefined | null): UserDTO | null {
  if (!row) return null;
  const u = row as unknown as UserRow;
  return {
    id: u.id,
    name: u.name,
    avatar: u.avatar,
    photo: u.photo_url ?? undefined,
    cover: u.cover_url ?? undefined,
    status: u.status || undefined,
    online: isOnline(u) && Number(u.show_online ?? 1) !== 0,
    city: u.city || undefined,
    bio: u.about || undefined,
  };
}

export function usersByIds(ids: string[]): Map<string, UserDTO> {
  const map = new Map<string, UserDTO>();
  const unique = Array.from(new Set(ids)).filter(Boolean);
  if (!unique.length) return map;
  const placeholders = unique.map(() => "?").join(",");
  const rows = getDb()
    .prepare(`SELECT * FROM users WHERE id IN (${placeholders})`)
    .all(...unique) as Row[];
  for (const row of rows) {
    const dto = userDTO(row);
    if (dto) map.set(dto.id, dto);
  }
  return map;
}
