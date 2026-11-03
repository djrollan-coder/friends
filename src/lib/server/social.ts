import { getDb, uid, type Row } from "./db";
import { findUserById, type UserRow } from "./auth";
import { publishLive } from "./events";
import {
  formatWhen,
  userDTO,
  usersByIds,
  type FriendsStateDTO,
  type NotificationDTO,
  type UserDTO,
} from "./shared";

export function listPeople(meId: string): UserDTO[] {
  const rows = getDb()
    .prepare("SELECT * FROM users WHERE id <> ? ORDER BY is_demo DESC, name ASC LIMIT 500")
    .all(meId) as Row[];
  const friendSet = new Set(friendIds(meId));
  return rows
    .filter((row) => Number(row.searchable ?? 1) !== 0 || friendSet.has(String(row.id)))
    .map((row) => userDTO(row))
    .filter(Boolean) as UserDTO[];
}

export function getUser(id: string): UserDTO | null {
  return userDTO(findUserById(id));
}

export function getFriendsState(meId: string): FriendsStateDTO {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT requester_id, addressee_id, status FROM friendships
       WHERE requester_id = ? OR addressee_id = ?`,
    )
    .all(meId, meId) as Array<{ requester_id: string; addressee_id: string; status: string }>;

  const state: FriendsStateDTO = {
    friendIds: [],
    incoming: [],
    outgoing: [],
    following: [],
  };
  for (const row of rows) {
    if (row.status === "accepted") {
      state.friendIds.push(row.requester_id === meId ? row.addressee_id : row.requester_id);
    } else if (row.status === "pending") {
      if (row.addressee_id === meId) state.incoming.push(row.requester_id);
      else state.outgoing.push(row.addressee_id);
    }
  }
  const follows = db
    .prepare("SELECT following_id FROM follows WHERE follower_id = ?")
    .all(meId) as Array<{ following_id: string }>;
  state.following = follows.map((f) => f.following_id);
  return state;
}

export function friendIds(meId: string) {
  return getFriendsState(meId).friendIds;
}

export function notify(input: {
  userId: string;
  type: NotificationDTO["type"];
  title: string;
  body: string;
  href: string;
}) {
  const db = getDb();
  const id = uid("n");
  const now = Date.now();
  db.prepare(
    `INSERT INTO notifications (id, user_id, type, title, body, href, read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
  ).run(id, input.userId, input.type, input.title, input.body, input.href, now);
  db.prepare(
    `DELETE FROM notifications WHERE user_id = ? AND id NOT IN (
       SELECT id FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100
     )`,
  ).run(input.userId, input.userId);
  publishLive([input.userId], { type: "notification" });
  return id;
}

export function listNotifications(meId: string): NotificationDTO[] {
  const rows = getDb()
    .prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100")
    .all(meId) as Row[];
  return rows.map((row) => {
    const ts = Number(row.created_at ?? 0);
    return {
      id: String(row.id),
      type: String(row.type) as NotificationDTO["type"],
      title: String(row.title),
      body: String(row.body),
      href: String(row.href),
      createdAt: formatWhen(ts),
      createdAtIso: new Date(ts).toISOString(),
      read: Boolean(row.read),
    };
  });
}

export function unreadNotifications(meId: string) {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read = 0")
    .get(meId) as { n: number };
  return Number(row.n);
}

export function markNotificationRead(meId: string, id: string) {
  getDb().prepare("UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?").run(id, meId);
  publishLive([meId], { type: "notification" });
}

export function markAllNotificationsRead(meId: string) {
  getDb().prepare("UPDATE notifications SET read = 1 WHERE user_id = ?").run(meId);
  publishLive([meId], { type: "notification" });
}

export function sendFriendRequest(meId: string, targetId: string) {
  if (meId === targetId) return getFriendsState(meId);
  const db = getDb();
  const now = Date.now();
  const existing = db
    .prepare(
      `SELECT * FROM friendships WHERE
        (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)`,
    )
    .get(meId, targetId, targetId, meId) as Row | undefined;

  if (existing) {
    if (existing.status === "accepted") return getFriendsState(meId);
    if (existing.requester_id === targetId && existing.status === "pending") {
      return acceptFriend(meId, targetId);
    }
    db.prepare(
      `UPDATE friendships SET requester_id = ?, addressee_id = ?, status = 'pending', updated_at = ?
       WHERE requester_id = ? AND addressee_id = ? OR requester_id = ? AND addressee_id = ?`,
    ).run(meId, targetId, now, meId, targetId, targetId, meId);
  } else {
    db.prepare(
      `INSERT INTO friendships (requester_id, addressee_id, status, created_at, updated_at)
       VALUES (?, ?, 'pending', ?, ?)`,
    ).run(meId, targetId, now, now);
  }

  const me = findUserById(meId);
  notify({
    userId: targetId,
    type: "friend",
    title: "Новая заявка в друзья",
    body: `${me?.name ?? "Пользователь"} хочет добавить вас в друзья`,
    href: "/friends?tab=requests",
  });
  publishLive([meId, targetId], { type: "friends" });
  return getFriendsState(meId);
}

export function acceptFriend(meId: string, targetId: string) {
  const db = getDb();
  const now = Date.now();
  const existing = db
    .prepare(
      `SELECT * FROM friendships WHERE requester_id = ? AND addressee_id = ?
       OR requester_id = ? AND addressee_id = ?`,
    )
    .get(targetId, meId, meId, targetId) as Row | undefined;

  if (existing) {
    db.prepare(
      `UPDATE friendships SET status = 'accepted', updated_at = ?
       WHERE requester_id = ? AND addressee_id = ?`,
    ).run(now, String(existing.requester_id), String(existing.addressee_id));
  } else {
    db.prepare(
      `INSERT INTO friendships (requester_id, addressee_id, status, created_at, updated_at)
       VALUES (?, ?, 'accepted', ?, ?)`,
    ).run(meId, targetId, now, now);
  }

  const me = findUserById(meId);
  notify({
    userId: targetId,
    type: "friend",
    title: "Новый друг",
    body: `${me?.name ?? "Пользователь"} принял(а) вашу заявку`,
    href: "/friends",
  });
  publishLive([meId, targetId], { type: "friends" });
  return getFriendsState(meId);
}

export function declineFriend(meId: string, targetId: string) {
  getDb()
    .prepare(
      `UPDATE friendships SET status = 'declined', updated_at = ?
       WHERE status = 'pending' AND ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))`,
    )
    .run(Date.now(), targetId, meId, meId, targetId);
  publishLive([meId, targetId], { type: "friends" });
  return getFriendsState(meId);
}

export function cancelOutgoing(meId: string, targetId: string) {
  getDb()
    .prepare(
      "DELETE FROM friendships WHERE status = 'pending' AND ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))",
    )
    .run(meId, targetId, targetId, meId);
  publishLive([meId, targetId], { type: "friends" });
  return getFriendsState(meId);
}

export function removeFriend(meId: string, targetId: string) {
  getDb()
    .prepare(
      "DELETE FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)",
    )
    .run(meId, targetId, targetId, meId);
  publishLive([meId, targetId], { type: "friends" });
  return getFriendsState(meId);
}

export function toggleFollow(meId: string, targetId: string) {
  const db = getDb();
  const existing = db
    .prepare("SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?")
    .get(meId, targetId);
  if (existing) {
    db.prepare("DELETE FROM follows WHERE follower_id = ? AND following_id = ?").run(meId, targetId);
  } else {
    db.prepare("INSERT OR IGNORE INTO follows (follower_id, following_id, created_at) VALUES (?, ?, ?)").run(
      meId,
      targetId,
      Date.now(),
    );
  }
  publishLive([meId], { type: "friends" });
  return getFriendsState(meId);
}

export type ProfileDTO = UserDTO & {
  username?: string;
  birthday?: string;
  relationship?: string;
  counts: { friends: number; groups: number; photos: number; videos: number; posts: number };
};

export function getProfile(meId: string, userId: string): ProfileDTO | null {
  const row = findUserById(userId);
  if (!row) return null;
  const dto = userDTO(row)!;
  const db = getDb();
  const friendCount = db
    .prepare(
      `SELECT COUNT(*) AS n FROM friendships WHERE status = 'accepted' AND (requester_id = ? OR addressee_id = ?)`,
    )
    .get(userId, userId) as { n: number };
  const groupCount = db
    .prepare("SELECT COUNT(*) AS n FROM group_members WHERE user_id = ?")
    .get(userId) as { n: number };
  const postCount = db
    .prepare("SELECT COUNT(*) AS n FROM posts WHERE author_id = ?")
    .get(userId) as { n: number };
  const photoCount = db
    .prepare("SELECT COUNT(*) AS n FROM photos WHERE user_id = ? AND url IS NOT NULL")
    .get(userId) as { n: number };
  const videoCount = db
    .prepare("SELECT COUNT(*) AS n FROM videos WHERE user_id = ?")
    .get(userId) as { n: number };
  return {
    ...dto,
    username: row.username ?? undefined,
    birthday: row.birthday || undefined,
    relationship: row.relationship || undefined,
    counts: {
      friends: Number(friendCount.n),
      groups: Number(groupCount.n),
      photos: Number(photoCount.n),
      videos: Number(videoCount.n),
      posts: Number(postCount.n),
    },
  };
}

export function updateProfile(
  meId: string,
  patch: {
    name?: string;
    status?: string;
    about?: string;
    city?: string;
    birthday?: string;
    relationship?: string;
    photo?: string | null;
    cover?: string | null;
  },
) {
  const db = getDb();
  const current = findUserById(meId);
  if (!current) return null;
  db.prepare(
    `UPDATE users SET
      name = ?, status = ?, about = ?, city = ?, birthday = ?, relationship = ?,
      photo_url = ?, cover_url = ?, avatar = ?
     WHERE id = ?`,
  ).run(
    patch.name?.trim() || current.name,
    patch.status ?? current.status,
    patch.about ?? current.about,
    patch.city ?? current.city,
    patch.birthday ?? current.birthday,
    patch.relationship ?? current.relationship,
    patch.photo === null ? null : patch.photo ?? current.photo_url,
    patch.cover === null ? null : patch.cover ?? current.cover_url,
    (patch.name?.trim() || current.name)
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || current.avatar,
    meId,
  );
  publishLive([meId], { type: "presence" });
  return getProfile(meId, meId);
}

export function onlineFriends(meId: string) {
  const ids = friendIds(meId);
  if (!ids.length) return [];
  const users = usersByIds(ids);
  return Array.from(users.values()).filter((u) => u.online);
}

export function safeUser(id: string): UserRow | null {
  return findUserById(id);
}

export type PrivacySettings = {
  wall: "friends" | "close" | "only_me";
  messages: "friends" | "close" | "nobody";
  calls: "friends" | "close";
  searchable: boolean;
  showOnline: boolean;
};

export function getSettings(meId: string) {
  const row = findUserById(meId);
  if (!row) throw new Error("user_not_found");
  return {
    privacy: {
      wall: (row.privacy_wall || "friends") as PrivacySettings["wall"],
      messages: (row.privacy_messages || "friends") as PrivacySettings["messages"],
      calls: (row.privacy_calls || "friends") as PrivacySettings["calls"],
      searchable: Number(row.searchable ?? 1) !== 0,
      showOnline: Number(row.show_online ?? 1) !== 0,
    },
    invites: listInvites(meId),
  };
}

export function updateSettings(meId: string, patch: Partial<PrivacySettings>) {
  const db = getDb();
  const current = getSettings(meId).privacy;
  const next = {
    wall: patch.wall ?? current.wall,
    messages: patch.messages ?? current.messages,
    calls: patch.calls ?? current.calls,
    searchable: patch.searchable ?? current.searchable,
    showOnline: patch.showOnline ?? current.showOnline,
  };
  db.prepare(
    `UPDATE users SET privacy_wall = ?, privacy_messages = ?, privacy_calls = ?,
      searchable = ?, show_online = ? WHERE id = ?`,
  ).run(
    next.wall,
    next.messages,
    next.calls,
    next.searchable ? 1 : 0,
    next.showOnline ? 1 : 0,
    meId,
  );
  return getSettings(meId);
}

export type InviteDTO = {
  code: string;
  note: string;
  usesLeft: number;
  createdAt: number;
};

export function listInvites(meId: string): InviteDTO[] {
  const rows = getDb()
    .prepare("SELECT * FROM invites WHERE created_by = ? ORDER BY created_at DESC LIMIT 50")
    .all(meId) as Row[];
  return rows.map((row) => ({
    code: String(row.code),
    note: String(row.note ?? ""),
    usesLeft: Number(row.uses_left ?? 0),
    createdAt: Number(row.created_at ?? 0),
  }));
}

export function createInvite(meId: string, note = "") {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 10; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  getDb()
    .prepare(
      "INSERT INTO invites (code, created_by, note, uses_left, created_at) VALUES (?, ?, ?, 1, ?)",
    )
    .run(code, meId, note || "Приглашение в Friends", Date.now());
  return { invite: { code, note: note || "Приглашение в Friends", usesLeft: 1, createdAt: Date.now() }, invites: listInvites(meId) };
}

export function consumeInvite(code: string) {
  const row = getDb()
    .prepare("SELECT * FROM invites WHERE code = ?")
    .get(code.trim().toUpperCase()) as Row | undefined;
  if (!row || Number(row.uses_left) <= 0) return false;
  getDb()
    .prepare("UPDATE invites SET uses_left = uses_left - 1 WHERE code = ?")
    .run(String(row.code));
  return true;
}

export function areFriends(a: string, b: string) {
  const row = getDb()
    .prepare(
      `SELECT 1 FROM friendships WHERE status = 'accepted' AND
        ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))`,
    )
    .get(a, b, b, a);
  return Boolean(row);
}
