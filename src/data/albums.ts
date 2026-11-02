export type Album = {
  id: string;
  title: string;
  count: number;
  cover: string;
  tone: string;
};

export type PhotoItem = {
  id: string;
  albumId: string;
  title: string;
  tone: string;
  label: string;
  createdAt: string; // ISO for sorting
  createdLabel: string;
  likes: number;
};

export const albums: Album[] = [
  {
    id: "a1",
    title: "Фотографии с страницы",
    count: 6,
    cover: "ПС",
    tone: "linear-gradient(145deg, #8a6348, #3a2c24)",
  },
  {
    id: "a2",
    title: "Фотографии на стене",
    count: 6,
    cover: "НС",
    tone: "linear-gradient(145deg, #a07850, #4a3528)",
  },
  {
    id: "a3",
    title: "Сохранённые фотографии",
    count: 2,
    cover: "СФ",
    tone: "linear-gradient(145deg, #c4784a, #5a3a28)",
  },
  {
    id: "a4",
    title: "Фотографии со мной",
    count: 4,
    cover: "СМ",
    tone: "linear-gradient(145deg, #9a6a48, #3a281c)",
  },
  {
    id: "a5",
    title: "Мои фотографии",
    count: 6,
    cover: "МФ",
    tone: "linear-gradient(145deg, #7a5840, #2a2018)",
  },
];

const tones = albums.map((a) => a.tone);

function makePhotos(): PhotoItem[] {
  const titles = [
    "Вечер на крыше",
    "Кофе в центре",
    "Друзья у озера",
    "Рабочий стол",
    "Закат на МКАД",
    "Кухня в субботу",
    "Концерт в клубе",
    "Утренний парк",
    "Домашний кот",
    "Поезд в Питер",
    "Новый плеер",
    "Съёмка профиля",
    "Встреча команды",
    "Окно после дождя",
    "Плейлист ночью",
    "Семейный ужин",
    "Прогулка вдвоём",
    "Старый двор",
    "Лампы на кухне",
    "Мост и туман",
    "Кадр с балкона",
    "Архив 2024",
    "Любимое место",
    "Случайный портрет",
  ];

  const dates = [
    ["2026-10-28T19:10:00", "28 окт"],
    ["2026-10-20T12:40:00", "20 окт"],
    ["2026-09-14T18:05:00", "14 сен"],
    ["2026-08-02T09:20:00", "2 авг"],
    ["2026-07-18T21:00:00", "18 июл"],
    ["2026-06-11T16:30:00", "11 июн"],
    ["2026-05-03T11:15:00", "3 мая"],
    ["2025-12-31T23:50:00", "31 дек"],
  ];

  const items: PhotoItem[] = [];
  let n = 0;
  for (const album of albums) {
    const count = Math.min(album.count, 6);
    for (let i = 0; i < count; i++) {
      const date = dates[n % dates.length];
      items.push({
        id: `ph_${album.id}_${i}`,
        albumId: album.id,
        title: titles[n % titles.length],
        tone: tones[n % tones.length],
        label: album.cover,
        createdAt: date[0],
        createdLabel: date[1],
        likes: ((n * 7) % 40) + (n % 5),
      });
      n += 1;
    }
  }
  return items;
}

export const photos: PhotoItem[] = makePhotos();

export function albumTitle(albumId: string) {
  return albums.find((a) => a.id === albumId)?.title ?? "Альбом";
}
