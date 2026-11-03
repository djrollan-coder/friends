"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Composer } from "@/components/Composer";
import { PostCard } from "@/components/PostCard";
import { useAuth } from "@/components/AuthProvider";
import { createPost, postAction, type FeedPost } from "@/lib/feedStore";
import { fetchPeople, getPerson } from "@/lib/friendsStore";
import { fetchGroup, groupAction, type Community } from "@/lib/groupsStore";
import { useT } from "@/lib/i18n/I18nProvider";
import { useLive } from "@/lib/live";

export default function GroupPage() {
  const t = useT();
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [group, setGroup] = useState<Community | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const data = await fetchGroup(params.id);
    if (!data) {
      setMissing(true);
      return;
    }
    setMissing(false);
    setGroup(data.group);
    setPosts(data.posts);
  }, [params.id]);

  useEffect(() => {
    void load();
    void fetchPeople();
  }, [load]);

  useLive(["group", "post", "post-updated"], () => void load());

  const members = useMemo(
    () =>
      (group?.memberIds ?? [])
        .map((id) => getPerson(id))
        .filter(Boolean),
    [group],
  );

  if (missing) {
    return (
      <div className="vk-card vk-main-pad">
        <Link href="/groups">{t("groups.title")}</Link>
        <div className="vk-empty">{t("groups.notFound")}</div>
      </div>
    );
  }

  if (!group) {
    return <div className="vk-card vk-main-pad vk-empty">{t("common.loading")}</div>;
  }

  const joined = Boolean(user?.id && group.memberIds.includes(user.id));
  const isOwner = group.ownerId === user?.id;

  async function act(action: "join" | "leave" | "privacy") {
    setBusy(true);
    try {
      await groupAction(
        group!.id,
        action,
        action === "privacy"
          ? group!.privacy === "public"
            ? "private"
            : "public"
          : undefined,
      );
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sortable-stack">
      <div className="vk-card vk-main-pad">
        <h1 className="vk-page-title">
          <Link href="/groups">← </Link>
          {group.name}
        </h1>
        <div className="vk-status-box">
          {group.desc} · {group.privacy === "private" ? t("groups.closed") : t("groups.open")} ·{" "}
          {t("groups.members", { n: group.memberIds.length })}
        </div>

        <div className="friends-actions" style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {!joined ? (
            <button
              type="button"
              className="vk-btn"
              disabled={busy}
              onClick={() => void act("join")}
            >
              {t("groups.join")}
            </button>
          ) : !isOwner ? (
            <button type="button" disabled={busy} onClick={() => void act("leave")}>
              {t("groups.leave")}
            </button>
          ) : null}

          {isOwner ? (
            <button
              type="button"
              className="vk-btn"
              disabled={busy}
              onClick={() => void act("privacy")}
            >
              {group.privacy === "public" ? t("groups.makePrivate") : t("groups.makePublic")}
            </button>
          ) : null}
        </div>

        <h2 className="vk-section-title">{t("groups.membersTitle")}</h2>
        <div className="interest-chips">
          {members.map((m) =>
            m ? (
              <span key={m.id} className="interest-chip is-on">
                {m.name}
              </span>
            ) : null,
          )}
        </div>

        {joined ? (
          <div style={{ marginTop: 14 }}>
            <Composer
              title={t("groups.postTitle")}
              onSubmit={async ({ text, image, video }) => {
                await createPost({ text, image, video, groupId: group.id });
                await load();
              }}
            />
          </div>
        ) : null}
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
