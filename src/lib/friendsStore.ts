import { currentUser, friends as seedFriends, type User } from "@/data/mock";
import { pushNotification } from "./notify";

export const FRIENDS_KEY = "friends.social.friends.v1";

export type PeopleDirectory = User & {
  city?: string;
  bio?: string;
};

export type FriendsState = {
  friendIds: string[];
  incoming: string[];
  outgoing: string[];
  following: string[];
};

export const peopleDirectory: PeopleDirectory[] = [
  ...seedFriends.map((f) => ({
    ...f,
    city: "Москва",
    bio: "В Friends с первого дня",
  })),
  {
    id: "10",
    name: "Кира Лебедева",
    avatar: "КЛ",
    online: true,
    city: "Казань",
    bio: "Дизайн и фото",
  },
  {
    id: "11",
    name: "Никита Белов",
    avatar: "НБ",
    online: false,
    city: "Санкт-Петербург",
    bio: "Инди-игры",
  },
  {
    id: "12",
    name: "Алина Морозова",
    avatar: "АМ",
    online: true,
    city: "Екатеринбург",
    bio: "Музыка и подкасты",
  },
  {
    id: "13",
    name: "Тимур Сафин",
    avatar: "ТС",
    online: false,
    city: "Уфа",
    bio: "Спорт и бег",
  },
  {
    id: "14",
    name: "София Громова",
    avatar: "СГ",
    online: true,
    city: "Новосибирск",
    bio: "Научпоп",
  },
];

const defaults: FriendsState = {
  friendIds: seedFriends.map((f) => f.id),
  incoming: ["10", "11"],
  outgoing: ["13"],
  following: ["12", "g1"],
};

export function loadFriendsState(): FriendsState {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(FRIENDS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<FriendsState>;
    return {
      friendIds: parsed.friendIds ?? defaults.friendIds,
      incoming: parsed.incoming ?? defaults.incoming,
      outgoing: parsed.outgoing ?? defaults.outgoing,
      following: parsed.following ?? defaults.following,
    };
  } catch {
    return defaults;
  }
}

export function saveFriendsState(next: FriendsState) {
  localStorage.setItem(FRIENDS_KEY, JSON.stringify(next));
}

export function getPerson(id: string) {
  if (id === currentUser.id) return currentUser;
  return peopleDirectory.find((p) => p.id === id);
}

export function searchPeople(query: string, state = loadFriendsState()) {
  const q = query.trim().toLowerCase();
  return peopleDirectory.filter((p) => {
    if (p.id === currentUser.id) return false;
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      (p.city ?? "").toLowerCase().includes(q) ||
      (p.bio ?? "").toLowerCase().includes(q)
    );
  }).map((p) => ({
    ...p,
    relation: state.friendIds.includes(p.id)
      ? ("friend" as const)
      : state.incoming.includes(p.id)
        ? ("incoming" as const)
        : state.outgoing.includes(p.id)
          ? ("outgoing" as const)
          : state.following.includes(p.id)
            ? ("following" as const)
            : ("none" as const),
  }));
}

export function recommendations(state = loadFriendsState()) {
  return peopleDirectory.filter(
    (p) =>
      !state.friendIds.includes(p.id) &&
      !state.incoming.includes(p.id) &&
      !state.outgoing.includes(p.id) &&
      p.id !== currentUser.id,
  );
}

export function sendFriendRequest(state: FriendsState, userId: string): FriendsState {
  if (state.friendIds.includes(userId) || state.outgoing.includes(userId)) return state;
  const next = {
    ...state,
    incoming: state.incoming.filter((id) => id !== userId),
    outgoing: [...state.outgoing, userId],
  };
  saveFriendsState(next);
  const person = getPerson(userId);
  pushNotification({
    type: "friend",
    title: "Заявка отправлена",
    body: `Вы отправили заявку пользователю ${person?.name ?? "другу"}`,
    href: "/friends?tab=outgoing",
  });
  return next;
}

export function acceptFriend(state: FriendsState, userId: string): FriendsState {
  const next = {
    ...state,
    incoming: state.incoming.filter((id) => id !== userId),
    outgoing: state.outgoing.filter((id) => id !== userId),
    friendIds: state.friendIds.includes(userId)
      ? state.friendIds
      : [...state.friendIds, userId],
  };
  saveFriendsState(next);
  const person = getPerson(userId);
  pushNotification({
    type: "friend",
    title: "Новый друг",
    body: `${person?.name ?? "Пользователь"} теперь у вас в друзьях`,
    href: "/friends",
  });
  return next;
}

export function declineFriend(state: FriendsState, userId: string): FriendsState {
  const next = {
    ...state,
    incoming: state.incoming.filter((id) => id !== userId),
  };
  saveFriendsState(next);
  return next;
}

export function cancelOutgoing(state: FriendsState, userId: string): FriendsState {
  const next = {
    ...state,
    outgoing: state.outgoing.filter((id) => id !== userId),
  };
  saveFriendsState(next);
  return next;
}

export function toggleFollow(state: FriendsState, userId: string): FriendsState {
  const next = {
    ...state,
    following: state.following.includes(userId)
      ? state.following.filter((id) => id !== userId)
      : [...state.following, userId],
  };
  saveFriendsState(next);
  return next;
}

export function removeFriend(state: FriendsState, userId: string): FriendsState {
  const next = {
    ...state,
    friendIds: state.friendIds.filter((id) => id !== userId),
  };
  saveFriendsState(next);
  return next;
}
