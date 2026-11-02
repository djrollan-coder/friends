export type Playlist = {
  id: string;
  title: string;
  count: number;
  cover: string;
};

export const playlists: Playlist[] = [
  { id: "pl1", title: "Ночной драйв", count: 0, cover: "НД" },
  { id: "pl2", title: "Для работы", count: 0, cover: "ДР" },
  { id: "pl3", title: "Любимое", count: 0, cover: "♥" },
  { id: "pl4", title: "Инди / электро", count: 0, cover: "ИЭ" },
  { id: "pl5", title: "Спорт", count: 0, cover: "СП" },
];
