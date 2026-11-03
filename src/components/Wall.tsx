"use client";

import { useCallback, useEffect, useState } from "react";
import { useT } from "@/lib/i18n/I18nProvider";
import { useAuth } from "@/components/AuthProvider";
import { useLive } from "@/lib/live";
import { Composer } from "./Composer";
import { PostCard } from "./PostCard";
import {
  createPost,
  fetchFeed,
  postAction,
  type FeedPost,
} from "@/lib/feedStore";

export function Wall() {
  const t = useT();
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setPosts(await fetchFeed({ author: user.id, limit: 100 }));
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useLive(["post", "post-updated"], () => void load());

  return (
    <div className="vk-wall-stack">
      <div className="vk-card vk-main-pad">
        <h2 className="vk-section-title">{t("wall.title")}</h2>
        <Composer
          onSubmit={async ({ text, image, video }) => {
            await createPost({ text, image, video });
            await load();
          }}
        />
      </div>
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
