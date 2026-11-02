export const RIGHT_BLOCKS_KEY = "friends.right.blocks.v1";

export type RightBlockId =
  | "hot-news"
  | "interests"
  | "playlists"
  | "player"
  | "stories";

export const RIGHT_BLOCK_IDS: RightBlockId[] = [
  "hot-news",
  "interests",
  "playlists",
  "player",
  "stories",
];

export const RIGHT_BLOCK_LABEL_KEYS: Record<RightBlockId, string> = {
  "hot-news": "right.hot",
  interests: "right.interests",
  playlists: "right.playlists",
  player: "nav.audio",
  stories: "stories.title",
};

const DEFAULT: RightBlockId[] = ["hot-news", "interests", "stories"];

export function loadRightBlocks(): RightBlockId[] {
  if (typeof window === "undefined") return [...DEFAULT];
  try {
    const raw = localStorage.getItem(RIGHT_BLOCKS_KEY);
    if (!raw) return [...DEFAULT];
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return [...DEFAULT];
    const known = new Set(RIGHT_BLOCK_IDS);
    const cleaned = parsed.filter((id): id is RightBlockId =>
      known.has(id as RightBlockId),
    );
    return cleaned.length ? cleaned : [...DEFAULT];
  } catch {
    return [...DEFAULT];
  }
}

export function saveRightBlocks(next: RightBlockId[]) {
  const known = new Set(RIGHT_BLOCK_IDS);
  const cleaned = next.filter((id) => known.has(id));
  localStorage.setItem(RIGHT_BLOCKS_KEY, JSON.stringify(cleaned));
  window.dispatchEvent(new Event("friends-right-blocks-changed"));
  return cleaned;
}

export function toggleRightBlock(id: RightBlockId) {
  const current = loadRightBlocks();
  const next = current.includes(id)
    ? current.filter((x) => x !== id)
    : [...current, id];
  return saveRightBlocks(next);
}

export function isRightBlockEnabled(id: RightBlockId, list?: RightBlockId[]) {
  return (list ?? loadRightBlocks()).includes(id);
}
