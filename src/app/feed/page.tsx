"use client";

import { useCallback, useEffect, useState } from "react";
import { Composer } from "@/components/Composer";
import { PostCard } from "@/components/PostCard";
import {
  createPost,
  fetchFeed,
  postAction,
  type FeedPost,
} from "@/lib/feedStore";
import { useT } from "@/lib/i18n/I18nProvider";
import { useLive } from "@/lib/live";

export default function FeedPage() {
  const t = useT();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setPosts(await fetchFeed({ limit: 60 }));
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
        <h1 className="vk-page-title">{t("feed.pageTitle")}</h1>
        <p style={{ color: "var(--vk-muted)", marginTop: 0 }}>{t("feed.pageLead")}</p>
        <div className="circle-banner">{t("feed.banner")}</div>
        <Composer
          onSubmit={async ({ text, image, video }) => {
            await createPost({ text, image, video });
            await load();
          }}
        />
      </div>
      {loading ? <div className="vk-card vk-main-pad vk-empty">{t("common.loading")}</div> : null}
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
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
      ))}
    </div>
  );
}
