import { ToolLoopAgent, tool, generateText } from "ai";
import { z } from "zod";
import { getDb, uid } from "@/lib/server/db";
import { publishLive } from "@/lib/server/events";
import { getSetting, setSetting } from "@/lib/server/appSettings";
import { FRIENDS_AI_MODEL } from "./model";

const NEWS_AUTHOR_ID = "fn";
const NEWS_GROUP_ID = "g1";

export function newsAgentEnabled() {
  return getSetting("news_agent", "1") !== "0";
}

export function setNewsAgentEnabled(on: boolean) {
  setSetting("news_agent", on ? "1" : "0");
}

export function publishOfficialNews(text: string) {
  const body = text.trim();
  if (body.length < 20) throw new Error("news_too_short");
  if (body.length > 4000) throw new Error("news_too_long");
  const db = getDb();
  const id = uid("p");
  const now = Date.now();
  db.prepare(
    `INSERT INTO posts (id, author_id, group_id, text, image, video, attachment, repost_of, status, comments_enabled, created_at)
     VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, 'published', 1, ?)`,
  ).run(id, NEWS_AUTHOR_ID, NEWS_GROUP_ID, body, now);
  setSetting("news_agent_last_run", String(now));
  setSetting("news_agent_last_post", id);
  publishLive(null, { type: "post", postId: id });
  return { id, text: body, createdAt: now };
}

function recentOfficialPosts(limit = 5) {
  const rows = getDb()
    .prepare(
      `SELECT text, created_at FROM posts
       WHERE author_id = ? AND group_id = ?
       ORDER BY created_at DESC LIMIT ?`,
    )
    .all(NEWS_AUTHOR_ID, NEWS_GROUP_ID, limit) as Array<{ text: string; created_at: number }>;
  return rows.map((row) => ({
    text: String(row.text).slice(0, 280),
    at: new Date(Number(row.created_at)).toISOString(),
  }));
}

const publishTool = tool({
  description: "Опубликовать официальную новость от Friends News в сообществе Friends Community",
  inputSchema: z.object({
    text: z
      .string()
      .min(40)
      .max(1200)
      .describe("Текст новости на русском, 2–6 коротких абзацев или список"),
  }),
  execute: async ({ text }) => publishOfficialNews(text),
});

export function createNewsAgent() {
  return new ToolLoopAgent({
    model: FRIENDS_AI_MODEL,
    instructions: `Ты — редактор официального канала Friends News в закрытой соцсети Friends.
Пиши коротко, по-деловому, на русском. Тема: обновления продукта, советы по безопасности, жизнь круга друзей.
Не выдумывай конкретные баги или даты релизов, которых нет в контексте.
Всегда заканчивай вызовом инструмента publishOfficialNews с готовым текстом.
Не отвечай пользователю длинным эссе — твоя цель опубликовать одну новость.`,
    tools: {
      publishOfficialNews: publishTool,
    },
  });
}

/** Generate and publish one official news post. */
export async function runNewsAgent(topic?: string) {
  if (!newsAgentEnabled()) throw new Error("news_agent_disabled");
  const recent = recentOfficialPosts();
  const agent = createNewsAgent();
  const prompt = [
    topic?.trim()
      ? `Тема выпуска: ${topic.trim()}`
      : "Сделай короткий выпуск новостей Friends на сегодня.",
    recent.length
      ? `Недавно уже публиковали:\n${recent.map((p) => `- ${p.at}: ${p.text}`).join("\n")}`
      : "Ранее официальных постов почти не было — представь первый выпуск.",
    "Опубликуй одну новость через инструмент.",
  ].join("\n\n");

  const result = await agent.generate({ prompt });
  const lastPostId = getSetting("news_agent_last_post", "");
  return {
    text: result.text,
    postId: lastPostId || null,
    steps: result.steps?.length ?? 0,
  };
}

/** Fallback without tool loop if the model refuses tools — still publish. */
export async function runNewsAgentSafe(topic?: string) {
  try {
    return await runNewsAgent(topic);
  } catch (error) {
    const message = error instanceof Error ? error.message : "news_failed";
    if (message === "news_agent_disabled") throw error;
    const drafted = await generateText({
      model: FRIENDS_AI_MODEL,
      prompt: `Напиши короткую официальную новость для соцсети Friends на русском (до 800 символов). Тема: ${topic?.trim() || "обновление продукта и круг друзей"}. Без приветствий.`,
    });
    const post = publishOfficialNews(drafted.text);
    return { text: drafted.text, postId: post.id, steps: 0, fallback: true };
  }
}
