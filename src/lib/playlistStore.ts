import { loadTracks } from "./tracksStore";

export const PLAYLISTS_KEY = "friends.playlists.v1";

export type PlaylistData = {
  id: string;
  title: string;
  cover: string;
  trackIds: string[];
};

const seed: PlaylistData[] = [
  {
    id: "pl1",
    title: "Ночной драйв",
    cover: "НД",
    trackIds: [],
  },
  {
    id: "pl2",
    title: "Для работы",
    cover: "ДР",
    trackIds: [],
  },
  {
    id: "pl3",
    title: "Любимое",
    cover: "♥",
    trackIds: [],
  },
  {
    id: "pl4",
    title: "Инди / электро",
    cover: "ИЭ",
    trackIds: [],
  },
  {
    id: "pl5",
    title: "Спорт",
    cover: "СП",
    trackIds: [],
  },
];

function knownIds() {
  return new Set(loadTracks().map((t) => t.id));
}

function ensureSeed(): PlaylistData[] {
  return seed.map((pl) => ({ ...pl, trackIds: [...pl.trackIds] }));
}

export function loadPlaylists(): PlaylistData[] {
  if (typeof window === "undefined") return ensureSeed();
  const known = knownIds();
  try {
    const raw = localStorage.getItem(PLAYLISTS_KEY);
    if (!raw) return ensureSeed();
    const parsed = JSON.parse(raw) as PlaylistData[];
    if (!Array.isArray(parsed) || !parsed.length) return ensureSeed();
    const seedIds = new Set(seed.map((p) => p.id));
    const cleaned = parsed
      .filter((p) => seedIds.has(p.id))
      .map((p) => ({
        ...p,
        trackIds: Array.isArray(p.trackIds)
          ? p.trackIds.filter((id) => known.has(id))
          : [],
      }));
    for (const s of ensureSeed()) {
      if (!cleaned.some((p) => p.id === s.id)) cleaned.push(s);
    }
    return cleaned;
  } catch {
    return ensureSeed();
  }
}

export function savePlaylists(next: PlaylistData[]) {
  localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(next));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("friends-playlists-changed"));
  }
}

function coverFromTitle(title: string) {
  const parts = title
    .trim()
    .split(/[\s/_·|+-]+/)
    .filter(Boolean);
  if (!parts.length) return "♪";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase() || "♪";
}

export function renamePlaylist(
  list: PlaylistData[],
  playlistId: string,
  title: string,
): PlaylistData[] {
  const nextTitle = title.trim();
  if (!nextTitle) return list;
  return list.map((pl) => {
    if (pl.id !== playlistId) return pl;
    return {
      ...pl,
      title: nextTitle,
      cover: coverFromTitle(nextTitle),
    };
  });
}

export function reorderPlaylistTracks(
  list: PlaylistData[],
  playlistId: string,
  fromId: string,
  toId: string,
): PlaylistData[] {
  return list.map((pl) => {
    if (pl.id !== playlistId) return pl;
    const ids = [...pl.trackIds];
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0 || from === to) return pl;
    ids.splice(from, 1);
    ids.splice(to, 0, fromId);
    return { ...pl, trackIds: ids };
  });
}

export function addTrackToPlaylist(
  list: PlaylistData[],
  playlistId: string,
  trackId: string,
): PlaylistData[] {
  return list.map((pl) => {
    if (pl.id !== playlistId) return pl;
    if (pl.trackIds.includes(trackId)) return pl;
    return { ...pl, trackIds: [...pl.trackIds, trackId] };
  });
}

export function removeTrackFromPlaylist(
  list: PlaylistData[],
  playlistId: string,
  trackId: string,
): PlaylistData[] {
  return list.map((pl) => {
    if (pl.id !== playlistId) return pl;
    return { ...pl, trackIds: pl.trackIds.filter((id) => id !== trackId) };
  });
}
