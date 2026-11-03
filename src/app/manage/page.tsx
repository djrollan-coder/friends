"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Overview = {
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

type AdminUser = {
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

type AdminPost = {
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

type AdminGroup = {
  id: string;
  name: string;
  privacy: string;
  ownerName: string;
  members: number;
  posts: number;
  createdAtLabel: string;
};

type AdminReport = {
  id: string;
  targetType: string;
  targetId: string;
  targetPreview: string;
  reason: string;
  status: string;
  reporterName: string;
  createdAtLabel: string;
};

type Settings = {
  registration: boolean;
  premoderation: boolean;
  commentsClosed: boolean;
  openReports: number;
};

const TABS = [
  "Обзор",
  "Пользователи",
  "Сообщество",
  "Контент",
  "Безопасность",
  "Настройки",
] as const;
type Tab = (typeof TABS)[number];

async function adminFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (response.status === 401 || response.status === 403) {
    throw new Error("forbidden");
  }
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? `http_${response.status}`);
  return data;
}

function badge(text: string, tone: "ok" | "warn" | "muted") {
  return (
    <span className={`admin-badge ${tone}`} key={text}>
      {text}
    </span>
  );
}

export default function ManagePage() {
  const [tab, setTab] = useState<Tab>("Обзор");
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [userQuery, setUserQuery] = useState("");
  const [postQuery, setPostQuery] = useState("");
  const [postFilter, setPostFilter] = useState<"all" | "pending" | "published">("all");
  const [busy, setBusy] = useState("");

  const flash = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2800);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextOverview, nextUsers, nextPosts, nextGroups, nextReports, nextSettings] =
        await Promise.all([
          adminFetch<Overview>("/api/admin/overview"),
          adminFetch<{ users: AdminUser[] }>("/api/admin/users"),
          adminFetch<{ posts: AdminPost[] }>("/api/admin/posts"),
          adminFetch<{ groups: AdminGroup[] }>("/api/admin/groups"),
          adminFetch<{ reports: AdminReport[] }>("/api/admin/reports"),
          adminFetch<Settings>("/api/admin/settings"),
        ]);
      setOverview(nextOverview);
      setUsers(nextUsers.users);
      setPosts(nextPosts.posts);
      setGroups(nextGroups.groups);
      setReports(nextReports.reports);
      setSettings(nextSettings);
      setDenied(false);
    } catch (e) {
      if (e instanceof Error && e.message === "forbidden") {
        setDenied(true);
      } else {
        setError("Не удалось загрузить данные админки");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function run(label: string, action: () => Promise<void>) {
    setBusy(label);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка операции");
    } finally {
      setBusy("");
    }
  }

  async function userAction(user: AdminUser, action: string) {
    const labels: Record<string, string> = {
      ban: "Пользователь заблокирован",
      unban: "Блокировка снята",
      makeAdmin: "Права администратора выданы",
      removeAdmin: "Права администратора сняты",
      delete: "Пользователь удалён",
    };
    if (action === "delete" && !window.confirm(`Удалить ${user.name}? Это необратимо.`)) return;
    if (action === "ban" && !window.confirm(`Заблокировать ${user.name}?`)) return;
    await run(`user-${action}`, async () => {
      const data = await adminFetch<{ users: AdminUser[]; overview: Overview }>(
        `/api/admin/users/${user.id}`,
        { method: "POST", body: JSON.stringify({ action }) },
      );
      setUsers(data.users);
      setOverview(data.overview);
      flash(labels[action] ?? "Готово");
    });
  }

  async function postAction(post: AdminPost, action: string) {
    if (action === "delete" && !window.confirm("Удалить публикацию?")) return;
    await run(`post-${action}`, async () => {
      const data = await adminFetch<{ posts: AdminPost[]; overview: Overview }>(
        `/api/admin/posts/${post.id}`,
        { method: "POST", body: JSON.stringify({ action }) },
      );
      setPosts(data.posts);
      setOverview(data.overview);
      flash(action === "publish" ? "Публикация одобрена" : "Публикация удалена");
    });
  }

  async function groupAction(group: AdminGroup) {
    if (!window.confirm(`Удалить сообщество «${group.name}»?`)) return;
    await run(`group-${group.id}`, async () => {
      const data = await adminFetch<{ groups: AdminGroup[]; overview: Overview }>(
        `/api/admin/groups/${group.id}`,
        { method: "DELETE" },
      );
      setGroups(data.groups);
      setOverview(data.overview);
      flash("Сообщество удалено");
    });
  }

  async function reportAction(report: AdminReport, action: string) {
    if (action === "deleteTarget" && !window.confirm("Удалить объект жалобы?")) return;
    await run(`report-${action}`, async () => {
      const data = await adminFetch<{ reports: AdminReport[]; overview: Overview }>(
        `/api/admin/reports/${report.id}`,
        { method: "POST", body: JSON.stringify({ action }) },
      );
      setReports(data.reports);
      setOverview(data.overview);
      flash(
        action === "resolve"
          ? "Жалоба закрыта"
          : action === "dismiss"
            ? "Жалоба отклонена"
            : "Объект удалён, жалоба закрыта",
      );
    });
  }

  async function toggleSetting(key: keyof Omit<Settings, "openReports">) {
    if (!settings) return;
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    await run(`setting-${key}`, async () => {
      const saved = await adminFetch<Settings>("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ [key]: next[key] }),
      });
      setSettings({ ...saved, openReports: settings.openReports });
      flash("Настройка сохранена");
    });
  }

  const filteredUsers = useMemo(() => {
    const needle = userQuery.trim().toLowerCase();
    if (!needle) return users;
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(needle) ||
        (user.email ?? "").toLowerCase().includes(needle) ||
        (user.username ?? "").toLowerCase().includes(needle),
    );
  }, [users, userQuery]);

  const filteredPosts = useMemo(() => {
    const needle = postQuery.trim().toLowerCase();
    return posts.filter((post) => {
      if (postFilter !== "all" && post.status !== postFilter) return false;
      if (!needle) return true;
      return (
        post.text.toLowerCase().includes(needle) ||
        post.authorName.toLowerCase().includes(needle)
      );
    });
  }, [posts, postQuery, postFilter]);

  const openReports = reports.filter((report) => report.status === "open");
  const chart = overview?.chart ?? [];
  const chartMax = Math.max(1, ...chart.map((day) => Math.max(day.users, day.posts)));
  const points = chart
    .map((day, index) => {
      const x = chart.length > 1 ? (index / (chart.length - 1)) * 676 : 338;
      const y = 172 - (day.users / chartMax) * 150;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  if (denied) {
    return (
      <div className="admin-page">
        <div className="admin-card admin-empty-state">
          <span>⚑</span>
          <b>Нет доступа к админке</b>
          <p>
            Эта страница доступна только администраторам. Попросите владельца сети выдать права
            или укажите свой email в <code>FRIENDS_ADMIN_EMAILS</code>.
          </p>
          <Link href="/" className="admin-primary">
            ← Вернуться в ленту
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-heading">
        <div>
          <div className="admin-eyebrow">
            <span className="admin-live" /> ЦЕНТР УПРАВЛЕНИЯ
          </div>
          <h1>Управление</h1>
          <p>Реальные данные сети: пользователи, публикации, жалобы и настройки.</p>
        </div>
        <a className="admin-primary" href="/api/admin/report.csv">
          ↓ <span>Скачать отчёт</span>
        </a>
      </div>

      <div className="admin-tabs" role="tablist">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            className={tab === item ? "selected" : ""}
            onClick={() => setTab(item)}
          >
            {item}
            {item === "Пользователи" && overview ? (
              <span className="admin-tab-count">{overview.counts.realUsers}</span>
            ) : null}
            {item === "Безопасность" && openReports.length ? (
              <span className="admin-tab-count">{openReports.length}</span>
            ) : null}
            {item === "Контент" && overview?.counts.pendingPosts ? (
              <span className="admin-tab-count">{overview.counts.pendingPosts}</span>
            ) : null}
          </button>
        ))}
      </div>

      {error ? <div className="admin-error">{error}</div> : null}
      {loading && !overview ? (
        <div className="admin-card admin-empty-state">
          <span>…</span>
          <b>Загружаем данные</b>
          <p>Подключаемся к базе.</p>
        </div>
      ) : null}

      {tab === "Обзор" && overview ? (
        <>
          <section className="admin-metrics">
            <article className="admin-metric">
              <div className="admin-metric-top">
                <span>Пользователи</span>
                <span className="admin-metric-icon lilac">♙</span>
              </div>
              <strong>{overview.counts.realUsers}</strong>
              <div className="admin-trend">
                <b>всего {overview.counts.users}</b>
                <span>включая демо-профили</span>
              </div>
            </article>
            <article className="admin-metric">
              <div className="admin-metric-top">
                <span>Активны сейчас</span>
                <span className="admin-metric-icon mint">◉</span>
              </div>
              <strong>{overview.counts.online}</strong>
              <div className="admin-trend">
                <b>+{overview.newUsers7d}</b>
                <span>новых за 7 дней</span>
              </div>
            </article>
            <article className="admin-metric">
              <div className="admin-metric-top">
                <span>Публикации</span>
                <span className="admin-metric-icon amber">▤</span>
              </div>
              <strong>{overview.counts.posts}</strong>
              <div className="admin-trend">
                <b>+{overview.newPosts7d}</b>
                <span>за 7 дней · {overview.counts.pendingPosts} на модерации</span>
              </div>
            </article>
            <article className="admin-metric">
              <div className="admin-metric-top">
                <span>Жалобы</span>
                <span className="admin-metric-icon rose">⚑</span>
              </div>
              <strong>{String(overview.counts.openReports).padStart(2, "0")}</strong>
              <div className={`admin-trend${overview.counts.openReports ? " admin-warn" : ""}`}>
                <b>{overview.counts.openReports ? "Требуют внимания" : "Очередь пуста"}</b>
                <span>обращения пользователей</span>
              </div>
            </article>
          </section>

          <section className="admin-grid">
            <article className="admin-card admin-chart-card">
              <div className="admin-card-head">
                <div>
                  <h2>Активность за неделю</h2>
                  <p>Новые пользователи по дням</p>
                </div>
              </div>
              <div className="admin-chart">
                <div className="admin-y-labels">
                  {[chartMax, Math.round(chartMax / 2), 0]
                    .filter((value, index, list) => list.indexOf(value) === index)
                    .map((value, index) => (
                      <span key={index}>{value}</span>
                    ))}
                </div>
                <div className="admin-plot">
                  <div className="admin-gridlines">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                  <svg viewBox="0 0 680 190" preserveAspectRatio="none" aria-label="График активности">
                    <polyline
                      points={points}
                      fill="none"
                      stroke="#d58b5c"
                      strokeWidth="3"
                      vectorEffect="non-scaling-stroke"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {chart.map((day, index) => (
                      <circle
                        key={day.date}
                        cx={chart.length > 1 ? (index / (chart.length - 1)) * 676 : 338}
                        cy={172 - (day.users / chartMax) * 150}
                        r="3.5"
                        fill="#d58b5c"
                      />
                    ))}
                  </svg>
                  <div className="admin-x-labels">
                    {chart.map((day) => (
                      <span key={day.date}>{day.label}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="admin-chart-legend">
                <span>
                  <i /> Новые регистрации
                </span>
                <span>
                  Всего за неделю <b>{overview.newUsers7d}</b>
                </span>
              </div>
            </article>

            <article className="admin-card admin-activity-card">
              <div className="admin-card-head">
                <div>
                  <h2>Последние события</h2>
                  <p>Что происходит прямо сейчас</p>
                </div>
                <button type="button" className="admin-text-btn" onClick={() => setTab("Пользователи")}>
                  Все пользователи <span>→</span>
                </button>
              </div>
              <div className="admin-activity-list">
                {overview.activity.length ? (
                  overview.activity.map((item) => (
                    <div className="admin-activity" key={item.id}>
                      <span
                        className={`admin-event-icon ${
                          item.type === "user"
                            ? "violet"
                            : item.type === "post"
                              ? "orange"
                              : item.type === "report"
                                ? "red"
                                : "green"
                        }`}
                      >
                        {item.type === "user" ? "♙" : item.type === "post" ? "▤" : "⚑"}
                      </span>
                      <div className="admin-event-copy">
                        <b>{item.title}</b>
                        <span>{item.detail}</span>
                      </div>
                      <time>{item.time}</time>
                    </div>
                  ))
                ) : (
                  <div className="admin-empty-state">
                    <span>▤</span>
                    <b>Пока тихо</b>
                    <p>События появятся, когда пользователи начнут действовать.</p>
                  </div>
                )}
              </div>
            </article>
          </section>

          <section className="admin-bottom-grid">
            <article className="admin-card admin-quick">
              <div className="admin-card-head">
                <div>
                  <h2>Быстрые действия</h2>
                  <p>Часто используемые инструменты</p>
                </div>
              </div>
              <div className="admin-actions">
                <button type="button" onClick={() => setTab("Пользователи")}>
                  <span className="admin-action-icon lilac">♙</span>
                  <span>
                    <b>Пользователи</b>
                    <small>Поиск, блокировка и права</small>
                  </span>
                  <em>→</em>
                </button>
                <button type="button" onClick={() => setTab("Безопасность")}>
                  <span className="admin-action-icon rose">⚑</span>
                  <span>
                    <b>Модерация</b>
                    <small>{openReports.length} жалоб в очереди</small>
                  </span>
                  <em>→</em>
                </button>
                <button type="button" onClick={() => setTab("Настройки")}>
                  <span className="admin-action-icon amber">⚙</span>
                  <span>
                    <b>Настройки сети</b>
                    <small>Регистрация и модерация</small>
                  </span>
                  <em>→</em>
                </button>
              </div>
            </article>

            <article className="admin-card admin-health">
              <div className="admin-card-head">
                <div>
                  <h2>Состояние сети</h2>
                  <p>Данные из текущей базы</p>
                </div>
                <span className="admin-status">
                  <i /> В норме
                </span>
              </div>
              <div className="admin-health-items">
                <div>
                  <span>Пользователи</span>
                  <b>{overview.counts.users}</b>
                  <div className="admin-health-bar">
                    <i style={{ width: "100%" }} />
                  </div>
                </div>
                <div>
                  <span>Сообщения</span>
                  <b>{overview.counts.messages}</b>
                  <div className="admin-health-bar">
                    <i style={{ width: "100%" }} />
                  </div>
                </div>
                <div>
                  <span>Сообщества</span>
                  <b>{overview.counts.groups}</b>
                  <div className="admin-health-bar">
                    <i style={{ width: "100%" }} />
                  </div>
                </div>
                <div>
                  <span>Модерация</span>
                  <b>{overview.counts.pendingPosts} публикаций</b>
                  <div className="admin-backup">
                    ✓ <span>База отвечает, очередь доступна</span>
                  </div>
                </div>
              </div>
            </article>
          </section>
        </>
      ) : null}

      {tab === "Пользователи" ? (
        <section className="admin-card admin-section-panel">
          <div className="admin-card-head">
            <div>
              <h2>Пользователи</h2>
              <p>{users.length} профилей, реальных — {overview?.counts.realUsers ?? 0}</p>
            </div>
          </div>
          <div className="admin-search">
            ⌕
            <input
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Поиск по имени, email или username"
            />
            <span>{filteredUsers.length}</span>
          </div>
          <div className="admin-list">
            {filteredUsers.map((user) => (
              <div className="admin-row" key={user.id}>
                <div className="admin-row-main">
                  <div className="admin-row-avatar">{user.avatar}</div>
                  <div>
                    <b>
                      {user.name}
                      {user.isAdmin ? badge("админ", "warn") : null}
                      {user.banned ? badge("заблокирован", "muted") : null}
                      {user.isDemo ? badge("демо", "muted") : null}
                    </b>
                    <small>
                      {user.email ?? user.username ?? user.id} · {user.method} ·{" "}
                      {user.online
                        ? "онлайн"
                        : `был(а) ${user.lastSeenLabel}`}{" "}
                      · {user.posts} постов
                    </small>
                  </div>
                </div>
                <div className="admin-row-actions">
                  {user.isDemo ? (
                    <span className="admin-badge muted">демо-профиль</span>
                  ) : (
                    <>
                      {user.banned ? (
                        <button type="button" disabled={busy !== ""} onClick={() => void userAction(user, "unban")}>
                          Разблокировать
                        </button>
                      ) : (
                        <button type="button" disabled={busy !== ""} onClick={() => void userAction(user, "ban")}>
                          Заблокировать
                        </button>
                      )}
                      {user.isAdmin ? (
                        <button type="button" disabled={busy !== ""} onClick={() => void userAction(user, "removeAdmin")}>
                          Снять админа
                        </button>
                      ) : (
                        <button type="button" disabled={busy !== ""} onClick={() => void userAction(user, "makeAdmin")}>
                          Сделать админом
                        </button>
                      )}
                      <button
                        type="button"
                        className="danger"
                        disabled={busy !== ""}
                        onClick={() => void userAction(user, "delete")}
                      >
                        Удалить
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {!filteredUsers.length ? (
              <div className="admin-empty-state">
                <span>♙</span>
                <b>Никого не нашли</b>
                <p>Попробуйте другой запрос.</p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {tab === "Сообщество" ? (
        <section className="admin-card admin-section-panel">
          <div className="admin-card-head">
            <div>
              <h2>Сообщества</h2>
              <p>{groups.length} групп в сети</p>
            </div>
          </div>
          <div className="admin-list">
            {groups.map((group) => (
              <div className="admin-row" key={group.id}>
                <div className="admin-row-main">
                  <div className="admin-row-avatar">{group.name.slice(0, 1)}</div>
                  <div>
                    <b>
                      {group.name} {badge(group.privacy === "private" ? "закрытое" : "открытое", "muted")}
                    </b>
                    <small>
                      Владелец: {group.ownerName} · {group.members} участников · {group.posts} публикаций ·{" "}
                      {group.createdAtLabel}
                    </small>
                  </div>
                </div>
                <div className="admin-row-actions">
                  <button type="button" className="danger" disabled={busy !== ""} onClick={() => void groupAction(group)}>
                    Удалить группу
                  </button>
                </div>
              </div>
            ))}
            {!groups.length ? (
              <div className="admin-empty-state">
                <span>▤</span>
                <b>Сообществ нет</b>
                <p>Пользователи ещё не создали группы.</p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {tab === "Контент" ? (
        <section className="admin-card admin-section-panel">
          <div className="admin-card-head">
            <div>
              <h2>Публикации</h2>
              <p>{posts.length} последних записей</p>
            </div>
          </div>
          <div className="admin-search">
            ⌕
            <input
              value={postQuery}
              onChange={(e) => setPostQuery(e.target.value)}
              placeholder="Поиск по тексту или автору"
            />
            <span>{filteredPosts.length}</span>
          </div>
          <div className="admin-filter-row">
            {(["all", "pending", "published"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                className={postFilter === filter ? "is-on" : undefined}
                onClick={() => setPostFilter(filter)}
              >
                {filter === "all" ? "Все" : filter === "pending" ? "На модерации" : "Опубликованные"}
              </button>
            ))}
          </div>
          <div className="admin-list">
            {filteredPosts.map((post) => (
              <div className="admin-row" key={post.id}>
                <div className="admin-row-main">
                  <div className="admin-row-avatar">{(post.authorName[0] ?? "F").toUpperCase()}</div>
                  <div>
                    <b>
                      {post.authorName} {badge(post.status === "pending" ? "на модерации" : "опубликовано", post.status === "pending" ? "warn" : "ok")}
                    </b>
                    <small>
                      {post.createdAtLabel} · ♥ {post.likes} · 💬 {post.comments}
                    </small>
                    <p className="admin-row-text">{post.text || "(без текста)"}</p>
                  </div>
                </div>
                <div className="admin-row-actions">
                  {post.status === "pending" ? (
                    <button type="button" disabled={busy !== ""} onClick={() => void postAction(post, "publish")}>
                      Одобрить
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="danger"
                    disabled={busy !== ""}
                    onClick={() => void postAction(post, "delete")}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
            {!filteredPosts.length ? (
              <div className="admin-empty-state">
                <span>▤</span>
                <b>Публикаций нет</b>
                <p>В выбранном фильтре ничего не найдено.</p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {tab === "Безопасность" ? (
        <section className="admin-card admin-section-panel">
          <div className="admin-card-head">
            <div>
              <h2>Жалобы</h2>
              <p>{openReports.length} открытых обращений</p>
            </div>
          </div>
          <div className="admin-list">
            {reports.map((report) => (
              <div className="admin-row" key={report.id}>
                <div className="admin-row-main">
                  <div className="admin-row-avatar">⚑</div>
                  <div>
                    <b>
                      {report.targetType === "post" ? "Публикация" : "Пользователь"}{" "}
                      {badge(report.status === "open" ? "открыта" : report.status === "resolved" ? "закрыта" : "отклонена", report.status === "open" ? "warn" : "muted")}
                    </b>
                    <small>
                      От {report.reporterName} · {report.createdAtLabel}
                    </small>
                    <p className="admin-row-text">
                      Причина: {report.reason || "не указана"}
                      <br />
                      Объект: {report.targetPreview || report.targetId}
                    </p>
                  </div>
                </div>
                <div className="admin-row-actions">
                  {report.status === "open" ? (
                    <>
                      <button type="button" disabled={busy !== ""} onClick={() => void reportAction(report, "resolve")}>
                        Закрыть
                      </button>
                      <button type="button" disabled={busy !== ""} onClick={() => void reportAction(report, "dismiss")}>
                        Отклонить
                      </button>
                      <button
                        type="button"
                        className="danger"
                        disabled={busy !== ""}
                        onClick={() => void reportAction(report, "deleteTarget")}
                      >
                        {report.targetType === "user" ? "Заблокировать автора" : "Удалить публикацию"}
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
            {!reports.length ? (
              <div className="admin-empty-state">
                <span>✓</span>
                <b>Жалоб нет</b>
                <p>Очередь модерации пуста.</p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {tab === "Настройки" && settings ? (
        <section className="admin-card admin-section-panel">
          <div className="admin-card-head">
            <div>
              <h2>Настройки сети</h2>
              <p>Применяются сразу на сервере</p>
            </div>
          </div>
          <div className="admin-settings">
            {(
              [
                ["registration", "Регистрация пользователей", "Разрешить новым пользователям создавать аккаунт"],
                ["premoderation", "Премодерация публикаций", "Новые записи попадают в очередь и не видны в ленте до одобрения"],
                ["commentsClosed", "Комментарии по умолчанию закрыты", "У новых публикаций комментарии будут отключены"],
              ] as const
            ).map(([key, title, description]) => (
              <div className="admin-setting" key={key}>
                <span>
                  <b>{title}</b>
                  <small>{description}</small>
                </span>
                <button
                  type="button"
                  aria-label={title}
                  aria-pressed={settings[key]}
                  disabled={busy !== ""}
                  className={`admin-switch ${settings[key] ? "on" : ""}`}
                  onClick={() => void toggleSetting(key)}
                >
                  <i />
                </button>
              </div>
            ))}
          </div>
          <div className="admin-note">
            Премодерация и закрытые комментарии применяются к новым публикациям. Уже
            опубликованные записи не меняются.
          </div>
        </section>
      ) : null}

      {notice ? <div className="admin-toast">✓ {notice}</div> : null}
      <div className="admin-footer">
        Friends Admin <span>•</span> данные из базы <span>•</span>{" "}
        {overview ? `${overview.counts.users} профилей` : "…"}
      </div>
    </div>
  );
}
