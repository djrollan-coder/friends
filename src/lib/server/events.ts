export type LiveEvent = {
  type:
    | "message"
    | "post"
    | "post-updated"
    | "friends"
    | "notification"
    | "group"
    | "presence";
  [key: string]: unknown;
};

type Client = {
  userId: string;
  send: (event: LiveEvent) => void;
};

const store = globalThis as typeof globalThis & {
  __friendsLiveClients?: Set<Client>;
};

function clients() {
  if (!store.__friendsLiveClients) store.__friendsLiveClients = new Set();
  return store.__friendsLiveClients;
}

export function subscribeLive(userId: string, send: (event: LiveEvent) => void) {
  const client: Client = { userId, send };
  clients().add(client);
  return () => {
    clients().delete(client);
  };
}

export function publishLive(userIds: string[] | null, event: LiveEvent) {
  const set = clients();
  if (!set.size) return;
  const allowed = userIds ? new Set(userIds) : null;
  for (const client of set) {
    if (allowed && !allowed.has(client.userId)) continue;
    try {
      client.send(event);
    } catch {
      set.delete(client);
    }
  }
}

export function onlineUserIds() {
  return Array.from(new Set(Array.from(clients()).map((c) => c.userId)));
}
