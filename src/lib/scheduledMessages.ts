import { friends } from "@/data/mock";
import { peerOf, sendChatMessage, getChat } from "./chatStore";

export const SCHEDULED_KEY = "friends.scheduled.messages.v1";

export type ScheduledMode = "timer" | "when_online";

export type ScheduledMessage = {
  id: string;
  threadId: string;
  text: string;
  mode: ScheduledMode;
  /** unix ms — for timer mode */
  sendAt?: number;
  /** peer user id — for when_online */
  peerId?: string;
  createdAt: number;
  quiet: true;
};

export type PresenceOverride = Record<string, boolean>;

const PRESENCE_KEY = "friends.presence.override.v1";

export function loadScheduled(): ScheduledMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SCHEDULED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScheduledMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveScheduled(next: ScheduledMessage[]) {
  localStorage.setItem(SCHEDULED_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("friends-scheduled-changed"));
}

function loadPresence(): PresenceOverride {
  try {
    const raw = localStorage.getItem(PRESENCE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as PresenceOverride;
  } catch {
    return {};
  }
}

function savePresence(next: PresenceOverride) {
  localStorage.setItem(PRESENCE_KEY, JSON.stringify(next));
}

export function isUserOnline(userId: string) {
  const override = loadPresence()[userId];
  if (typeof override === "boolean") return override;
  return !!friends.find((f) => f.id === userId)?.online;
}

/** Quietly mark peer online later so «when online» can fire in demo */
function armQuietOnline(peerId: string) {
  if (isUserOnline(peerId)) return;
  const delay = 12_000 + Math.floor(Math.random() * 18_000);
  window.setTimeout(() => {
    const next = { ...loadPresence(), [peerId]: true };
    savePresence(next);
    window.dispatchEvent(new Event("friends-presence-changed"));
  }, delay);
}

export function scheduleTimerMessage(threadId: string, text: string, delayMs: number) {
  const trimmed = text.trim();
  if (!trimmed || delayMs < 1000) return loadScheduled();
  const item: ScheduledMessage = {
    id: `sch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    threadId,
    text: trimmed,
    mode: "timer",
    sendAt: Date.now() + delayMs,
    createdAt: Date.now(),
    quiet: true,
  };
  const next = [...loadScheduled(), item];
  saveScheduled(next);
  return next;
}

export function scheduleWhenOnline(threadId: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) return loadScheduled();
  const chat = getChat(threadId);
  if (!chat || chat.type !== "dm") return loadScheduled();
  const peer = peerOf(chat);
  if (!peer) return loadScheduled();

  const item: ScheduledMessage = {
    id: `sch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    threadId,
    text: trimmed,
    mode: "when_online",
    peerId: peer.id,
    createdAt: Date.now(),
    quiet: true,
  };
  const next = [...loadScheduled(), item];
  saveScheduled(next);
  if (!isUserOnline(peer.id)) armQuietOnline(peer.id);
  return next;
}

export function cancelScheduled(id: string) {
  const next = loadScheduled().filter((m) => m.id !== id);
  saveScheduled(next);
  return next;
}

export function processDueScheduled() {
  const now = Date.now();
  const all = loadScheduled();
  if (!all.length) return { remaining: all, sent: [] as ScheduledMessage[] };

  const sent: ScheduledMessage[] = [];
  const remaining: ScheduledMessage[] = [];

  for (const item of all) {
    let due = false;
    if (item.mode === "timer" && item.sendAt && item.sendAt <= now) due = true;
    if (item.mode === "when_online" && item.peerId && isUserOnline(item.peerId)) due = true;

    if (due) {
      sendChatMessage(item.threadId, item.text);
      sent.push(item);
    } else {
      remaining.push(item);
    }
  }

  if (sent.length) saveScheduled(remaining);
  return { remaining, sent };
}

export function scheduledForThread(threadId: string) {
  return loadScheduled().filter((m) => m.threadId === threadId);
}
