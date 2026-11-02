"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { searchPeople } from "@/lib/friendsStore";
import { loadFeed } from "@/lib/feedStore";
import { loadGroups } from "@/lib/groupsStore";
import { PostCard } from "@/components/PostCard";
import {
  addComment,
  repost,
  toggleBookmark,
  toggleLike,
} from "@/lib/feedStore";
import { useT } from "@/lib/i18n/I18nProvider";

function SearchInner() {
  const t = useT();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const [query, setQuery] = useState(q);
  const [feed, setFeed] = useState(() => loadFeed());

  useEffect(() => {
    setQuery(q);
    setFeed(loadFeed());
  }, [q]);

  const people = useMemo(() => searchPeople(query), [query]);
  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return loadGroups().filter(
      (g) =>
        !needle ||
        g.name.toLowerCase().includes(needle) ||
        g.desc.toLowerCase().includes(needle),
    );
  }, [query]);
  const posts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return feed.filter(
      (p) =>
        !needle ||
        p.text.toLowerCase().includes(needle) ||
        p.author.name.toLowerCase().includes(needle),
    );
  }, [feed, query]);

  return (
    <div className="sortable-stack">
      <div className="vk-card vk-main-pad">
        <h1 className="vk-page-title">{t("search.title")}</h1>
        <form
          className="settings-search"
          onSubmit={(e) => {
            e.preventDefault();
            const next = new URLSearchParams({ q: query.trim() });
            window.history.pushState({}, "", `/search?${next.toString()}`);
            setFeed(loadFeed());
          }}
        >
          <span className="settings-search-icon" aria-hidden>
            ⌕
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search.placeholder")}
            aria-label={t("search.title")}
          />
        </form>
      </div>

      <div className="vk-card vk-main-pad">
        <h2 className="vk-section-title">{t("search.people", { n: people.length })}</h2>
        <div className="vk-list">
          {people.slice(0, 12).map((p) => (
            <div key={p.id} className="vk-list-row">
              <div className="vk-avatar sm">{p.avatar}</div>
              <div>
                <Link href="/friends?tab=search">{p.name}</Link>
                <div style={{ color: "var(--vk-muted)", marginTop: 2 }}>
                  {p.city}
                  {p.bio ? ` · ${p.bio}` : ""}
                </div>
              </div>
            </div>
          ))}
          {!people.length ? <div className="vk-empty">{t("search.noPeople")}</div> : null}
        </div>
      </div>

      <div className="vk-card vk-main-pad">
        <h2 className="vk-section-title">{t("search.groups", { n: groups.length })}</h2>
        <div className="vk-list">
          {groups.slice(0, 12).map((g) => (
            <div key={g.id} className="vk-list-row">
              <div className="vk-avatar sm">{g.cover}</div>
              <div>
                <Link href={`/groups/${g.id}`}>{g.name}</Link>
                <div style={{ color: "var(--vk-muted)", marginTop: 2 }}>{g.desc}</div>
              </div>
            </div>
          ))}
          {!groups.length ? <div className="vk-empty">{t("search.noGroups")}</div> : null}
        </div>
      </div>

      <div className="vk-card vk-main-pad">
        <h2 className="vk-section-title">{t("search.posts", { n: posts.length })}</h2>
      </div>
      {posts.slice(0, 20).map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onLike={(id) => setFeed(toggleLike(id))}
          onComment={(id, text) => setFeed(addComment(id, text))}
          onRepost={(id) => setFeed(repost(id))}
          onBookmark={(id) => setFeed(toggleBookmark(id).feed)}
        />
      ))}
    </div>
  );
}

export default function SearchPage() {
  const t = useT();
  return (
    <Suspense fallback={<div className="vk-card vk-main-pad">{t("search.searching")}</div>}>
      <SearchInner />
    </Suspense>
  );
}
