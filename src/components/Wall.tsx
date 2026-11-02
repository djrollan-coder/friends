"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/I18nProvider";
import { Composer } from "./Composer";
import { PostCard } from "./PostCard";
import {
  addComment,
  createPost,
  loadFeed,
  repost,
  toggleBookmark,
  toggleLike,
  type FeedPost,
} from "@/lib/feedStore";
import { getSessionUser } from "@/lib/sessionUser";

export function Wall() {
  const t = useT();
  const [posts, setPosts] = useState<FeedPost[]>([]);

  useEffect(() => {
    const me = getSessionUser().id;
    setPosts(loadFeed().filter((p) => p.author.id === me));
  }, []);

  function refresh(next: FeedPost[]) {
    const me = getSessionUser().id;
    setPosts(next.filter((p) => p.author.id === me));
  }

  return (
    <div className="vk-wall-stack">
      <div className="vk-card vk-main-pad">
        <h2 className="vk-section-title">{t("wall.title")}</h2>
        <Composer
          onSubmit={({ text, image, video }) => {
            createPost({ text, image, video });
            refresh(loadFeed());
          }}
        />
      </div>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onLike={(id) => refresh(toggleLike(id))}
          onComment={(id, text) => refresh(addComment(id, text))}
          onRepost={(id) => refresh(repost(id))}
          onBookmark={(id) => refresh(toggleBookmark(id).feed)}
        />
      ))}
    </div>
  );
}
