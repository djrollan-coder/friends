import { getDb, uid, type Row } from "./db";
import { publishLive } from "./events";
import type { GroupDTO } from "./shared";

export function listGroups(): GroupDTO[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM groups ORDER BY created_at ASC").all() as Row[];
  const memberRows = db
    .prepare("SELECT group_id, user_id FROM group_members")
    .all() as Array<{ group_id: string; user_id: string }>;
  const members = new Map<string, string[]>();
  for (const row of memberRows) {
    const list = members.get(row.group_id) ?? [];
    list.push(row.user_id);
    members.set(row.group_id, list);
  }
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    desc: String(row.description ?? ""),
    privacy: row.privacy === "private" ? "private" : "public",
    ownerId: String(row.owner_id),
    memberIds: members.get(String(row.id)) ?? [],
    cover: String(row.cover ?? "GR"),
    createdAt: Number(row.created_at),
  }));
}

export function getGroup(id: string): GroupDTO | null {
  return listGroups().find((g) => g.id === id) ?? null;
}

export function createGroup(
  meId: string,
  input: { name?: string; desc?: string; privacy?: "public" | "private" },
) {
  const db = getDb();
  const id = uid("g");
  const now = Date.now();
  const name = input.name?.trim() || "Новое сообщество";
  db.prepare(
    `INSERT INTO groups (id, name, description, privacy, owner_id, cover, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    name,
    input.desc?.trim() || "Без описания",
    input.privacy === "private" ? "private" : "public",
    meId,
    name.slice(0, 2).toUpperCase(),
    now,
  );
  db.prepare(
    "INSERT INTO group_members (group_id, user_id, role, created_at) VALUES (?, ?, 'owner', ?)",
  ).run(id, meId, now);
  publishLive(null, { type: "group" });
  return { groups: listGroups(), group: getGroup(id) };
}

export function joinGroup(meId: string, groupId: string) {
  const db = getDb();
  const group = getGroup(groupId);
  if (!group) throw new Error("group_not_found");
  db.prepare(
    "INSERT OR IGNORE INTO group_members (group_id, user_id, role, created_at) VALUES (?, ?, 'member', ?)",
  ).run(groupId, meId, Date.now());
  publishLive(null, { type: "group", groupId });
  return listGroups();
}

export function leaveGroup(meId: string, groupId: string) {
  const db = getDb();
  const group = getGroup(groupId);
  if (!group) throw new Error("group_not_found");
  if (group.ownerId === meId) {
    throw new Error("owner_cannot_leave");
  }
  db.prepare("DELETE FROM group_members WHERE group_id = ? AND user_id = ?").run(groupId, meId);
  publishLive(null, { type: "group", groupId });
  return listGroups();
}

export function updateGroupPrivacy(meId: string, groupId: string, privacy: "public" | "private") {
  const db = getDb();
  const group = getGroup(groupId);
  if (!group) throw new Error("group_not_found");
  if (group.ownerId !== meId) throw new Error("not_owner");
  db.prepare("UPDATE groups SET privacy = ? WHERE id = ?").run(privacy, groupId);
  publishLive(null, { type: "group", groupId });
  return getGroup(groupId);
}

export function deleteGroup(meId: string, groupId: string) {
  const db = getDb();
  const group = getGroup(groupId);
  if (!group) return false;
  if (group.ownerId !== meId) return false;
  db.prepare("DELETE FROM groups WHERE id = ?").run(groupId);
  publishLive(null, { type: "group" });
  return true;
}
