import { getDb, uid, type Row } from "./db";
import { friendIds } from "./social";
import { userDTO } from "./shared";

export type StoryDTO = {
  id: string;
  url: string;
  caption: string;
  createdAt: number;
  user: ReturnType<typeof userDTO>;
};

export function listStories(meId: string): StoryDTO[] {
  const ids = [meId, ...friendIds(meId)];
  const placeholders = ids.map(() => "?").join(",");
  const rows = getDb()
    .prepare(
      `SELECT s.*, u.name AS a_name, u.avatar AS a_avatar, u.photo_url AS a_photo,
              u.cover_url AS a_cover, u.status AS a_status, u.online AS a_online,
              u.last_seen AS a_last_seen, u.is_demo AS a_demo, u.city AS a_city, u.about AS a_about
       FROM stories s JOIN users u ON u.id = s.user_id
       WHERE s.user_id IN (${placeholders}) AND s.expires_at > ?
       ORDER BY s.created_at ASC`,
    )
    .all(...ids, Date.now()) as Row[];
  return rows.map((row) => ({
    id: String(row.id),
    url: String(row.url),
    caption: String(row.caption ?? ""),
    createdAt: Number(row.created_at),
    user: userDTO({
      id: row.user_id,
      name: row.a_name,
      avatar: row.a_avatar,
      photo_url: row.a_photo,
      cover_url: row.a_cover,
      status: row.a_status,
      online: row.a_online,
      last_seen: row.a_last_seen,
      is_demo: row.a_demo,
      city: row.a_city,
      about: row.a_about,
    }),
  }));
}

export function addStory(meId: string, url: string, caption = "") {
  const now = Date.now();
  getDb()
    .prepare(
      "INSERT INTO stories (id, user_id, url, caption, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(uid("st"), meId, url, caption, now, now + 24 * 60 * 60 * 1000);
  return listStories(meId);
}

export function deleteStory(meId: string, id: string) {
  getDb().prepare("DELETE FROM stories WHERE id = ? AND user_id = ?").run(id, meId);
  return listStories(meId);
}
