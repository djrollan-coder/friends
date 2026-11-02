export const VIDEOS_KEY = "friends.videos.v1";

export type VideoItem = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  createdLabel: string;
  duration: string;
  views: number;
  tone: string;
  cover: string;
  src?: string;
};

const tones = [
  "linear-gradient(145deg, #8a6348, #3a2c24)",
  "linear-gradient(145deg, #a07850, #4a3528)",
  "linear-gradient(145deg, #c4784a, #5a3a28)",
  "linear-gradient(145deg, #9a6a48, #3a281c)",
  "linear-gradient(145deg, #7a5840, #2a2018)",
];

function nowMeta() {
  const d = new Date();
  return {
    createdAt: d.toISOString(),
    createdLabel: `сегодня в ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
  };
}

function seed(): VideoItem[] {
  return [
    {
      id: "v1",
      title: "Вечерний драйв",
      description: "Короткий клип под плейлист Ночной драйв",
      createdAt: "2026-10-28T20:10:00.000Z",
      createdLabel: "28 окт",
      duration: "0:42",
      views: 128,
      tone: tones[0],
      cover: "ВД",
    },
    {
      id: "v2",
      title: "Как устроен Friends",
      description: "Мини-демо интерфейса для близкого круга",
      createdAt: "2026-10-12T14:00:00.000Z",
      createdLabel: "12 окт",
      duration: "1:18",
      views: 86,
      tone: tones[1],
      cover: "FR",
    },
    {
      id: "v3",
      title: "Семейный ужин",
      description: "Домашнее видео для круга",
      createdAt: "2026-09-02T18:40:00.000Z",
      createdLabel: "2 сен",
      duration: "0:27",
      views: 54,
      tone: tones[2],
      cover: "СУ",
    },
  ];
}

export function loadVideos(): VideoItem[] {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(VIDEOS_KEY);
    if (!raw) {
      const initial = seed();
      saveVideos(initial);
      return initial;
    }
    const parsed = JSON.parse(raw) as VideoItem[];
    if (!Array.isArray(parsed) || !parsed.length) {
      const initial = seed();
      saveVideos(initial);
      return initial;
    }
    return parsed;
  } catch {
    return seed();
  }
}

export function saveVideos(next: VideoItem[]) {
  localStorage.setItem(VIDEOS_KEY, JSON.stringify(next));
}

export function addVideo(input: {
  title: string;
  description?: string;
  src?: string;
  duration?: string;
}): VideoItem[] {
  const meta = nowMeta();
  const title = input.title.trim() || "Без названия";
  const item: VideoItem = {
    id: `v_${Date.now()}`,
    title,
    description: input.description?.trim() || "Добавлено вами",
    createdAt: meta.createdAt,
    createdLabel: meta.createdLabel,
    duration: input.duration || "0:00",
    views: 0,
    tone: tones[Math.floor(Math.random() * tones.length)],
    cover: title
      .split(/\s+/)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    src: input.src,
  };
  const next = [item, ...loadVideos()];
  saveVideos(next);
  return next;
}

export function removeVideo(id: string) {
  const next = loadVideos().filter((v) => v.id !== id);
  saveVideos(next);
  return next;
}

export function bumpViews(id: string) {
  const next = loadVideos().map((v) =>
    v.id === id ? { ...v, views: v.views + 1 } : v,
  );
  saveVideos(next);
  return next;
}
