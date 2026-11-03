import { getDb, uid, type Row } from "./db";
import { formatWhen } from "./shared";

export type AlbumDTO = {
  id: string;
  title: string;
  count: number;
  cover: string;
  tone: string;
};

export type PhotoDTO = {
  id: string;
  albumId: string;
  title: string;
  tone: string;
  label: string;
  url?: string;
  createdAt: string;
  createdLabel: string;
  likes: number;
};

export type VideoDTO = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  createdLabel: string;
  duration: string;
  views: number;
  tone: string;
  cover: string;
  src?: string;
};

export function listAlbums(meId: string): AlbumDTO[] {
  const db = getDb();
  const albums = db
    .prepare("SELECT * FROM albums WHERE user_id = ? ORDER BY created_at ASC")
    .all(meId) as Row[];
  return albums.map((album) => {
    const count = db
      .prepare("SELECT COUNT(*) AS n FROM photos WHERE user_id = ? AND album_id = ?")
      .get(meId, String(album.id)) as { n: number };
    return {
      id: String(album.id),
      title: String(album.title),
      count: Number(count.n),
      cover: String(album.cover),
      tone: String(album.tone),
    };
  });
}

export function listPhotos(meId: string, albumId?: string): PhotoDTO[] {
  const db = getDb();
  const rows = albumId
    ? (db
        .prepare("SELECT * FROM photos WHERE user_id = ? AND album_id = ? ORDER BY created_at DESC")
        .all(meId, albumId) as Row[])
    : (db
        .prepare("SELECT * FROM photos WHERE user_id = ? ORDER BY created_at DESC")
        .all(meId) as Row[]);
  return rows.map((row) => {
    const ts = Number(row.created_at);
    return {
      id: String(row.id),
      albumId: String(row.album_id),
      title: String(row.title),
      tone: String(row.tone ?? ""),
      label: String(row.label ?? ""),
      url: (row.url as string) ?? undefined,
      createdAt: new Date(ts).toISOString(),
      createdLabel: formatWhen(ts),
      likes: Number(row.likes ?? 0),
    };
  });
}

export function addPhoto(
  meId: string,
  input: { albumId?: string; title?: string; url: string },
) {
  const db = getDb();
  const albumId =
    input.albumId ||
    (
      db
        .prepare(
          `SELECT id FROM albums WHERE user_id = ?
           ORDER BY CASE WHEN title = 'Мои фотографии' THEN 0 ELSE 1 END, created_at ASC
           LIMIT 1`,
        )
        .get(meId) as { id: string } | undefined
    )?.id;
  if (!albumId) throw new Error("album_not_found");
  const id = uid("ph");
  db.prepare(
    `INSERT INTO photos (id, user_id, album_id, title, url, tone, label, likes, created_at)
     VALUES (?, ?, ?, ?, ?, '', 'ФО', 0, ?)`,
  ).run(id, meId, albumId, input.title?.trim() || "Новое фото", input.url, Date.now());
  return listPhotos(meId);
}

export function createAlbum(meId: string, title: string) {
  const db = getDb();
  const clean = title.trim() || "Новый альбом";
  const id = uid("al");
  db.prepare(
    "INSERT INTO albums (id, user_id, title, cover, tone, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(
    id,
    meId,
    clean,
    clean.slice(0, 2).toUpperCase(),
    "linear-gradient(145deg, #8a6348, #3a2c24)",
    Date.now(),
  );
  return { albums: listAlbums(meId), albumId: id };
}

export function deletePhoto(meId: string, id: string) {
  getDb().prepare("DELETE FROM photos WHERE id = ? AND user_id = ?").run(id, meId);
  return listPhotos(meId);
}

export function likePhoto(meId: string, id: string) {
  getDb()
    .prepare("UPDATE photos SET likes = likes + 1 WHERE id = ? AND user_id = ?")
    .run(id, meId);
  return listPhotos(meId);
}

export function listVideos(meId: string): VideoDTO[] {
  const rows = getDb()
    .prepare("SELECT * FROM videos WHERE user_id = ? ORDER BY created_at DESC")
    .all(meId) as Row[];
  return rows.map((row) => {
    const ts = Number(row.created_at);
    return {
      id: String(row.id),
      title: String(row.title),
      description: String(row.description ?? ""),
      createdAt: new Date(ts).toISOString(),
      createdLabel: formatWhen(ts),
      duration: String(row.duration ?? "0:00"),
      views: Number(row.views ?? 0),
      tone: String(row.tone ?? ""),
      cover: String(row.cover ?? ""),
      src: (row.src as string) ?? undefined,
    };
  });
}

export function addVideo(
  meId: string,
  input: { title?: string; description?: string; src?: string; duration?: string },
) {
  const db = getDb();
  const title = input.title?.trim() || "Без названия";
  db.prepare(
    `INSERT INTO videos (id, user_id, title, description, src, duration, views, tone, cover, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
  ).run(
    uid("v"),
    meId,
    title,
    input.description?.trim() || "Добавлено вами",
    input.src ?? null,
    input.duration || "0:00",
    "linear-gradient(145deg, #8a6348, #3a2c24)",
    title
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "ВД",
    Date.now(),
  );
  return listVideos(meId);
}

export function deleteVideo(meId: string, id: string) {
  getDb().prepare("DELETE FROM videos WHERE id = ? AND user_id = ?").run(id, meId);
  return listVideos(meId);
}

export function bumpVideoViews(meId: string, id: string) {
  getDb()
    .prepare("UPDATE videos SET views = views + 1 WHERE id = ? AND user_id = ?")
    .run(id, meId);
  return listVideos(meId);
}
