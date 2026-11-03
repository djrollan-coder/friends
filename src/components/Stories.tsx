"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, uploadFile } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { fetchFriends } from "@/lib/friendsStore";
import type { Person, UserDTO } from "@/lib/dto";
import { useT } from "@/lib/i18n/I18nProvider";
import { useLive } from "@/lib/live";

type Story = {
  id: string;
  url: string;
  caption: string;
  createdAt: number;
  user: UserDTO | null;
};

type Props = {
  compact?: boolean;
};

export function Stories({ compact = false }: Props) {
  const t = useT();
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [friends, setFriends] = useState<Person[]>([]);
  const [viewer, setViewer] = useState<Story | null>(null);
  const [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ stories: Story[] }>("/api/stories");
      setStories(data.stories);
    } catch {
      /* offline */
    }
  }, []);

  useEffect(() => {
    void load();
    void fetchFriends()
      .then((data) => setFriends(data.people.filter((p) => data.state.friendIds.includes(p.id))))
      .catch(() => undefined);
  }, [load]);

  useLive(["post", "friends"], () => void load());

  const mine = useMemo(
    () => stories.filter((s) => s.user?.id === user?.id).sort((a, b) => b.createdAt - a.createdAt)[0],
    [stories, user?.id],
  );
  const byUser = useMemo(() => {
    const map = new Map<string, Story>();
    for (const story of stories) {
      if (!story.user || story.user.id === user?.id) continue;
      const current = map.get(story.user.id);
      if (!current || current.createdAt < story.createdAt) map.set(story.user.id, story);
    }
    return map;
  }, [stories, user?.id]);

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2200);
  }

  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const stored = await uploadFile(file);
      const data = await api<{ stories: Story[] }>("/api/stories", {
        method: "POST",
        body: JSON.stringify({ url: stored.url }),
      });
      setStories(data.stories);
      const created = data.stories.filter((s) => s.user?.id === user?.id).sort((a, b) => b.createdAt - a.createdAt)[0];
      if (created) setViewer(created);
    } catch {
      flash("Не удалось загрузить историю");
    } finally {
      setBusy(false);
    }
  }

  const rows = [
    {
      id: "me",
      name: t("stories.yours"),
      avatar: user?.avatar ?? "F",
      story: mine,
      create: true,
    },
    ...friends.slice(0, 7).map((friend) => ({
      id: friend.id,
      name: friend.name.split(" ")[0],
      avatar: friend.avatar,
      story: byUser.get(friend.id),
      create: false,
    })),
  ];

  return (
    <div className={`vk-stories${compact ? " is-compact" : ""}`} aria-label={t("stories.title")}>
      {rows.map((row) =>
        row.create ? (
          <button
            key={row.id}
            type="button"
            className="vk-story create"
            disabled={busy}
            onClick={() => {
              if (row.story) setViewer(row.story);
              else fileRef.current?.click();
            }}
          >
            <span className="vk-story-plus" aria-hidden>
              {row.story ? row.avatar : "+"}
            </span>
            {row.story ? t("stories.yours") : t("stories.create")}
          </button>
        ) : (
          <button
            key={row.id}
            type="button"
            className={`vk-story${row.story ? " has-story" : ""}`}
            onClick={() => {
              if (row.story) setViewer(row.story);
              else flash(`У ${row.name} пока нет истории`);
            }}
          >
            <span className="vk-story-avatar" aria-hidden>
              {row.avatar}
            </span>
            {row.name}
          </button>
        ),
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          void upload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {notice ? <div className="stories-notice">{notice}</div> : null}
      {viewer && viewer.user ? (
        <div className="story-viewer" role="dialog" aria-modal="true" onClick={() => setViewer(null)}>
          <div className="story-viewer-card" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={viewer.url} alt={viewer.caption || viewer.user?.name || "Story"} />
            <div className="story-viewer-bar">
              <span>{viewer.user?.name}</span>
              <button type="button" onClick={() => setViewer(null)} aria-label={t("common.close")}>
                ×
              </button>
            </div>
            {viewer.caption ? <div className="story-viewer-caption">{viewer.caption}</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
