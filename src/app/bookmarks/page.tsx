"use client";

import { useEffect, useMemo, useState } from "react";
import { PostCard } from "@/components/PostCard";
import {
  addComment,
  loadBookmarks,
  loadFeed,
  repost,
  toggleBookmark,
  toggleLike,
  type FeedPost,
} from "@/lib/feedStore";
import { useT } from "@/lib/i18n/I18nProvider";

export default function BookmarksPage() {
  const t = useT();
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [marks, setMarks] = useState<string[]>([]);

  useEffect(() => {
    setFeed(loadFeed());
    setMarks(loadBookmarks());
  }, []);

  const posts = useMemo(
    () => feed.filter((p) => marks.includes(p.id) || p.bookmarked),
    [feed, marks],
  );

  return (
    <div className="sortable-stack">
      <div className="vk-card vk-main-pad">
        <h1 className="vk-page-title">{t("bookmarks.title")}</h1>
        <p style={{ color: "var(--vk-muted)", marginTop: 0 }}>
          {t("bookmarks.savedCount", { n: posts.length })}
        </p>
      </div>
      {posts.length ? (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={{ ...post, bookmarked: true }}
            onLike={(id) => setFeed(toggleLike(id))}
            onComment={(id, text) => setFeed(addComment(id, text))}
            onRepost={(id) => setFeed(repost(id))}
            onBookmark={(id) => {
              const next = toggleBookmark(id);
              setFeed(next.feed);
              setMarks(next.bookmarks);
            }}
          />
        ))
      ) : (
        <div className="vk-card vk-main-pad vk-empty">{t("bookmarks.empty")}</div>
      )}
    </div>
  );
}
