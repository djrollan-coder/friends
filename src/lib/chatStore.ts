import { api } from "./api";
import type { ChatThread } from "./dto";
import { getSessionUser } from "./sessionUser";

export type { ChatThread, ChatMessage } from "./dto";

const cache = new Map<string, ChatThread>();

export function cacheChat(chat: ChatThread | null | undefined) {
  if (!chat) return;
  cache.set(chat.id, chat);
}

export function cacheChats(chats: ChatThread[]) {
  for (const chat of chats) cache.set(chat.id, chat);
}

export function getChat(id: string): ChatThread | undefined {
  return cache.get(id);
}

export function findChat(id: string | undefined | null) {
  if (!id) return undefined;
  return cache.get(id);
}

export async function fetchChats(): Promise<ChatThread[]> {
  const data = await api<{ chats: ChatThread[] }>("/api/chats");
  cacheChats(data.chats);
  return data.chats;
}

export async function fetchChat(id: string): Promise<ChatThread | null> {
  try {
    const data = await api<{ chat: ChatThread }>(`/api/chats/${id}`);
    cacheChat(data.chat);
    return data.chat;
  } catch {
    return null;
  }
}

export function peerOf(thread: ChatThread) {
  if (thread.type !== "dm") return undefined;
  if (thread.peer) return thread.peer;
  const peerId = thread.memberIds.find((id) => id !== getSessionUser().id);
  return peerId
    ? { id: peerId, name: thread.title, avatar: thread.title.slice(0, 2).toUpperCase(), online: false }
    : undefined;
}

export async function sendChatMessage(
  threadId: string,
  text: string,
  opts?: { silent?: boolean },
): Promise<ChatThread | null> {
  const data = await api<{ chat: ChatThread }>(`/api/chats/${threadId}/messages`, {
    method: "POST",
    body: JSON.stringify({ text, silent: opts?.silent }),
  });
  cacheChat(data.chat);
  return data.chat;
}

export async function createGroupChat(title: string, memberIds: string[]) {
  const data = await api<{ chats: ChatThread[]; thread: ChatThread }>("/api/chats", {
    method: "POST",
    body: JSON.stringify({ type: "group", title, memberIds }),
  });
  cacheChats(data.chats);
  cacheChat(data.thread);
  return data;
}

export async function ensureDm(userId: string) {
  const data = await api<{ chats: ChatThread[]; thread: ChatThread }>("/api/chats", {
    method: "POST",
    body: JSON.stringify({ type: "dm", userId }),
  });
  cacheChats(data.chats);
  cacheChat(data.thread);
  return data;
}

export async function deleteChat(threadId: string): Promise<ChatThread[]> {
  const data = await api<{ chats: ChatThread[] }>(`/api/chats/${threadId}`, {
    method: "DELETE",
  });
  cache.delete(threadId);
  cacheChats(data.chats);
  return data.chats;
}

export async function clearChatMessages(threadId: string): Promise<ChatThread | null> {
  const data = await api<{ chat: ChatThread }>(`/api/chats/${threadId}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "clear" }),
  });
  cacheChat(data.chat);
  return data.chat;
}

export async function markChatRead(threadId: string): Promise<ChatThread | null> {
  try {
    const data = await api<{ chat: ChatThread }>(`/api/chats/${threadId}`);
    cacheChat(data.chat);
    return data.chat;
  } catch {
    return null;
  }
}

export async function addChatMembers(threadId: string, memberIds: string[]) {
  const data = await api<{ chat: ChatThread }>(`/api/chats/${threadId}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "addMembers", memberIds }),
  });
  cacheChat(data.chat);
  return data.chat;
}
