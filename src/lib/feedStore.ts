import { api } from "./api";
import type { FeedPost } from "./dto";

export type { FeedPost, FeedComment } from "./dto";

export type FeedQuery = {
  author?: string;
  group?: string;
  q?: string;
  limit?: number;
};

export async function fetchFeed(query: FeedQuery = {}): Promise<FeedPost[]> {
  const params = new URLSearchParams();
  if (query.author) params.set("author", query.author);
  if (query.group) params.set("group", query.group);
  if (query.q) params.set("q", query.q);
  if (query.limit) params.set("limit", String(query.limit));
  const suffix = params.toString();
  const data = await api<{ posts: FeedPost[] }>(`/api/feed${suffix ? `?${suffix}` : ""}`);
  return data.posts;
}

export async function createPost(input: {
  text?: string;
  image?: string;
  video?: string;
  groupId?: string;
  attachment?: unknown;
}): Promise<FeedPost | null> {
  const data = await api<{ post: FeedPost | null }>("/api/feed", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.post;
}

export type PostAction = "like" | "comment" | "repost" | "bookmark";

export async function postAction(postId: string, action: PostAction, text?: string) {
  return api<{ ok?: boolean; liked?: boolean; bookmarked?: boolean; id?: string }>(
    `/api/posts/${postId}`,
    {
      method: "POST",
      body: JSON.stringify({ action, text }),
    },
  );
}

export async function fetchBookmarks(): Promise<FeedPost[]> {
  const data = await api<{ posts: FeedPost[] }>("/api/bookmarks");
  return data.posts;
}

export async function deletePost(postId: string) {
  return api<{ ok: boolean }>(`/api/posts/${postId}`, { method: "DELETE" });
}
