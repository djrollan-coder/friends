"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Composer } from "@/components/Composer";
import { PostCard } from "@/components/PostCard";
import { getSessionUser } from "@/lib/sessionUser";
import { getPerson } from "@/lib/friendsStore";
import {
  addComment,
  loadFeed,
  repost,
  toggleBookmark,
  toggleLike,
  type FeedPost,
} from "@/lib/feedStore";
import {
  getGroup,
  joinGroup,
  leaveGroup,
  loadGroups,
  postToGroup,
  updateGroupPrivacy,
  type Community,
} from "@/lib/groupsStore";
import { useT } from "@/lib/i18n/I18nProvider";

export default function GroupPage() {
  const t = useT();
  const params = useParams<{ id: string }>();
  const [group, setGroup] = useState<Community | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);

  useEffect(() => {
    setGroup(getGroup(params.id) ?? null);
    setPosts(loadFeed().filter((p) => p.groupId === params.id));
  }, [params.id]);

  const members = useMemo(
    () =>
      (group?.memberIds ?? [])
        .map((id) => (id === getSessionUser().id ? getSessionUser() : getPerson(id)))
        .filter(Boolean),
    [group],
  );

  if (!group) {
    return (
      <div className="vk-card vk-main-pad">
        <Link href="/groups">{t("groups.title")}</Link>
        <div className="vk-empty">{t("groups.notFound")}</div>
      </div>
    );
  }

  const joined = group.memberIds.includes(getSessionUser().id);
  const isOwner = group.ownerId === getSessionUser().id;

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
              onClick={() => {
                joinGroup(params.id);
                setGroup(getGroup(params.id) ?? null);
              }}
            >
              {t("groups.join")}
            </button>
          ) : !isOwner ? (
            <button
              type="button"
              onClick={() => {
                leaveGroup(params.id);
                setGroup(getGroup(params.id) ?? null);
              }}
            >
              {t("groups.leave")}
            </button>
          ) : null}

          {isOwner ? (
            <button
              type="button"
              className="vk-btn"
              onClick={() => {
                updateGroupPrivacy(
                  group.id,
                  group.privacy === "public" ? "private" : "public",
                );
                setGroup(getGroup(group.id) ?? null);
              }}
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
              onSubmit={({ text, image }) => {
                postToGroup(group.id, text, image);
                setPosts(loadFeed().filter((p) => p.groupId === group.id));
                setGroup(getGroup(group.id) ?? null);
                loadGroups();
              }}
            />
          </div>
        ) : null}
      </div>

      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onLike={(id) => setPosts(toggleLike(id).filter((p) => p.groupId === group.id))}
          onComment={(id, text) =>
            setPosts(addComment(id, text).filter((p) => p.groupId === group.id))
          }
          onRepost={(id) => setPosts(repost(id).filter((p) => p.groupId === group.id))}
          onBookmark={(id) =>
            setPosts(toggleBookmark(id).feed.filter((p) => p.groupId === group.id))
          }
        />
      ))}
    </div>
  );
}
