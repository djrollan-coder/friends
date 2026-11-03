import { getDb, uid, type Row } from "./db";
import { findUserById } from "./auth";
import { publishLive } from "./events";
import { formatWhen, userDTO, usersByIds, type ChatDTO, type MessageDTO, type UserDTO } from "./shared";
import { areFriends, notify } from "./social";

function membersOf(chatId: string) {
  const rows = getDb()
    .prepare("SELECT user_id, last_read_at FROM chat_members WHERE chat_id = ?")
    .all(chatId) as Array<{ user_id: string; last_read_at: number }>;
  return rows;
}

function messagesOf(chatId: string): MessageDTO[] {
  const rows = getDb()
    .prepare("SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC LIMIT 500")
    .all(chatId) as Row[];
  return rows.map((row) => {
    const ts = Number(row.created_at);
    return {
      id: String(row.id),
      authorId: String(row.author_id),
      text: String(row.text),
      createdAt: formatWhen(ts),
      createdAtIso: new Date(ts).toISOString(),
      silent: Boolean(row.silent) || undefined,
    };
  });
}

function buildChat(row: Row, meId: string): ChatDTO {
  const chatId = String(row.id);
  const members = membersOf(chatId);
  const memberIds = members.map((m) => m.user_id);
  const myMembership = members.find((m) => m.user_id === meId);
  const users = usersByIds(memberIds);
  const messages = messagesOf(chatId);
  const unread = messages.filter(
    (m) =>
      m.authorId !== meId &&
      new Date(m.createdAtIso).getTime() > (myMembership?.last_read_at ?? 0),
  ).length;
  const type = row.type === "group" ? "group" : "dm";
  const peerId = type === "dm" ? memberIds.find((id) => id !== meId) : undefined;
  const peer = peerId ? users.get(peerId) ?? userDTO(findUserById(peerId)) : null;
  return {
    id: chatId,
    type,
    title: type === "group" ? String(row.title || "Чат") : peer?.name ?? "Диалог",
    memberIds,
    messages,
    unread,
    peer,
    members: memberIds.map((id) => users.get(id)).filter((u): u is UserDTO => Boolean(u)),
  };
}

export function listChats(meId: string): ChatDTO[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT c.* FROM chats c
       JOIN chat_members cm ON cm.chat_id = c.id
       WHERE cm.user_id = ?
       ORDER BY c.created_at DESC`,
    )
    .all(meId) as Row[];
  const chats = rows.map((row) => buildChat(row, meId));
  chats.sort((a, b) => {
    const at = a.messages[a.messages.length - 1]?.createdAtIso ?? "";
    const bt = b.messages[b.messages.length - 1]?.createdAtIso ?? "";
    return bt.localeCompare(at);
  });
  return chats;
}

export function findChat(meId: string, chatId: string): ChatDTO | null {
  const db = getDb();
  const membership = db
    .prepare("SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?")
    .get(chatId, meId);
  if (!membership) return null;
  const row = db.prepare("SELECT * FROM chats WHERE id = ?").get(chatId) as Row | undefined;
  if (!row) return null;
  return buildChat(row, meId);
}

export function getChat(meId: string, chatId: string, markRead = true): ChatDTO | null {
  const chat = findChat(meId, chatId);
  if (!chat) return null;
  if (markRead && chat.unread > 0) {
    getDb()
      .prepare("UPDATE chat_members SET last_read_at = ? WHERE chat_id = ? AND user_id = ?")
      .run(Date.now(), chatId, meId);
    chat.unread = 0;
    publishLive([meId], { type: "message", chatId, read: true });
  }
  return chat;
}

export function ensureDm(meId: string, peerId: string) {
  const db = getDb();
  if (meId === peerId) throw new Error("self_dm");
  const existing = db
    .prepare(
      `SELECT c.id FROM chats c
       JOIN chat_members a ON a.chat_id = c.id AND a.user_id = ?
       JOIN chat_members b ON b.chat_id = c.id AND b.user_id = ?
       WHERE c.type = 'dm'
       LIMIT 1`,
    )
    .get(meId, peerId) as { id: string } | undefined;
  if (existing) {
    return { chats: listChats(meId), thread: getChat(meId, existing.id) };
  }
  const peer = findUserById(peerId);
  if (!peer) throw new Error("user_not_found");
  if (peer.privacy_messages === "nobody") throw new Error("messages_disabled");
  if (peer.privacy_messages !== "public" && !areFriends(meId, peerId)) {
    throw new Error("messages_friends_only");
  }
  const id = uid("dm");
  const now = Date.now();
  db.prepare("INSERT INTO chats (id, type, title, owner_id, created_at) VALUES (?, 'dm', '', ?, ?)").run(
    id,
    meId,
    now,
  );
  db.prepare(
    "INSERT INTO chat_members (chat_id, user_id, last_read_at, created_at) VALUES (?, ?, ?, ?)",
  ).run(id, meId, now, now);
  db.prepare(
    "INSERT INTO chat_members (chat_id, user_id, last_read_at, created_at) VALUES (?, ?, ?, ?)",
  ).run(id, peerId, now, now);
  publishLive([meId, peerId], { type: "message", chatId: id });
  return { chats: listChats(meId), thread: findChat(meId, id) };
}

export function createGroupChat(meId: string, title: string, memberIds: string[]) {
  const db = getDb();
  const id = uid("gc");
  const now = Date.now();
  const unique = Array.from(new Set([meId, ...memberIds.filter((mid) => mid !== meId)]));
  const chatTitle = title.trim() || "Новый чат";
  db.prepare(
    "INSERT INTO chats (id, type, title, owner_id, created_at) VALUES (?, 'group', ?, ?, ?)",
  ).run(id, chatTitle, meId, now);
  const insertMember = db.prepare(
    "INSERT OR IGNORE INTO chat_members (chat_id, user_id, last_read_at, created_at) VALUES (?, ?, ?, ?)",
  );
  for (const uidValue of unique) insertMember.run(id, uidValue, now, now);
  db.prepare(
    "INSERT INTO messages (id, chat_id, author_id, text, silent, created_at) VALUES (?, ?, ?, ?, 0, ?)",
  ).run(uid("msg"), id, meId, "Чат создан", now);
  publishLive(unique, { type: "message", chatId: id });
  const me = findUserById(meId);
  for (const member of unique) {
    if (member === meId) continue;
    notify({
      userId: member,
      type: "group",
      title: "Групповой чат",
      body: `${me?.name ?? "Пользователь"} создал(а) чат «${chatTitle}»`,
      href: `/messages/${id}`,
    });
  }
  return { chats: listChats(meId), thread: getChat(meId, id) };
}

export function sendMessage(
  meId: string,
  chatId: string,
  text: string,
  opts?: { silent?: boolean },
) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("empty_message");
  const db = getDb();
  const membership = db
    .prepare("SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?")
    .get(chatId, meId);
  if (!membership) throw new Error("chat_not_found");
  const now = Date.now();
  const id = uid("msg");
  db.prepare(
    "INSERT INTO messages (id, chat_id, author_id, text, silent, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(id, chatId, meId, trimmed, opts?.silent ? 1 : 0, now);
  db.prepare("UPDATE chat_members SET last_read_at = ? WHERE chat_id = ? AND user_id = ?").run(
    now,
    chatId,
    meId,
  );
  const members = membersOf(chatId).map((m) => m.user_id);
  publishLive(members, { type: "message", chatId });
  const me = findUserById(meId);
  for (const member of members) {
    if (member === meId) continue;
    notify({
      userId: member,
      type: "message",
      title: "Новое сообщение",
      body: `${me?.name ?? "Пользователь"}: ${trimmed.slice(0, 100)}`,
      href: `/messages/${chatId}`,
    });
  }
  return findChat(meId, chatId);
}

export function clearChat(meId: string, chatId: string) {
  const db = getDb();
  const membership = db
    .prepare("SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?")
    .get(chatId, meId);
  if (!membership) throw new Error("chat_not_found");
  db.prepare("DELETE FROM messages WHERE chat_id = ?").run(chatId);
  publishLive(membersOf(chatId).map((m) => m.user_id), { type: "message", chatId });
  return findChat(meId, chatId);
}

export function deleteChat(meId: string, chatId: string) {
  const db = getDb();
  const membership = db
    .prepare("SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?")
    .get(chatId, meId);
  if (!membership) throw new Error("chat_not_found");
  const members = membersOf(chatId).map((m) => m.user_id);
  db.prepare("DELETE FROM chat_members WHERE chat_id = ? AND user_id = ?").run(chatId, meId);
  const left = membersOf(chatId);
  if (!left.length) {
    db.prepare("DELETE FROM chats WHERE id = ?").run(chatId);
  }
  publishLive(members, { type: "message", chatId, deleted: true });
  return listChats(meId);
}

export function addChatMembers(meId: string, chatId: string, userIds: string[]) {
  const db = getDb();
  const membership = db
    .prepare("SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?")
    .get(chatId, meId);
  if (!membership) throw new Error("chat_not_found");
  const now = Date.now();
  const insert = db.prepare(
    "INSERT OR IGNORE INTO chat_members (chat_id, user_id, last_read_at, created_at) VALUES (?, ?, ?, ?)",
  );
  for (const id of userIds) insert.run(chatId, id, now, now);
  publishLive(membersOf(chatId).map((m) => m.user_id), { type: "message", chatId });
  return findChat(meId, chatId);
}

export function totalUnread(meId: string) {
  return listChats(meId).reduce((sum, chat) => sum + chat.unread, 0);
}
