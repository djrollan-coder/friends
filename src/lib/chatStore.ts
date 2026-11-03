import { friends, messages as seedThreads, type User } from "@/data/mock";
import { getSessionUser } from "@/lib/sessionUser";
import { pushNotification } from "./notify";

export const CHATS_KEY = "friends.chats.v1";

export type ChatMessage = {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
  silent?: boolean;
};

export type ChatThread = {
  id: string;
  type: "dm" | "group";
  title: string;
  memberIds: string[];
  messages: ChatMessage[];
  unread?: number;
};

function nowLabel() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function seed(): ChatThread[] {
  return [
    ...seedThreads.map((t) => ({
      id: t.id,
      type: "dm" as const,
      title: t.user.name,
      memberIds: [getSessionUser().id, t.user.id],
      unread: t.unread,
      messages: [
        {
          id: `${t.id}_1`,
          authorId: t.user.id,
          text: t.preview,
          createdAt: t.time,
        },
      ],
    })),
    {
      id: "gchat1",
      type: "group",
      title: "Friends Team",
      memberIds: [getSessionUser().id, friends[0].id, friends[1].id, friends[4].id],
      unread: 0,
      messages: [
        {
          id: "gchat1_1",
          authorId: friends[0].id,
          text: "Собираем релиз к вечеру?",
          createdAt: "17:40",
        },
        {
          id: "gchat1_2",
          authorId: getSessionUser().id,
          text: "Да, лента и чаты почти готовы",
          createdAt: "17:42",
        },
      ],
    },
  ];
}

export function loadChats(): ChatThread[] {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(CHATS_KEY);
    if (!raw) {
      const initial = seed();
      saveChats(initial);
      return initial;
    }
    const parsed = JSON.parse(raw) as ChatThread[];
    if (!Array.isArray(parsed) || !parsed.length) {
      const initial = seed();
      saveChats(initial);
      return initial;
    }
    return parsed;
  } catch {
    const initial = seed();
    try {
      saveChats(initial);
    } catch {
      /* ignore */
    }
    return initial;
  }
}

export function findChat(id: string | undefined | null) {
  if (!id) return undefined;
  return loadChats().find((c) => c.id === id);
}

export function saveChats(next: ChatThread[]) {
  localStorage.setItem(CHATS_KEY, JSON.stringify(next));
}

export function getChat(id: string) {
  return findChat(id);
}

export function peerOf(thread: ChatThread): User | undefined {
  if (thread.type !== "dm") return undefined;
  const peerId = thread.memberIds.find((id) => id !== getSessionUser().id);
  return friends.find((f) => f.id === peerId) ?? {
    id: peerId ?? "?",
    name: thread.title,
    avatar: thread.title.slice(0, 2).toUpperCase(),
  };
}

export function sendChatMessage(
  threadId: string,
  text: string,
  opts?: { silent?: boolean },
) {
  const trimmed = text.trim();
  if (!trimmed) return loadChats();
  const msg: ChatMessage = {
    id: `msg_${Date.now()}`,
    authorId: getSessionUser().id,
    text: trimmed,
    createdAt: nowLabel(),
    silent: opts?.silent || undefined,
  };
  const next = loadChats().map((c) => {
    if (c.id !== threadId) return c;
    return { ...c, messages: [...c.messages, msg], unread: 0 };
  });
  saveChats(next);
  return next;
}

export function createGroupChat(title: string, memberIds: string[]) {
  const thread: ChatThread = {
    id: `gchat_${Date.now()}`,
    type: "group",
    title: title.trim() || "Новый чат",
    memberIds: Array.from(new Set([getSessionUser().id, ...memberIds])),
    messages: [
      {
        id: `msg_${Date.now()}`,
        authorId: getSessionUser().id,
        text: "Чат создан",
        createdAt: nowLabel(),
      },
    ],
    unread: 0,
  };
  const next = [thread, ...loadChats()];
  saveChats(next);
  pushNotification({
    type: "message",
    title: "Групповой чат",
    body: `Создан чат «${thread.title}»`,
    href: `/messages/${thread.id}`,
  });
  return { chats: next, thread };
}

export function deleteChat(threadId: string) {
  const next = loadChats().filter((c) => c.id !== threadId);
  saveChats(next);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("friends-chat-updated", {
        detail: { threadIds: [threadId], deleted: true },
      }),
    );
  }
  return next;
}

export function clearChatMessages(threadId: string) {
  const next = loadChats().map((c) =>
    c.id === threadId ? { ...c, messages: [], unread: 0 } : c,
  );
  saveChats(next);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("friends-chat-updated", {
        detail: { threadIds: [threadId] },
      }),
    );
  }
  return next;
}

export function ensureDm(userId: string) {
  const chats = loadChats();
  const existing = chats.find(
    (c) =>
      c.type === "dm" &&
      c.memberIds.includes(getSessionUser().id) &&
      c.memberIds.includes(userId),
  );
  if (existing) return { chats, thread: existing };
  const person = friends.find((f) => f.id === userId) ?? {
    id: userId,
    name: "Диалог",
    avatar: "??",
  };
  const thread: ChatThread = {
    id: `m_${Date.now()}`,
    type: "dm",
    title: person.name,
    memberIds: [getSessionUser().id, userId],
    messages: [],
    unread: 0,
  };
  const next = [thread, ...chats];
  saveChats(next);
  return { chats: next, thread };
}
