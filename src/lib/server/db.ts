import { DatabaseSync } from "node:sqlite";
import { randomBytes, scryptSync } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Friends server database.
 *
 * Uses the SQLite implementation that ships with Node (node:sqlite), so there is
 * no native dependency to compile. The database lives in ./data (or
 * FRIENDS_DATA_DIR) and falls back to the OS temp directory on hosts where the
 * working directory is read-only (for example a serverless bundle).
 */

export type Row = Record<string, unknown>;

const globalStore = globalThis as typeof globalThis & {
  __friendsDb?: DatabaseSync;
  __friendsDbPath?: string;
  __friendsDataDir?: string;
  __friendsSeeded?: boolean;
};

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
  fs.accessSync(dir, fs.constants.W_OK);
}

function resolveDataDir() {
  const candidates = [
    process.env.FRIENDS_DATA_DIR,
    path.join(process.cwd(), "data"),
    path.join(os.tmpdir(), "friends-data"),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      ensureDir(candidate);
      ensureDir(path.join(candidate, "uploads"));
      return candidate;
    } catch {
      /* try the next location */
    }
  }
  throw new Error("friends_storage_unavailable");
}

export function dataDir() {
  return globalStore.__friendsDataDir ?? (globalStore.__friendsDataDir = resolveDataDir());
}

export function uploadDir() {
  const dir = path.join(dataDir(), "uploads");
  ensureDir(dir);
  return dir;
}

export function dbFile() {
  return globalStore.__friendsDbPath ?? path.join(dataDir(), "friends.db");
}

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  username      TEXT UNIQUE,
  email         TEXT UNIQUE,
  password_hash TEXT,
  avatar        TEXT NOT NULL DEFAULT 'F',
  photo_url     TEXT,
  cover_url     TEXT,
  status        TEXT NOT NULL DEFAULT '',
  about         TEXT NOT NULL DEFAULT '',
  city          TEXT NOT NULL DEFAULT '',
  birthday      TEXT NOT NULL DEFAULT '',
  relationship  TEXT NOT NULL DEFAULT '',
  method        TEXT NOT NULL DEFAULT 'email',
  privacy_wall     TEXT NOT NULL DEFAULT 'friends',
  privacy_messages TEXT NOT NULL DEFAULT 'friends',
  privacy_calls    TEXT NOT NULL DEFAULT 'friends',
  searchable    INTEGER NOT NULL DEFAULT 1,
  show_online   INTEGER NOT NULL DEFAULT 1,
  is_demo       INTEGER NOT NULL DEFAULT 0,
  is_admin      INTEGER NOT NULL DEFAULT 0,
  banned        INTEGER NOT NULL DEFAULT 0,
  online        INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL,
  last_seen     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id         TEXT PRIMARY KEY,
  author_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id   TEXT,
  text       TEXT NOT NULL DEFAULT '',
  image      TEXT,
  video      TEXT,
  attachment TEXT,
  repost_of  TEXT,
  status     TEXT NOT NULL DEFAULT 'published',
  comments_enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS posts_group ON posts(group_id);

CREATE TABLE IF NOT EXISTS likes (
  post_id    TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id         TEXT PRIMARY KEY,
  post_id    TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS comments_post ON comments(post_id);

CREATE TABLE IF NOT EXISTS bookmarks (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id    TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS friendships (
  requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending',
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL,
  PRIMARY KEY (requester_id, addressee_id)
);
CREATE INDEX IF NOT EXISTS friendships_addressee ON friendships(addressee_id);

CREATE TABLE IF NOT EXISTS follows (
  follower_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   INTEGER NOT NULL,
  PRIMARY KEY (follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS groups (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  privacy     TEXT NOT NULL DEFAULT 'public',
  owner_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cover       TEXT NOT NULL DEFAULT 'GR',
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id   TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member',
  created_at INTEGER NOT NULL,
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS chats (
  id         TEXT PRIMARY KEY,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL DEFAULT '',
  owner_id   TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_members (
  chat_id      TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL,
  PRIMARY KEY (chat_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id         TEXT PRIMARY KEY,
  chat_id    TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  author_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  silent     INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_chat ON messages(chat_id, created_at);

CREATE TABLE IF NOT EXISTS albums (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  cover      TEXT NOT NULL DEFAULT 'А',
  tone       TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS photos (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  album_id   TEXT NOT NULL,
  title      TEXT NOT NULL DEFAULT '',
  url        TEXT,
  tone       TEXT NOT NULL DEFAULT '',
  label      TEXT NOT NULL DEFAULT '',
  likes      INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS photos_user ON photos(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS videos (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  src         TEXT,
  duration    TEXT NOT NULL DEFAULT '0:00',
  views       INTEGER NOT NULL DEFAULT 0,
  tone        TEXT NOT NULL DEFAULT '',
  cover       TEXT NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS videos_user ON videos(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS listings (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price       INTEGER NOT NULL DEFAULT 0,
  image_url   TEXT,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS listings_created ON listings(created_at DESC);

CREATE TABLE IF NOT EXISTS stories (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  caption    TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS stories_user ON stories(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS documents (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  size       INTEGER NOT NULL DEFAULT 0,
  type       TEXT NOT NULL DEFAULT '',
  url        TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS documents_user ON documents(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS invites (
  code       TEXT PRIMARY KEY,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note       TEXT NOT NULL DEFAULT '',
  uses_left  INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id          TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id   TEXT NOT NULL,
  reason      TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'open',
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS reports_status ON reports(status, created_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  href       TEXT NOT NULL,
  read       INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS notifications_user ON notifications(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS tg_login_sessions (
  token      TEXT PRIMARY KEY,
  status     TEXT NOT NULL,
  user_json  TEXT,
  created_at INTEGER NOT NULL,
  claimed_at INTEGER
);

CREATE TABLE IF NOT EXISTS email_login_codes (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  code_hash   TEXT NOT NULL,
  magic_hash  TEXT NOT NULL,
  name        TEXT,
  purpose     TEXT NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL,
  consumed_at INTEGER
);
CREATE INDEX IF NOT EXISTS email_login_codes_email ON email_login_codes(email, created_at DESC);

CREATE TABLE IF NOT EXISTS auth_rate_limits (
  key          TEXT PRIMARY KEY,
  count        INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  summary     TEXT NOT NULL,
  urgency     TEXT NOT NULL DEFAULT 'normal',
  status      TEXT NOT NULL DEFAULT 'open',
  created_at  INTEGER NOT NULL,
  resolved_at INTEGER
);
CREATE INDEX IF NOT EXISTS support_tickets_status ON support_tickets(status, created_at DESC);
`;

const DEMO_USERS: Array<{
  id: string;
  name: string;
  avatar: string;
  city: string;
  bio: string;
  online: number;
}> = [
  { id: "2", name: "Анна Ковалёва", avatar: "АК", city: "Москва", bio: "В Friends с первого дня", online: 1 },
  { id: "3", name: "Игорь Смирнов", avatar: "ИС", city: "Москва", bio: "В Friends с первого дня", online: 1 },
  { id: "4", name: "Мария Петрова", avatar: "МП", city: "Москва", bio: "В Friends с первого дня", online: 0 },
  { id: "5", name: "Дмитрий Орлов", avatar: "ДО", city: "Москва", bio: "В Friends с первого дня", online: 1 },
  { id: "6", name: "Елена Васильева", avatar: "ЕВ", city: "Москва", bio: "В Friends с первого дня", online: 0 },
  { id: "7", name: "Павел Кузнецов", avatar: "ПК", city: "Москва", bio: "В Friends с первого дня", online: 1 },
  { id: "8", name: "Ольга Новикова", avatar: "ОН", city: "Москва", bio: "В Friends с первого дня", online: 1 },
  { id: "9", name: "Сергей Волков", avatar: "СВ", city: "Москва", bio: "В Friends с первого дня", online: 0 },
  { id: "10", name: "Кира Лебедева", avatar: "КЛ", city: "Казань", bio: "Дизайн и фото", online: 1 },
  { id: "11", name: "Никита Белов", avatar: "НБ", city: "Санкт-Петербург", bio: "Инди-игры", online: 0 },
  { id: "12", name: "Алина Морозова", avatar: "АМ", city: "Екатеринбург", bio: "Музыка и подкасты", online: 1 },
  { id: "13", name: "Тимур Сафин", avatar: "ТС", city: "Уфа", bio: "Спорт и бег", online: 0 },
  { id: "14", name: "София Громова", avatar: "СГ", city: "Новосибирск", bio: "Научпоп", online: 1 },
  { id: "fn", name: "Friends News", avatar: "FN", city: "Москва", bio: "Официальные новости сети", online: 1 },
];

const DEMO_GROUPS: Array<{ id: string; name: string; description: string; privacy: "public" | "private"; owner_id: string; cover: string }> = [
  { id: "g1", name: "Friends Community", description: "Новости продукта", privacy: "public", owner_id: "fn", cover: "FC" },
  { id: "g2", name: "Фильмы ужасов", description: "Обсуждаем кино", privacy: "public", owner_id: "2", cover: "ФУ" },
  { id: "g3", name: "Корона Вирус", description: "Новости и мемы", privacy: "private", owner_id: "3", cover: "КВ" },
];

function hoursAgo(h: number) {
  return Date.now() - Math.round(h * 60 * 60 * 1000);
}

function seedBase(db: DatabaseSync) {
  // Do not key off total users — ensureDefaultAdmin may already exist and would
  // skip demos, then seedNewUserWorld fails on missing friend FKs (Telegram login).
  const demos = db.prepare("SELECT COUNT(*) AS n FROM users WHERE is_demo = 1").get() as {
    n: number;
  };
  if (Number(demos.n) > 0) return;

  const now = Date.now();
  db.exec("BEGIN");
  try {
    const insertUser = db.prepare(
      `INSERT INTO users
        (id, name, username, email, password_hash, avatar, photo_url, cover_url, status, about, city, birthday, relationship, method, is_demo, online, created_at, last_seen, privacy_wall)
       VALUES (?, ?, NULL, NULL, NULL, ?, NULL, NULL, '', ?, ?, '', '', 'demo', 1, ?, ?, ?, 'public')`,
    );
    for (const u of DEMO_USERS) {
      insertUser.run(u.id, u.name, u.avatar, u.bio, u.city, u.online, now, now);
    }

    const insertGroup = db.prepare(
      `INSERT INTO groups (id, name, description, privacy, owner_id, cover, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const g of DEMO_GROUPS) {
      insertGroup.run(g.id, g.name, g.description, g.privacy, g.owner_id, g.cover, now);
    }

    const members: Array<[string, string, string]> = [
      ["g1", "fn", "owner"],
      ["g2", "2", "owner"],
      ["g3", "3", "owner"],
      ["g1", "2", "member"],
      ["g1", "3", "member"],
      ["g2", "4", "member"],
      ["g2", "6", "member"],
    ];
    const insertMember = db.prepare(
      `INSERT OR IGNORE INTO group_members (group_id, user_id, role, created_at) VALUES (?, ?, ?, ?)`,
    );
    for (const [gid, uid, role] of members) insertMember.run(gid, uid, role, now);

    const insertPost = db.prepare(
      `INSERT INTO posts (id, author_id, group_id, text, image, video, attachment, repost_of, created_at)
       VALUES (?, ?, ?, ?, NULL, NULL, ?, NULL, ?)`,
    );
    insertPost.run(
      "p2",
      "fn",
      "g1",
      "Обновление 0.608\n— тёмная тема и современные цвета\n— широкий layout как в новом ВК\n— обновлён интерфейс ленты",
      JSON.stringify({ name: "0.608.zip", size: "370 КБ", type: "file" }),
      hoursAgo(2),
    );
    insertPost.run(
      "p3",
      "2",
      null,
      "Friends уже похож на нормальную соцсеть — слева меню, справа друзья онлайн.",
      null,
      hoursAgo(20),
    );
    insertPost.run(
      "p4",
      "5",
      null,
      "Собрали тестовую группу на выходные — пишите, если хотите присоединиться.",
      null,
      hoursAgo(26),
    );
    insertPost.run(
      "p5",
      "12",
      null,
      "Плейлист на вечер: инди, электроника и немного джаза.",
      null,
      hoursAgo(30),
    );

    const insertComment = db.prepare(
      `INSERT INTO comments (id, post_id, author_id, text, created_at) VALUES (?, ?, ?, ?, ?)`,
    );
    insertComment.run("c1", "p2", "3", "Огонь, жду продолжения!", hoursAgo(1.5));
    insertComment.run("c2", "p2", "4", "Наконец-то тёмная тема!", hoursAgo(1));

    const insertLike = db.prepare(
      `INSERT OR IGNORE INTO likes (post_id, user_id, created_at) VALUES (?, ?, ?)`,
    );
    for (const uid of ["2", "3", "4", "5", "6", "7", "8", "10", "12"]) {
      insertLike.run("p2", uid, now);
    }
    for (const uid of ["3", "5", "7"]) insertLike.run("p3", uid, now);
    for (const uid of ["2", "8"]) insertLike.run("p4", uid, now);

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function seedUserWorld(db: DatabaseSync, userId: string) {
  const now = Date.now();
  db.exec("BEGIN");
  try {
    const friend = db.prepare(
      `INSERT OR IGNORE INTO friendships (requester_id, addressee_id, status, created_at, updated_at)
       VALUES (?, ?, 'accepted', ?, ?)`,
    );
    for (const id of ["2", "3", "4", "5", "6", "7", "8", "9"]) {
      friend.run(userId, id, now, now);
    }

    const pending = db.prepare(
      `INSERT OR IGNORE INTO friendships (requester_id, addressee_id, status, created_at, updated_at)
       VALUES (?, ?, 'pending', ?, ?)`,
    );
    pending.run("10", userId, now, now);
    pending.run("11", userId, now, now);
    pending.run(userId, "13", now, now);

    const follow = db.prepare(
      `INSERT OR IGNORE INTO follows (follower_id, following_id, created_at) VALUES (?, ?, ?)`,
    );
    follow.run(userId, "12", now);
    follow.run(userId, "fn", now);

    const member = db.prepare(
      `INSERT OR IGNORE INTO group_members (group_id, user_id, role, created_at) VALUES (?, ?, 'member', ?)`,
    );
    for (const gid of ["g1", "g2", "g3"]) member.run(gid, userId, now);

    const insertChat = db.prepare(
      `INSERT OR IGNORE INTO chats (id, type, title, owner_id, created_at) VALUES (?, ?, ?, ?, ?)`,
    );
    const insertChatMember = db.prepare(
      `INSERT OR IGNORE INTO chat_members (chat_id, user_id, last_read_at, created_at) VALUES (?, ?, ?, ?)`,
    );
    const insertMessage = db.prepare(
      `INSERT OR IGNORE INTO messages (id, chat_id, author_id, text, silent, created_at) VALUES (?, ?, ?, ?, 0, ?)`,
    );

    const dmSeeds: Array<{ id: string; peer: string; text: string; at: number; unread: boolean }> = [
      { id: `dm_${userId}_2`, peer: "2", text: "Привет! Когда покажешь прототип?", at: now - 60 * 60 * 1000, unread: true },
      { id: `dm_${userId}_3`, peer: "3", text: "Скинь ссылку на стену", at: now - 3 * 60 * 60 * 1000, unread: false },
      { id: `dm_${userId}_5`, peer: "5", text: "Friends смотрится круто 🔥", at: now - 26 * 60 * 60 * 1000, unread: false },
    ];
    for (const dm of dmSeeds) {
      insertChat.run(dm.id, "dm", "", null, dm.at);
      insertChatMember.run(dm.id, userId, dm.unread ? dm.at - 1 : now, now);
      insertChatMember.run(dm.id, dm.peer, dm.at, now);
      insertMessage.run(`${dm.id}_m1`, dm.id, dm.peer, dm.text, dm.at);
    }

    const groupChatId = `gchat_${userId}`;
    insertChat.run(groupChatId, "group", "Friends Team", userId, now - 4 * 60 * 60 * 1000);
    for (const uid of [userId, "2", "3", "7"]) {
      insertChatMember.run(groupChatId, uid, now, now);
    }
    insertMessage.run(`${groupChatId}_m1`, groupChatId, "2", "Собираем релиз к вечеру?", now - 4 * 60 * 60 * 1000);
    insertMessage.run(`${groupChatId}_m2`, groupChatId, "3", "Да, лента и чаты почти готовы", now - 3.9 * 60 * 60 * 1000);

    const notify = db.prepare(
      `INSERT OR IGNORE INTO notifications (id, user_id, type, title, body, href, read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    );
    notify.run(`n_${userId}_1`, userId, "friend", "Новая заявка в друзья", "Кира Лебедева хочет добавить вас в друзья", "/friends?tab=requests", now - 40 * 60 * 1000);
    notify.run(`n_${userId}_2`, userId, "comment", "Новый комментарий", "Анна Ковалёва ответила на вашу запись", "/feed", now - 6 * 60 * 60 * 1000);

    seedMedia(db, userId, now);

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

const MEDIA_TONES = [
  "linear-gradient(145deg, #8a6348, #3a2c24)",
  "linear-gradient(145deg, #a07850, #4a3528)",
  "linear-gradient(145deg, #c4784a, #5a3a28)",
  "linear-gradient(145deg, #9a6a48, #3a281c)",
  "linear-gradient(145deg, #7a5840, #2a2018)",
];

const MEDIA_TITLES = [
  "Вечер на крыше",
  "Кофе в центре",
  "Друзья у озера",
  "Рабочий стол",
  "Закат на МКАД",
  "Кухня в субботу",
  "Концерт в клубе",
  "Утренний парк",
  "Домашний кот",
  "Поезд в Питер",
  "Новый плеер",
  "Съёмка профиля",
  "Встреча команды",
  "Окно после дождя",
  "Плейлист ночью",
  "Семейный ужин",
  "Прогулка вдвоём",
  "Старый двор",
  "Лампы на кухне",
  "Мост и туман",
  "Кадр с балкона",
  "Архив 2024",
  "Любимое место",
  "Случайный портрет",
];

const MEDIA_ALBUMS = [
  { id: "a1", title: "Фотографии с страницы", cover: "ПС", count: 6 },
  { id: "a2", title: "Фотографии на стене", cover: "НС", count: 6 },
  { id: "a3", title: "Сохранённые фотографии", cover: "СФ", count: 2 },
  { id: "a4", title: "Фотографии со мной", cover: "СМ", count: 4 },
  { id: "a5", title: "Мои фотографии", cover: "МФ", count: 6 },
];

function seedMedia(db: DatabaseSync, userId: string, now: number) {
  const insertAlbum = db.prepare(
    "INSERT OR IGNORE INTO albums (id, user_id, title, cover, tone, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  );
  for (const [index, album] of MEDIA_ALBUMS.entries()) {
    insertAlbum.run(
      `${userId}_${album.id}`,
      userId,
      album.title,
      album.cover,
      MEDIA_TONES[index % MEDIA_TONES.length],
      now,
    );
  }

  const insertPhoto = db.prepare(
    `INSERT OR IGNORE INTO photos (id, user_id, album_id, title, url, tone, label, likes, created_at)
     VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
  );
  let n = 0;
  for (const album of MEDIA_ALBUMS) {
    const count = Math.min(album.count, 6);
    for (let i = 0; i < count; i += 1) {
      insertPhoto.run(
        `${userId}_ph_${album.id}_${i}`,
        userId,
        `${userId}_${album.id}`,
        MEDIA_TITLES[n % MEDIA_TITLES.length],
        MEDIA_TONES[n % MEDIA_TONES.length],
        album.cover,
        ((n * 7) % 40) + (n % 5),
        now - n * 86_400_000,
      );
      n += 1;
    }
  }

  const insertVideo = db.prepare(
    `INSERT OR IGNORE INTO videos (id, user_id, title, description, src, duration, views, tone, cover, created_at)
     VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)`,
  );
  const videos = [
    ["v1", "Вечерний драйв", "Короткий клип под плейлист Ночной драйв", "0:42", 128, "ВД", 6],
    ["v2", "Как устроен Friends", "Мини-демо интерфейса для близкого круга", "1:18", 86, "FR", 20],
    ["v3", "Семейный ужин", "Домашнее видео для круга", "0:27", 54, "СУ", 60],
  ] as const;
  for (const [index, v] of videos.entries()) {
    insertVideo.run(
      `${userId}_${v[0]}`,
      userId,
      v[1],
      v[2],
      v[3],
      v[4],
      MEDIA_TONES[index % MEDIA_TONES.length],
      v[5],
      now - v[6] * 86_400_000,
    );
    n += 1;
  }
}

function addColumns(db: DatabaseSync, table: string, columns: Array<[string, string]>) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  const names = new Set(rows.map((row) => row.name));
  for (const [name, definition] of columns) {
    if (!names.has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  }
}

function ensureColumns(db: DatabaseSync) {
  addColumns(db, "users", [
    ["privacy_wall", "privacy_wall TEXT NOT NULL DEFAULT 'friends'"],
    ["privacy_messages", "privacy_messages TEXT NOT NULL DEFAULT 'friends'"],
    ["privacy_calls", "privacy_calls TEXT NOT NULL DEFAULT 'friends'"],
    ["searchable", "searchable INTEGER NOT NULL DEFAULT 1"],
    ["show_online", "show_online INTEGER NOT NULL DEFAULT 1"],
    ["is_admin", "is_admin INTEGER NOT NULL DEFAULT 0"],
    ["banned", "banned INTEGER NOT NULL DEFAULT 0"],
  ]);
  addColumns(db, "posts", [
    ["status", "status TEXT NOT NULL DEFAULT 'published'"],
    ["comments_enabled", "comments_enabled INTEGER NOT NULL DEFAULT 1"],
  ]);
  db.exec("UPDATE users SET privacy_wall = 'public' WHERE is_demo = 1");
  db.exec("UPDATE posts SET status = 'published' WHERE status IS NULL OR status = ''");
  db.exec(
    `INSERT OR IGNORE INTO app_settings (key, value) VALUES
      ('registration', '1'), ('premoderation', '0'), ('comments_closed', '0')`,
  );
}

function hashPasswordLocal(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

/** Built-in operator account for /manage — email/password match README. */
function ensureDefaultAdmin(db: DatabaseSync) {
  const email = "admin@friends.local";
  const existing = db
    .prepare("SELECT id, is_admin FROM users WHERE lower(email) = lower(?)")
    .get(email) as { id: string; is_admin: number } | undefined;
  if (existing) {
    if (Number(existing.is_admin) === 0) {
      db.prepare("UPDATE users SET is_admin = 1, banned = 0 WHERE id = ?").run(existing.id);
    }
    return;
  }

  const now = Date.now();
  const id = "u_admin_default";
  const name = "Админ Friends";
  const usernameTaken = db.prepare("SELECT id FROM users WHERE username = ?").get("admin");
  db.prepare(
    `INSERT INTO users
      (id, name, username, email, password_hash, avatar, photo_url, cover_url, status, about, city, birthday, relationship, method, is_demo, is_admin, online, created_at, last_seen)
     VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, '', '', '', '', '', 'email', 0, 1, 1, ?, ?)`,
  ).run(
    id,
    name,
    usernameTaken ? null : "admin",
    email,
    hashPasswordLocal("secret123"),
    "АF",
    now,
    now,
  );

  const admins = db
    .prepare("SELECT COUNT(*) AS n FROM users WHERE is_admin = 1 AND is_demo = 0")
    .get() as { n: number };
  if (Number(admins.n) === 0) {
    const oldest = db
      .prepare("SELECT id FROM users WHERE is_demo = 0 ORDER BY created_at ASC LIMIT 1")
      .get() as { id: string } | undefined;
    if (oldest) {
      db.prepare("UPDATE users SET is_admin = 1 WHERE id = ?").run(oldest.id);
    }
  }
}

export function getDb(): DatabaseSync {
  if (globalStore.__friendsDb) return globalStore.__friendsDb;
  const file = dbFile();
  globalStore.__friendsDbPath = file;
  const db = new DatabaseSync(file);
  db.exec(SCHEMA);
  ensureColumns(db);
  seedBase(db);
  ensureDefaultAdmin(db);
  const missingMedia = db
    .prepare(
      "SELECT id FROM users WHERE is_demo = 0 AND id NOT IN (SELECT DISTINCT user_id FROM albums)",
    )
    .all() as Array<{ id: string }>;
  for (const row of missingMedia) {
    seedMedia(db, row.id, Date.now());
  }
  globalStore.__friendsDb = db;
  return db;
}

export function seedNewUserWorld(userId: string) {
  const db = getDb();
  seedUserWorld(db, userId);
}

export function uid(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

export function asNumber(value: unknown): number {
  return typeof value === "bigint" ? Number(value) : Number(value ?? 0);
}

export function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}
