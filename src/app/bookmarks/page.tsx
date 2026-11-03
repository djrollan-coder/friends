"use client";

import { useCallback, useEffect, useState } from "react";
import { PostCard } from "@/components/PostCard";
import {
  fetchBookmarks,
  postAction,
  type FeedPost,
} from "@/lib/feedStore";
import { useT } from "@/lib/i18n/I18nProvider";
import { useLive } from "@/lib/live";

export default function BookmarksPage() {
  const t = useT();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setPosts(await fetchBookmarks());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useLive(["post", "post-updated"], () => void load());

  return (
    <div className="sortable-stack">
      <div className="vk-card vk-main-pad">
        <h1 className="vk-page-title">{t("bookmarks.title")}</h1>
        <p style={{ color: "var(--vk-muted)", marginTop: 0 }}>
          {t("bookmarks.savedCount", { n: posts.length })}
        </p>
      </div>
      {loading ? <div className="vk-card vk-main-pad vk-empty">{t("common.loading")}</div> : null}
      {posts.length ? (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={{ ...post, bookmarked: true }}
            onLike={async (id) => {
              await postAction(id, "like");
              await load();
            }}
            onComment={async (id, text) => {
              await postAction(id, "comment", text);
              await load();
            }}
            onRepost={async (id) => {
              await postAction(id, "repost");
              await load();
            }}
            onBookmark={async (id) => {
              await postAction(id, "bookmark");
              await load();
            }}
          />
        ))
      ) : !loading ? (
        <div className="vk-card vk-main-pad vk-empty">{t("bookmarks.empty")}</div>
      ) : null}
    </div>
  );
}
