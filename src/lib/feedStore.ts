import { currentUser, friends, initialPosts, type Post, type User } from "@/data/mock";
import { pushNotification } from "./notify";

export const FEED_KEY = "friends.feed.v1";
export const BOOKMARKS_KEY = "friends.bookmarks.v1";

export type FeedComment = {
  id: string;
  author: User;
  text: string;
  createdAt: string;
};

export type FeedPost = Post & {
  likedByMe?: boolean;
  bookmarked?: boolean;
  image?: string;
  video?: string;
  commentList?: FeedComment[];
  groupId?: string;
};

function nowLabel() {
  const d = new Date();
  return `сегодня в ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function seed(): FeedPost[] {
  return initialPosts.map((p, i) => ({
    ...p,
    likedByMe: false,
    bookmarked: false,
    commentList:
      i === 0
        ? [
            {
              id: "c1",
              author: friends[0],
              text: "Огонь, жду продолжения!",
              createdAt: "сегодня в 19:10",
            },
          ]
        : [],
  }));
}

export function loadFeed(): FeedPost[] {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(FEED_KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as FeedPost[];
    return Array.isArray(parsed) && parsed.length ? parsed : seed();
  } catch {
    return seed();
  }
}

export function saveFeed(next: FeedPost[]) {
  localStorage.setItem(FEED_KEY, JSON.stringify(next));
}

export function loadBookmarks(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveBookmarks(ids: string[]) {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(ids));
}

export function createPost(input: {
  text: string;
  image?: string;
  video?: string;
  groupId?: string;
  author?: User;
}): FeedPost {
  const post: FeedPost = {
    id: `p_${Date.now()}`,
    author: input.author ?? currentUser,
    text: input.text.trim(),
    createdAt: nowLabel(),
    likes: 0,
    comments: 0,
    reposts: 0,
    likedByMe: false,
    bookmarked: false,
    image: input.image,
    video: input.video,
    commentList: [],
    groupId: input.groupId,
  };
  const next = [post, ...loadFeed()];
  saveFeed(next);
  return post;
}

export function toggleLike(postId: string) {
  const next = loadFeed().map((p) => {
    if (p.id !== postId) return p;
    const likedByMe = !p.likedByMe;
    return {
      ...p,
      likedByMe,
      likes: Math.max(0, p.likes + (likedByMe ? 1 : -1)),
    };
  });
  saveFeed(next);
  const post = next.find((p) => p.id === postId);
  if (post?.likedByMe && post.author.id !== currentUser.id) {
    pushNotification({
      type: "like",
      title: "Новая реакция",
      body: `Вы лайкнули запись ${post.author.name}`,
      href: "/feed",
    });
  }
  return next;
}

export function addComment(postId: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) return loadFeed();
  const comment: FeedComment = {
    id: `c_${Date.now()}`,
    author: currentUser,
    text: trimmed,
    createdAt: nowLabel(),
  };
  const next = loadFeed().map((p) => {
    if (p.id !== postId) return p;
    const commentList = [...(p.commentList ?? []), comment];
    return {
      ...p,
      commentList,
      comments: commentList.length,
    };
  });
  saveFeed(next);
  const post = next.find((p) => p.id === postId);
  if (post && post.author.id !== currentUser.id) {
    pushNotification({
      type: "comment",
      title: "Новый комментарий",
      body: `${currentUser.name}: ${trimmed.slice(0, 80)}`,
      href: "/feed",
    });
  }
  return next;
}

export function repost(postId: string) {
  const feed = loadFeed();
  const original = feed.find((p) => p.id === postId);
  if (!original) return feed;
  const copy: FeedPost = {
    ...original,
    id: `p_${Date.now()}`,
    author: currentUser,
    text: `Репост: ${original.text}`,
    createdAt: nowLabel(),
    likes: 0,
    comments: 0,
    reposts: 0,
    likedByMe: false,
    bookmarked: false,
    commentList: [],
  };
  const next = [
    copy,
    ...feed.map((p) =>
      p.id === postId ? { ...p, reposts: p.reposts + 1 } : p,
    ),
  ];
  saveFeed(next);
  pushNotification({
    type: "repost",
    title: "Репост",
    body: `Вы поделились записью ${original.author.name}`,
    href: "/feed",
  });
  return next;
}

export function toggleBookmark(postId: string) {
  const marks = loadBookmarks();
  const nextMarks = marks.includes(postId)
    ? marks.filter((id) => id !== postId)
    : [...marks, postId];
  saveBookmarks(nextMarks);
  const next = loadFeed().map((p) =>
    p.id === postId ? { ...p, bookmarked: nextMarks.includes(postId) } : p,
  );
  saveFeed(next);
  return { feed: next, bookmarks: nextMarks };
}
