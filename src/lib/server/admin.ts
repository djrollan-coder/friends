import { getDb, uid, type Row } from "./db";
import { isOnline, type UserRow } from "./auth";
import { publishLive } from "./events";
import { formatWhen } from "./shared";
import { notify } from "./social";
import { getAppSettings, updateAppSettings, type AppSettings } from "./appSettings";

const ONLINE_MS = 2 * 60 * 1000;

function count(sql: string, ...params: Array<string | number>) {
  const row = getDb().prepare(sql).get(...params) as { n: number } | undefined;
  return Number(row?.n ?? 0);
}

function dayStart(offset: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.getTime();
}

export type AdminOverview = {
  counts: {
    users: number;
    realUsers: number;
    online: number;
    posts: number;
    pendingPosts: number;
    groups: number;
    messages: number;
    openReports: number;
  };
  chart: Array<{ label: string; date: string; users: number; posts: number }>;
  newUsers7d: number;
  newPosts7d: number;
  activity: Array<{
    id: string;
    type: "user" | "post" | "message" | "report";
    title: string;
    detail: string;
    time: string;
    href: string;
  }>;
};

export function getAdminOverview(): AdminOverview {
  const db = getDb();
  const users = count("SELECT COUNT(*) AS n FROM users");
  const realUsers = count("SELECT COUNT(*) AS n FROM users WHERE is_demo = 0");
  const online = count(
    "SELECT COUNT(*) AS n FROM users WHERE banned = 0 AND ((is_demo = 1 AND online = 1) OR (is_demo = 0 AND last_seen > ?))",
    Date.now() - ONLINE_MS,
  );
  const posts = count("SELECT COUNT(*) AS n FROM posts");
  const pendingPosts = count("SELECT COUNT(*) AS n FROM posts WHERE status = 'pending'");
  const groups = count("SELECT COUNT(*) AS n FROM groups");
  const messages = count("SELECT COUNT(*) AS n FROM messages");
  const openReports = count("SELECT COUNT(*) AS n FROM reports WHERE status = 'open'");

  const chart: AdminOverview["chart"] = [];
  let newUsers7d = 0;
  let newPosts7d = 0;
  for (let offset = -6; offset <= 0; offset += 1) {
    const start = dayStart(offset);
    const end = dayStart(offset + 1);
    const dayUsers = count(
      "SELECT COUNT(*) AS n FROM users WHERE is_demo = 0 AND created_at >= ? AND created_at < ?",
      start,
      end,
    );
    const dayPosts = count(
      "SELECT COUNT(*) AS n FROM posts WHERE created_at >= ? AND created_at < ?",
      start,
      end,
    );
    newUsers7d += dayUsers;
    newPosts7d += dayPosts;
    chart.push({
      label: new Date(start).toLocaleDateString("ru-RU", { weekday: "short" }),
      date: new Date(start).toISOString(),
      users: dayUsers,
      posts: dayPosts,
    });
  }

  const activity: AdminOverview["activity"] = [];
  const recentUsers = db
    .prepare("SELECT * FROM users WHERE is_demo = 0 ORDER BY created_at DESC LIMIT 5")
    .all() as Row[];
  for (const row of recentUsers) {
    activity.push({
      id: `u_${row.id}`,
      type: "user",
      title: "Новый пользователь",
      detail: String(row.name),
      time: formatWhen(Number(row.created_at)),
      href: "/manage",
    });
  }
  const recentPosts = db
    .prepare(
      `SELECT p.*, u.name AS author_name FROM posts p JOIN users u ON u.id = p.author_id
       ORDER BY p.created_at DESC LIMIT 5`,
    )
    .all() as Row[];
  for (const row of recentPosts) {
    activity.push({
      id: `p_${row.id}`,
      type: "post",
      title: String(row.status) === "pending" ? "Публикация на модерации" : "Публикация опубликована",
      detail: `${row.author_name}: ${String(row.text ?? "").slice(0, 80)}`,
      time: formatWhen(Number(row.created_at)),
      href: String(row.group_id) ? `/groups/${row.group_id}` : "/feed",
    });
  }
  const recentReports = db
    .prepare("SELECT * FROM reports ORDER BY created_at DESC LIMIT 4")
    .all() as Row[];
  for (const row of recentReports) {
    activity.push({
      id: `r_${row.id}`,
      type: "report",
      title: "Жалоба на контент",
      detail: String(row.reason || "Без причины"),
      time: formatWhen(Number(row.created_at)),
      href: "/manage?tab=security",
    });
  }
  activity.sort((a, b) => (a.time < b.time ? 1 : -1));

  return {
    counts: { users, realUsers, online, posts, pendingPosts, groups, messages, openReports },
    chart,
    newUsers7d,
    newPosts7d,
    activity: activity.slice(0, 8),
  };
}

export type AdminUser = {
  id: string;
  name: string;
  email: string | null;
  username: string | null;
  method: string;
  avatar: string;
  isAdmin: boolean;
  banned: boolean;
  isDemo: boolean;
  online: boolean;
  createdAt: number;
  createdAtLabel: string;
  lastSeen: number;
  lastSeenLabel: string;
  posts: number;
};

function toAdminUser(row: Row): AdminUser {
  const user = row as unknown as UserRow;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    method: user.method,
    avatar: user.avatar,
    isAdmin: Number(user.is_admin) !== 0,
    banned: Number(user.banned) !== 0,
    isDemo: Number(user.is_demo) !== 0,
    online: isOnline(user),
    createdAt: Number(user.created_at),
    createdAtLabel: formatWhen(Number(user.created_at)),
    lastSeen: Number(user.last_seen),
    lastSeenLabel: formatWhen(Number(user.last_seen)),
    posts: count("SELECT COUNT(*) AS n FROM posts WHERE author_id = ?", user.id),
  };
}

export function listAdminUsers(query = ""): AdminUser[] {
  const db = getDb();
  const needle = query.trim().toLowerCase();
  const rows = needle
    ? (db
        .prepare(
          `SELECT * FROM users
           WHERE lower(name) LIKE ? OR lower(email) LIKE ? OR lower(username) LIKE ?
           ORDER BY created_at DESC LIMIT 100`,
        )
        .all(`%${needle}%`, `%${needle}%`, `%${needle}%`) as Row[])
    : (db.prepare("SELECT * FROM users ORDER BY created_at DESC LIMIT 100").all() as Row[]);
  return rows.map(toAdminUser);
}

export function adminUserAction(actorId: string, targetId: string, action: string) {
  const db = getDb();
  const target = db.prepare("SELECT * FROM users WHERE id = ?").get(targetId) as Row | undefined;
  if (!target) throw new Error("user_not_found");
  const isDemo = Number(target.is_demo) !== 0;

  if (action === "ban") {
    if (targetId === actorId) throw new Error("cannot_ban_self");
    if (Number(target.is_admin) !== 0) {
      const activeAdmins = count(
        "SELECT COUNT(*) AS n FROM users WHERE is_admin = 1 AND banned = 0",
      );
      if (activeAdmins <= 1) throw new Error("last_admin");
    }
    db.prepare("UPDATE users SET banned = 1 WHERE id = ?").run(targetId);
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(targetId);
  } else if (action === "unban") {
    db.prepare("UPDATE users SET banned = 0 WHERE id = ?").run(targetId);
  } else if (action === "makeAdmin") {
    db.prepare("UPDATE users SET is_admin = 1 WHERE id = ?").run(targetId);
  } else if (action === "removeAdmin") {
    if (targetId === actorId) throw new Error("cannot_demote_self");
    const admins = count("SELECT COUNT(*) AS n FROM users WHERE is_admin = 1 AND banned = 0");
    if (admins <= 1) throw new Error("last_admin");
    db.prepare("UPDATE users SET is_admin = 0 WHERE id = ?").run(targetId);
  } else if (action === "delete") {
    if (targetId === actorId) throw new Error("cannot_delete_self");
    if (isDemo) throw new Error("cannot_delete_demo");
    db.prepare("DELETE FROM users WHERE id = ?").run(targetId);
    db.prepare(
      "DELETE FROM chats WHERE id NOT IN (SELECT DISTINCT chat_id FROM chat_members)",
    ).run();
  } else {
    throw new Error("unknown_action");
  }

  if (action === "ban") {
    notify({
      userId: actorId,
      type: "group",
      title: "Пользователь заблокирован",
      body: String(target.name),
      href: "/manage",
    });
  }
  publishLive([targetId], { type: "presence" });
  return { users: listAdminUsers(), overview: getAdminOverview() };
}

export type AdminPost = {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  groupId?: string;
  status: "published" | "pending";
  createdAt: number;
  createdAtLabel: string;
  likes: number;
  comments: number;
};

export function listAdminPosts(query = "", status = "all"): AdminPost[] {
  const db = getDb();
  const filters: string[] = [];
  const params: Array<string | number> = [];
  if (query.trim()) {
    filters.push("(lower(p.text) LIKE ? OR lower(u.name) LIKE ?)");
    const like = `%${query.trim().toLowerCase()}%`;
    params.push(like, like);
  }
  if (status === "pending" || status === "published") {
    filters.push("p.status = ?");
    params.push(status);
  }
  const rows = db
    .prepare(
      `SELECT p.*, u.name AS author_name,
         (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count,
         (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count
       FROM posts p JOIN users u ON u.id = p.author_id
       ${filters.length ? `WHERE ${filters.join(" AND ")}` : ""}
       ORDER BY p.created_at DESC LIMIT 100`,
    )
    .all(...params) as Row[];
  return rows.map((row) => ({
    id: String(row.id),
    text: String(row.text ?? ""),
    authorId: String(row.author_id),
    authorName: String(row.author_name),
    groupId: (row.group_id as string) ?? undefined,
    status: row.status === "pending" ? "pending" : "published",
    createdAt: Number(row.created_at),
    createdAtLabel: formatWhen(Number(row.created_at)),
    likes: Number(row.like_count ?? 0),
    comments: Number(row.comment_count ?? 0),
  }));
}

export function adminPostAction(postId: string, action: string) {
  const db = getDb();
  if (action === "publish") {
    db.prepare("UPDATE posts SET status = 'published' WHERE id = ?").run(postId);
  } else if (action === "delete") {
    db.prepare("DELETE FROM posts WHERE id = ?").run(postId);
  } else {
    throw new Error("unknown_action");
  }
  publishLive(null, { type: "post" });
  return { posts: listAdminPosts(), overview: getAdminOverview() };
}

export type AdminGroup = {
  id: string;
  name: string;
  privacy: string;
  ownerName: string;
  members: number;
  posts: number;
  createdAtLabel: string;
};

export function listAdminGroups(): AdminGroup[] {
  const rows = getDb()
    .prepare(
      `SELECT g.*, u.name AS owner_name,
         (SELECT COUNT(*) FROM group_members m WHERE m.group_id = g.id) AS members,
         (SELECT COUNT(*) FROM posts p WHERE p.group_id = g.id) AS posts
       FROM groups g JOIN users u ON u.id = g.owner_id
       ORDER BY g.created_at DESC LIMIT 100`,
    )
    .all() as Row[];
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    privacy: String(row.privacy),
    ownerName: String(row.owner_name),
    members: Number(row.members ?? 0),
    posts: Number(row.posts ?? 0),
    createdAtLabel: formatWhen(Number(row.created_at)),
  }));
}

export function adminDeleteGroup(groupId: string) {
  getDb().prepare("DELETE FROM groups WHERE id = ?").run(groupId);
  publishLive(null, { type: "group" });
  return { groups: listAdminGroups(), overview: getAdminOverview() };
}

export type AdminReport = {
  id: string;
  targetType: string;
  targetId: string;
  targetPreview: string;
  reason: string;
  status: string;
  reporterName: string;
  createdAtLabel: string;
};

export function listReports(): AdminReport[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT r.*, u.name AS reporter_name FROM reports r
       JOIN users u ON u.id = r.reporter_id
       ORDER BY CASE WHEN r.status = 'open' THEN 0 ELSE 1 END, r.created_at DESC LIMIT 100`,
    )
    .all() as Row[];
  return rows.map((row) => {
    let preview = "";
    if (row.target_type === "post") {
      const post = db.prepare("SELECT text FROM posts WHERE id = ?").get(String(row.target_id)) as
        | { text: string }
        | undefined;
      preview = post?.text?.slice(0, 120) ?? "Публикация удалена";
    } else if (row.target_type === "user") {
      const user = db.prepare("SELECT name FROM users WHERE id = ?").get(String(row.target_id)) as
        | { name: string }
        | undefined;
      preview = user?.name ?? "Пользователь удалён";
    }
    return {
      id: String(row.id),
      targetType: String(row.target_type),
      targetId: String(row.target_id),
      targetPreview: preview,
      reason: String(row.reason ?? ""),
      status: String(row.status),
      reporterName: String(row.reporter_name),
      createdAtLabel: formatWhen(Number(row.created_at)),
    };
  });
}

export function createReport(
  reporterId: string,
  input: { targetType?: string; targetId?: string; reason?: string },
) {
  const targetType = input.targetType === "user" ? "user" : "post";
  const targetId = input.targetId?.trim() ?? "";
  if (!targetId) throw new Error("missing_target");
  const db = getDb();
  const table = targetType === "post" ? "posts" : "users";
  const exists = db.prepare(`SELECT 1 FROM ${table} WHERE id = ?`).get(targetId);
  if (!exists) throw new Error("target_not_found");
  const duplicate = db
    .prepare(
      "SELECT 1 FROM reports WHERE reporter_id = ? AND target_type = ? AND target_id = ? AND status = 'open'",
    )
    .get(reporterId, targetType, targetId);
  if (duplicate) throw new Error("already_reported");
  db.prepare(
    "INSERT INTO reports (id, reporter_id, target_type, target_id, reason, status, created_at) VALUES (?, ?, ?, ?, ?, 'open', ?)",
  ).run(uid("rp"), reporterId, targetType, targetId, (input.reason ?? "").slice(0, 300), Date.now());
  const admins = db.prepare("SELECT id FROM users WHERE is_admin = 1 AND banned = 0").all() as Array<{
    id: string;
  }>;
  for (const admin of admins) {
    notify({
      userId: admin.id,
      type: "comment",
      title: "Новая жалоба",
      body: `${targetType === "post" ? "Публикация" : "Пользователь"}: ${targetId}`,
      href: "/manage",
    });
  }
  return { ok: true };
}

export function adminReportAction(reportId: string, action: string) {
  const db = getDb();
  const report = db.prepare("SELECT * FROM reports WHERE id = ?").get(reportId) as Row | undefined;
  if (!report) throw new Error("report_not_found");
  if (action === "resolve") {
    db.prepare("UPDATE reports SET status = 'resolved' WHERE id = ?").run(reportId);
  } else if (action === "dismiss") {
    db.prepare("UPDATE reports SET status = 'dismissed' WHERE id = ?").run(reportId);
  } else if (action === "deleteTarget") {
    if (report.target_type === "post") {
      db.prepare("DELETE FROM posts WHERE id = ?").run(String(report.target_id));
    } else if (report.target_type === "user") {
      db.prepare("UPDATE users SET banned = 1 WHERE id = ?").run(String(report.target_id));
      db.prepare("DELETE FROM sessions WHERE user_id = ?").run(String(report.target_id));
    }
    db.prepare("UPDATE reports SET status = 'resolved' WHERE id = ?").run(reportId);
  } else {
    throw new Error("unknown_action");
  }
  publishLive(null, { type: "post" });
  return { reports: listReports(), overview: getAdminOverview() };
}

export function getAdminSettings(): AppSettings & { openReports: number } {
  return { ...getAppSettings(), openReports: count("SELECT COUNT(*) AS n FROM reports WHERE status = 'open'") };
}

export function adminUpdateSettings(patch: Partial<AppSettings>) {
  return updateAppSettings(patch);
}

export function exportAdminCsv(): string {
  const users = listAdminUsers();
  const overview = getAdminOverview();
  const lines = [
    "metric,value",
    `users,${overview.counts.users}`,
    `real_users,${overview.counts.realUsers}`,
    `online,${overview.counts.online}`,
    `posts,${overview.counts.posts}`,
    `pending_posts,${overview.counts.pendingPosts}`,
    `groups,${overview.counts.groups}`,
    `messages,${overview.counts.messages}`,
    `open_reports,${overview.counts.openReports}`,
    "",
    "id,name,email,method,admin,banned,demo,posts,created",
    ...users.map((user) =>
      [
        user.id,
        user.name,
        user.email ?? "",
        user.method,
        user.isAdmin ? "1" : "0",
        user.banned ? "1" : "0",
        user.isDemo ? "1" : "0",
        String(user.posts),
        new Date(user.createdAt).toISOString(),
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(","),
    ),
  ];
  return lines.join("\n");
}
