import { api } from "./api";
import type { FriendsState, Person, UserDTO } from "./dto";
import { getSessionUser } from "./sessionUser";

let peopleCache = new Map<string, Person>();

export function rememberPeople(people: Person[]) {
  peopleCache = new Map(people.map((person) => [person.id, person]));
}

export function cachePerson(person: Person | null | undefined) {
  if (person) peopleCache.set(person.id, person);
}

export function getPerson(id: string): Person | undefined {
  if (id === getSessionUser().id) {
    const me = getSessionUser();
    return {
      id: me.id,
      name: me.name,
      avatar: me.avatar,
      photo: me.photo,
      online: true,
    };
  }
  return peopleCache.get(id);
}

export function peopleList(): Person[] {
  return Array.from(peopleCache.values());
}

export type FriendsPayload = {
  state: FriendsState;
  people: Person[];
  online: string[];
};

export async function fetchFriends(): Promise<FriendsPayload> {
  const data = await api<FriendsPayload>("/api/friends");
  rememberPeople(data.people);
  return data;
}

export async function fetchPeople(): Promise<Person[]> {
  const data = await api<{ people: Person[] }>("/api/people");
  rememberPeople(data.people);
  return data.people;
}

export type FriendAction =
  | "request"
  | "accept"
  | "decline"
  | "cancel"
  | "remove"
  | "follow";

export async function friendAction(userId: string, action: FriendAction): Promise<FriendsState> {
  const data = await api<{ state: FriendsState }>(`/api/friends/${userId}`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
  return data.state;
}

export function relationOf(id: string, state: FriendsState): Person["relation"] {
  if (state.friendIds.includes(id)) return "friend";
  if (state.incoming.includes(id)) return "incoming";
  if (state.outgoing.includes(id)) return "outgoing";
  if (state.following.includes(id)) return "following";
  return "none";
}

export function searchPeople(query: string, people: UserDTO[] = peopleList()) {
  const needle = query.trim().toLowerCase();
  return people.filter((person) => {
    if (person.id === getSessionUser().id) return false;
    if (!needle) return true;
    return (
      person.name.toLowerCase().includes(needle) ||
      (person.city ?? "").toLowerCase().includes(needle) ||
      (person.bio ?? "").toLowerCase().includes(needle)
    );
  });
}
