"use client";

import { useEffect, useState } from "react";
import { Composer } from "@/components/Composer";
import { PostCard } from "@/components/PostCard";
import {
  addComment,
  createPost,
  loadFeed,
  repost,
  toggleBookmark,
  toggleLike,
  type FeedPost,
} from "@/lib/feedStore";
import { useT } from "@/lib/i18n/I18nProvider";

export default function FeedPage() {
  const t = useT();
  const [posts, setPosts] = useState<FeedPost[]>([]);

  useEffect(() => {
    setPosts(loadFeed());
  }, []);

  return (
    <div className="sortable-stack">
      <div className="vk-card vk-main-pad">
        <h1 className="vk-page-title">{t("feed.pageTitle")}</h1>
        <p style={{ color: "var(--vk-muted)", marginTop: 0 }}>{t("feed.pageLead")}</p>
        <div className="circle-banner">{t("feed.banner")}</div>
        <Composer
          onSubmit={({ text, image, video }) => {
            createPost({ text, image, video });
            setPosts(loadFeed());
          }}
        />
      </div>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onLike={(id) => setPosts(toggleLike(id))}
          onComment={(id, text) => setPosts(addComment(id, text))}
          onRepost={(id) => setPosts(repost(id))}
          onBookmark={(id) => setPosts(toggleBookmark(id).feed)}
        />
      ))}
    </div>
  );
}
