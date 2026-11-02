export const CIRCLE_KEY = "friends.circle.v1";
export const INVITES_KEY = "friends.invites.v1";

export type CirclePrivacy = {
  /** Who can see the wall */
  wall: "friends" | "close" | "only_me";
  /** Who can message */
  messages: "friends" | "close" | "nobody";
  /** Who can call */
  calls: "friends" | "close";
  /** Who appears in search for others */
  searchable: boolean;
  /** Show online status */
  showOnline: boolean;
};

export type InviteCode = {
  code: string;
  note: string;
  createdAt: string;
  usesLeft: number;
};

const privacyDefaults: CirclePrivacy = {
  wall: "friends",
  messages: "friends",
  calls: "close",
  searchable: false,
  showOnline: true,
};

export function loadPrivacy(): CirclePrivacy {
  if (typeof window === "undefined") return privacyDefaults;
  try {
    const raw = localStorage.getItem(CIRCLE_KEY);
    if (!raw) return privacyDefaults;
    return { ...privacyDefaults, ...(JSON.parse(raw) as Partial<CirclePrivacy>) };
  } catch {
    return privacyDefaults;
  }
}

export function savePrivacy(next: CirclePrivacy) {
  localStorage.setItem(CIRCLE_KEY, JSON.stringify(next));
}

export function loadInvites(): InviteCode[] {
  if (typeof window === "undefined") return seedInvites();
  try {
    const raw = localStorage.getItem(INVITES_KEY);
    if (!raw) return seedInvites();
    const parsed = JSON.parse(raw) as InviteCode[];
    return Array.isArray(parsed) && parsed.length ? parsed : seedInvites();
  } catch {
    return seedInvites();
  }
}

function seedInvites(): InviteCode[] {
  return [
    {
      code: "BLIZKIE",
      note: "Общий код для близких",
      createdAt: "сегодня",
      usesLeft: 12,
    },
  ];
}

export function saveInvites(next: InviteCode[]) {
  localStorage.setItem(INVITES_KEY, JSON.stringify(next));
}

export function createInvite(note = "Приглашение в круг") {
  const code = `F-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const item: InviteCode = {
    code,
    note,
    createdAt: "сейчас",
    usesLeft: 5,
  };
  const next = [item, ...loadInvites()];
  saveInvites(next);
  return { invites: next, item };
}

export function validateInvite(code: string): { ok: true } | { ok: false; error: string } {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: false, error: "empty" };
  const found = loadInvites().find((i) => i.code.toUpperCase() === normalized);
  if (!found) return { ok: false, error: "invalid" };
  if (found.usesLeft <= 0) return { ok: false, error: "exhausted" };
  return { ok: true };
}

export function consumeInvite(code: string): { ok: true } | { ok: false; error: string } {
  const check = validateInvite(code);
  if (!check.ok) return check;
  const normalized = code.trim().toUpperCase();
  saveInvites(
    loadInvites().map((i) =>
      i.code.toUpperCase() === normalized ? { ...i, usesLeft: i.usesLeft - 1 } : i,
    ),
  );
  return { ok: true };
}

export function privacyLabel(value: CirclePrivacy["wall"] | CirclePrivacy["messages"] | CirclePrivacy["calls"]) {
  if (value === "only_me") return "Только я";
  if (value === "close") return "Близкий круг";
  if (value === "nobody") return "Никто";
  return "Друзья";
}
