import { ToolLoopAgent, tool } from "ai";
import { z } from "zod";
import { getDb, uid } from "@/lib/server/db";
import { getAppSettings, getSetting } from "@/lib/server/appSettings";
import { type UserRow } from "@/lib/server/auth";
import { notify } from "@/lib/server/social";
import { FRIENDS_AI_MODEL } from "./model";

export function supportAgentEnabled() {
  return getSetting("support_agent", "1") !== "0";
}

function accountSnapshot(user: UserRow) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    method: user.method,
    isAdmin: Number(user.is_admin) !== 0,
    banned: Number(user.banned) !== 0,
    createdAt: new Date(Number(user.created_at)).toISOString(),
  };
}

export function createSupportAgent(me: UserRow) {
  return new ToolLoopAgent({
    model: FRIENDS_AI_MODEL,
    instructions: `Ты — техподдержка кабинета Friends (закрытая соцсеть).
Отвечай по-русски, кратко и спокойно. Не выдумывай доступы к чужим данным.
Можешь объяснить: вход по email-коду и паролю, Telegram-бот, QR, админку /manage, жалобы, настройки приватности.
Если проблема требует человека (бан, оплата, юридическое) — вызови escalateToHuman.
Пользователь сейчас: ${me.name} (${me.email ?? "без email"}, method=${me.method}).`,
    tools: {
      getCabinetStatus: tool({
        description: "Текущие настройки сети и счётчики для диагностики",
        inputSchema: z.object({}),
        execute: async () => {
          const settings = getAppSettings();
          const db = getDb();
          const users = db.prepare("SELECT COUNT(*) AS n FROM users WHERE is_demo = 0").get() as {
            n: number;
          };
          const posts = db.prepare("SELECT COUNT(*) AS n FROM posts").get() as { n: number };
          const reports = db
            .prepare("SELECT COUNT(*) AS n FROM reports WHERE status = 'open'")
            .get() as { n: number };
          return {
            settings,
            newsAgent: getSetting("news_agent", "1") !== "0",
            supportAgent: supportAgentEnabled(),
            realUsers: Number(users.n),
            posts: Number(posts.n),
            openReports: Number(reports.n),
          };
        },
      }),
      getMyAccount: tool({
        description: "Карточка текущего пользователя",
        inputSchema: z.object({}),
        execute: async () => accountSnapshot(me),
      }),
      getHelpTopics: tool({
        description: "Краткая справка по типичным вопросам Friends",
        inputSchema: z.object({
          topic: z
            .enum(["login", "telegram", "email", "privacy", "admin", "general"])
            .describe("Тема справки"),
        }),
        execute: async ({ topic }) => {
          const faq: Record<string, string> = {
            login:
              "Вход: вкладка Почта → код из письма или пароль; Telegram — бот @friends_amber_bot; QR — подтверждение с телефона.",
            telegram:
              "Откройте бота, нажмите Start с сессией f_…, вернитесь в Friends. На iPhone вход идёт через нативное приложение, без Safari.",
            email:
              "Код действует 10 минут, не больше 5 попыток. Если письма нет — проверьте спам и что Resend настроен (RESEND_API_KEY).",
            privacy:
              "В настройках профиля: стена, сообщения, звонки, поиск и онлайн. Демо-профили видны всем в круге.",
            admin:
              "Админка /manage только для is_admin или FRIENDS_ADMIN_EMAILS. Там пользователи, контент, жалобы и агенты.",
            general:
              "Friends — приватная сеть для близкого круга: лента, чаты, сообщества. Данные на Vercel SQLite эфемерны без внешней БД.",
          };
          return { topic, answer: faq[topic] };
        },
      }),
      escalateToHuman: tool({
        description: "Создать тикет для живой поддержки / админов",
        inputSchema: z.object({
          summary: z.string().min(8).max(500),
          urgency: z.enum(["low", "normal", "high"]).default("normal"),
        }),
        execute: async ({ summary, urgency }) => {
          const db = getDb();
          const id = uid("sup");
          const now = Date.now();
          db.prepare(
            `INSERT INTO support_tickets (id, user_id, summary, urgency, status, created_at)
             VALUES (?, ?, ?, ?, 'open', ?)`,
          ).run(id, me.id, summary, urgency, now);
          const admins = db
            .prepare("SELECT id FROM users WHERE is_admin = 1 AND banned = 0 AND is_demo = 0")
            .all() as Array<{ id: string }>;
          for (const admin of admins) {
            notify({
              userId: admin.id,
              type: "support",
              title: "Тикет поддержки",
              body: `${me.name}: ${summary.slice(0, 120)}`,
              href: "/manage?tab=agents",
            });
          }
          return { ticketId: id, status: "open" };
        },
      }),
    },
  });
}

export function listOpenSupportTickets(limit = 50) {
  return getDb()
    .prepare(
      `SELECT t.*, u.name AS user_name, u.email AS user_email
       FROM support_tickets t
       JOIN users u ON u.id = t.user_id
       WHERE t.status = 'open'
       ORDER BY t.created_at DESC
       LIMIT ?`,
    )
    .all(limit) as Array<Record<string, unknown>>;
}

export function resolveSupportTicket(id: string) {
  getDb()
    .prepare("UPDATE support_tickets SET status = 'resolved', resolved_at = ? WHERE id = ?")
    .run(Date.now(), id);
  return { id, status: "resolved" };
}
