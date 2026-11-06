export type User = {
  id: string;
  name: string;
  avatar: string;
  photo?: string;
  cover?: string;
  status?: string;
  online?: boolean;
};

export type Post = {
  id: string;
  author: User;
  text: string;
  createdAt: string;
  likes: number;
  comments: number;
  reposts: number;
  attachment?: {
    name: string;
    size: string;
    type: "file" | "photo";
  };
};

export type MessageThread = {
  id: string;
  user: User;
  preview: string;
  time: string;
  unread?: number;
};

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  badge?: number;
};

export const currentUser: User = {
  id: "1",
  name: "Роман Моторный",
  avatar: "РМ",
  photo: "/profile/avatar.jpg",
  cover: "/profile/cover.jpg",
  status: "Строим соцсеть",
  online: true,
};

export const friends: User[] = [
  { id: "2", name: "Анна Ковалёва", avatar: "АК", online: true },
  { id: "3", name: "Игорь Смирнов", avatar: "ИС", online: true },
  { id: "4", name: "Мария Петрова", avatar: "МП", online: false },
  { id: "5", name: "Дмитрий Орлов", avatar: "ДО", online: true },
  { id: "6", name: "Елена Васильева", avatar: "ЕВ", online: false },
  { id: "7", name: "Павел Кузнецов", avatar: "ПК", online: true },
  { id: "8", name: "Ольга Новикова", avatar: "ОН", online: true },
  { id: "9", name: "Сергей Волков", avatar: "СВ", online: false },
];

export const onlineFriends = friends.filter((f) => f.online);

export const navItems: NavItem[] = [
  { href: "/", label: "Профиль", icon: "profile" },
  { href: "/feed", label: "Новости", icon: "feed" },
  { href: "/messages", label: "Мессенджер", icon: "messages", badge: 1 },
  { href: "/friends", label: "Друзья", icon: "friends" },
  { href: "/groups", label: "Сообщества", icon: "groups" },
  { href: "/photos", label: "Фото", icon: "photos" },
  { href: "/audio", label: "Музыка", icon: "audio" },
  { href: "/videos", label: "Видео", icon: "videos" },
  { href: "/bookmarks", label: "Закладки", icon: "bookmarks" },
];

export const extraNav: NavItem[] = [
  { href: "/apps", label: "Сервисы", icon: "apps", badge: 13 },
  { href: "/docs", label: "Файлы", icon: "docs" },
  { href: "/support", label: "Поддержка", icon: "support" },
  { href: "/settings", label: "Настройки", icon: "settings" },
];

export const shortcutLinks = [
  "Фильмы ужасов",
  "Эмулятор xbox 360",
  "Корона Вирус",
  "Мои гости",
] as const;

export const initialPosts: Post[] = [
  {
    id: "p1",
    author: currentUser,
    text: "Запускаем первую версию Friends. Стена, друзья, сообщения — всё на месте.",
    createdAt: "сегодня в 19:05",
    likes: 12,
    comments: 3,
    reposts: 1,
  },
  {
    id: "p2",
    author: {
      id: "g1",
      name: "Friends News",
      avatar: "FN",
    },
    text: "Обновление 0.608\n— тёмная тема и современные цвета\n— широкий layout как в новом ВК\n— обновлён интерфейс ленты",
    createdAt: "сегодня в 18:40",
    likes: 248,
    comments: 41,
    reposts: 17,
    attachment: {
      name: "0.608.zip",
      size: "370 КБ",
      type: "file",
    },
  },
  {
    id: "p3",
    author: friends[0],
    text: "Friends уже похож на нормальную соцсеть — слева меню, справа друзья онлайн.",
    createdAt: "вчера в 21:40",
    likes: 56,
    comments: 8,
    reposts: 2,
  },
];

export const messages: MessageThread[] = [
  {
    id: "m1",
    user: friends[0],
    preview: "Привет! Когда покажешь прототип?",
    time: "18:41",
    unread: 1,
  },
  {
    id: "m2",
    user: friends[1],
    preview: "Скинь ссылку на стену",
    time: "17:12",
  },
  {
    id: "m3",
    user: friends[4],
    preview: "Friends смотрится круто 🔥",
    time: "вчера",
  },
];

export const profileInfo = [
  { label: "День рождения:", value: "1 ноября" },
  { label: "Город:", value: "Москва" },
  { label: "Семейное положение:", value: "в активном поиске" },
];

export type HotNewsItem = {
  id: string;
  title: string;
  source: string;
  views: string;
};

export const hotNews: HotNewsItem[] = [
  {
    id: "hn1",
    title: "Релиз Friends 0.608: новая лента и тёмное стекло",
    source: "Friends News",
    views: "24K",
  },
  {
    id: "hn2",
    title: "Как настроить интересы, чтобы лента не была скучной",
    source: "Советы",
    views: "11K",
  },
  {
    id: "hn3",
    title: "Москва ночью: подборка мест для прогулок",
    source: "Город",
    views: "8.4K",
  },
  {
    id: "hn4",
    title: "Инди и электро: свежие треки недели",
    source: "Музыка",
    views: "6.1K",
  },
  {
    id: "hn5",
    title: "Что смотреть в выходные: короткий гид",
    source: "Кино",
    views: "5.2K",
  },
];

export { interestOptions, DEFAULT_INTERESTS } from "./interests";
