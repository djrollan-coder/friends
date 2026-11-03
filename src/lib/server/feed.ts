import { getDb, uid, type Row } from "./db";
import { findUserById } from "./auth";
import { publishLive } from "./events";
import { formatWhen, userDTO, type PostDTO, type UserDTO } from "./shared";
import { notify } from "./social";

const VISIBILITY = `
  (
    (p.group_id IS NULL AND (
      p.author_id = (SELECT id FROM me)
      OR p.author_id IN (
        SELECT CASE WHEN requester_id = (SELECT id FROM me) THEN addressee_id ELSE requester_id END
        FROM friendships
        WHERE status = 'accepted'
          AND (requester_id = (SELECT id FROM me) OR addressee_id = (SELECT id FROM me))
      ) AND p.author_id IN (SELECT id FROM users WHERE privacy_wall <> 'only_me')
      OR p.author_id IN (
        SELECT f.following_id FROM follows f
        JOIN users u ON u.id = f.following_id
        WHERE f.follower_id = (SELECT id FROM me) AND u.privacy_wall = 'public'
      )
    ))
    OR p.group_id IN (SELECT group_id FROM group_members WHERE user_id = (SELECT id FROM me))
  )
`;

type FeedOptions = {
  authorId?: string;
  groupId?: string;
  limit?: number;
  query?: string;
};

function parseAttachment(value: unknown): PostDTO["attachment"] | undefined {
  if (typeof value !== "string" || !value) return undefined;
  try {
    const parsed = JSON.parse(value) as { name?: string; size?: string; type?: string };
    if (!parsed.name) return undefined;
    return {
      name: parsed.name,
      size: parsed.size ?? "",
      type: parsed.type === "photo" ? "photo" : "file",
    };
  } catch {
    return undefined;
  }
}

export function listFeed(meId: string, options: FeedOptions = {}): PostDTO[] {
  const db = getDb();
  const filters: string[] = [];
  const params: Array<string | number> = [meId];
  if (options.authorId) {
    filters.push("AND p.author_id = ?");
    params.push(options.authorId);
  }
  if (options.groupId) {
    filters.push("AND p.group_id = ?");
    params.push(options.groupId);
  }
  if (options.query) {
    filters.push("AND (lower(p.text) LIKE ? OR lower(u.name) LIKE ?)");
    const like = `%${options.query.toLowerCase()}%`;
    params.push(like, like);
  }
  const limit = Math.min(Math.max(options.limit ?? 60, 1), 200);
  params.push(limit);

  const rows = db
    .prepare(
      `WITH me AS (SELECT ? AS id)
       SELECT p.*,
         u.name AS a_name, u.avatar AS a_avatar, u.photo_url AS a_photo, u.cover_url AS a_cover,
         u.status AS a_status, u.online AS a_online, u.last_seen AS a_last_seen,
         u.is_demo AS a_demo, u.city AS a_city, u.about AS a_about,
         (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count,
         (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
         (SELECT COUNT(*) FROM posts r WHERE r.repost_of = p.id) AS repost_count,
         EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = (SELECT id FROM me)) AS liked,
         EXISTS(SELECT 1 FROM bookmarks b WHERE b.post_id = p.id AND b.user_id = (SELECT id FROM me)) AS marked
       FROM posts p
       JOIN users u ON u.id = p.author_id
       WHERE ${VISIBILITY} ${filters.join(" ")}
       ORDER BY p.created_at DESC
       LIMIT ?`,
    )
    .all(...params) as Row[];

  if (!rows.length) return [];

  const ids = rows.map((r) => String(r.id));
  const placeholders = ids.map(() => "?").join(",");
  const commentRows = db
    .prepare(
      `SELECT c.*, u.name AS a_name, u.avatar AS a_avatar, u.photo_url AS a_photo,
              u.cover_url AS a_cover, u.status AS a_status, u.online AS a_online,
              u.last_seen AS a_last_seen, u.is_demo AS a_demo, u.city AS a_city, u.about AS a_about
       FROM comments c JOIN users u ON u.id = c.author_id
       WHERE c.post_id IN (${placeholders})
       ORDER BY c.created_at ASC`,
    )
    .all(...ids) as Row[];

  const commentsByPost = new Map<string, PostDTO["commentList"]>();
  for (const row of commentRows) {
    const list = commentsByPost.get(String(row.post_id)) ?? [];
    const author = userDTO({
      id: row.author_id,
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
    });
    if (author) {
      list.push({
        id: String(row.id),
        author,
        text: String(row.text),
        createdAt: formatWhen(Number(row.created_at)),
        createdAtIso: new Date(Number(row.created_at)).toISOString(),
      });
    }
    commentsByPost.set(String(row.post_id), list);
  }

  return rows.map((row) => {
    const author = userDTO({
      id: row.author_id,
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
    }) as UserDTO;
    const ts = Number(row.created_at);
    return {
      id: String(row.id),
      author,
      text: String(row.text ?? ""),
      createdAt: formatWhen(ts),
      createdAtIso: new Date(ts).toISOString(),
      likes: Number(row.like_count ?? 0),
      comments: Number(row.comment_count ?? 0),
      reposts: Number(row.repost_count ?? 0),
      likedByMe: Boolean(row.liked),
      bookmarked: Boolean(row.marked),
      image: (row.image as string) ?? undefined,
      video: (row.video as string) ?? undefined,
      attachment: parseAttachment(row.attachment),
      commentList: commentsByPost.get(String(row.id)) ?? [],
      groupId: (row.group_id as string) ?? undefined,
    };
  });
}

export function getPost(meId: string, postId: string) {
  return listFeed(meId, { limit: 200 }).find((p) => p.id === postId) ?? null;
}

export function createPost(
  meId: string,
  input: { text?: string; image?: string; video?: string; groupId?: string; attachment?: unknown },
) {
  const text = (input.text ?? "").trim();
  if (!text && !input.image && !input.video) {
    throw new Error("empty_post");
  }
  const db = getDb();
  if (input.groupId) {
    const membership = db
      .prepare("SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?")
      .get(input.groupId, meId);
    if (!membership) throw new Error("not_a_member");
  }
  const id = uid("p");
  const now = Date.now();
  db.prepare(
    `INSERT INTO posts (id, author_id, group_id, text, image, video, attachment, repost_of, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
  ).run(
    id,
    meId,
    input.groupId ?? null,
    text,
    input.image ?? null,
    input.video ?? null,
    input.attachment ? JSON.stringify(input.attachment) : null,
    now,
  );
  publishLive(null, { type: "post", postId: id });
  return listFeed(meId, { limit: 60 }).find((p) => p.id === id) ?? null;
}

export function toggleLike(meId: string, postId: string) {
  const db = getDb();
  const exists = db
    .prepare("SELECT 1 FROM likes WHERE post_id = ? AND user_id = ?")
    .get(postId, meId);
  const post = db.prepare("SELECT author_id, text FROM posts WHERE id = ?").get(postId) as
    | Row
    | undefined;
  if (!post) throw new Error("post_not_found");

  if (exists) {
    db.prepare("DELETE FROM likes WHERE post_id = ? AND user_id = ?").run(postId, meId);
  } else {
    db.prepare("INSERT OR IGNORE INTO likes (post_id, user_id, created_at) VALUES (?, ?, ?)").run(
      postId,
      meId,
      Date.now(),
    );
    if (String(post.author_id) !== meId) {
      const me = findUserById(meId);
      notify({
        userId: String(post.author_id),
        type: "like",
        title: "Новая реакция",
        body: `${me?.name ?? "Пользователь"} оценил(а) вашу запись`,
        href: "/feed",
      });
    }
  }
  publishLive(null, { type: "post-updated", postId });
  return { liked: !exists };
}

export function addComment(meId: string, postId: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("empty_comment");
  const db = getDb();
  const post = db.prepare("SELECT author_id FROM posts WHERE id = ?").get(postId) as
    | Row
    | undefined;
  if (!post) throw new Error("post_not_found");
  const id = uid("c");
  const now = Date.now();
  db.prepare(
    "INSERT INTO comments (id, post_id, author_id, text, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(id, postId, meId, trimmed, now);
  if (String(post.author_id) !== meId) {
    const me = findUserById(meId);
    notify({
      userId: String(post.author_id),
      type: "comment",
      title: "Новый комментарий",
      body: `${me?.name ?? "Пользователь"}: ${trimmed.slice(0, 80)}`,
      href: "/feed",
    });
  }
  publishLive(null, { type: "post-updated", postId });
  return { id };
}

export function repost(meId: string, postId: string) {
  const db = getDb();
  const original = db.prepare("SELECT * FROM posts WHERE id = ?").get(postId) as Row | undefined;
  if (!original) throw new Error("post_not_found");
  const id = uid("p");
  const now = Date.now();
  const text = `Репост: ${String(original.text ?? "")}`.trim();
  db.prepare(
    `INSERT INTO posts (id, author_id, group_id, text, image, video, attachment, repost_of, created_at)
     VALUES (?, ?, NULL, ?, ?, ?, NULL, ?, ?)`,
  ).run(
    id,
    meId,
    text,
    (original.image as string) ?? null,
    (original.video as string) ?? null,
    postId,
    now,
  );
  if (String(original.author_id) !== meId) {
    const me = findUserById(meId);
    notify({
      userId: String(original.author_id),
      type: "repost",
      title: "Репост",
      body: `${me?.name ?? "Пользователь"} поделился вашей записью`,
      href: "/feed",
    });
  }
  publishLive(null, { type: "post" });
  return { id };
}

export function toggleBookmark(meId: string, postId: string) {
  const db = getDb();
  const exists = db
    .prepare("SELECT 1 FROM bookmarks WHERE post_id = ? AND user_id = ?")
    .get(postId, meId);
  if (exists) {
    db.prepare("DELETE FROM bookmarks WHERE post_id = ? AND user_id = ?").run(postId, meId);
  } else {
    db.prepare(
      "INSERT OR IGNORE INTO bookmarks (user_id, post_id, created_at) VALUES (?, ?, ?)",
    ).run(meId, postId, Date.now());
  }
  publishLive([meId], { type: "post-updated", postId });
  return { bookmarked: !exists };
}

export function listBookmarks(meId: string) {
  const ids = (
    getDb()
      .prepare("SELECT post_id FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC")
      .all(meId) as Array<{ post_id: string }>
  ).map((r) => r.post_id);
  if (!ids.length) return [];
  const feed = listFeed(meId, { limit: 200 });
  const map = new Map(feed.map((p) => [p.id, p]));
  return ids.map((id) => map.get(id)).filter(Boolean) as PostDTO[];
}

export function deletePost(meId: string, postId: string) {
  const db = getDb();
  const post = db.prepare("SELECT author_id FROM posts WHERE id = ?").get(postId) as
    | Row
    | undefined;
  if (!post) return false;
  if (String(post.author_id) !== meId) return false;
  db.prepare("DELETE FROM posts WHERE id = ?").run(postId);
  publishLive(null, { type: "post" });
  return true;
}
