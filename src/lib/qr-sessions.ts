export type QrSession = {
  token: string;
  status: "pending" | "confirmed" | "expired";
  createdAt: number;
  user?: {
    id: string;
    name: string;
    username?: string;
    avatar: string;
  };
};

const g = globalThis as typeof globalThis & {
  __friendsQrSessions?: Map<string, QrSession>;
};

function store() {
  if (!g.__friendsQrSessions) {
    g.__friendsQrSessions = new Map();
  }
  return g.__friendsQrSessions;
}

export function createQrSession(): QrSession {
  const token = crypto.randomUUID().replace(/-/g, "");
  const session: QrSession = {
    token,
    status: "pending",
    createdAt: Date.now(),
  };
  store().set(token, session);
  return session;
}

export function getQrSession(token: string) {
  const session = store().get(token);
  if (!session) return null;
  if (Date.now() - session.createdAt > 5 * 60 * 1000) {
    session.status = "expired";
  }
  return session;
}

export function confirmQrSession(token: string) {
  const session = getQrSession(token);
  if (!session || session.status === "expired") return null;
  session.status = "confirmed";
  session.user = {
    id: "tg-42",
    name: "Роман Моторный",
    username: "roman",
    avatar: "РМ",
  };
  store().set(token, session);
  return session;
}
