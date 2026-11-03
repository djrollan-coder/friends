"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { PostCard } from "@/components/PostCard";
import { api } from "@/lib/api";
import type { Community, FeedPost, Person } from "@/lib/dto";
import { postAction } from "@/lib/feedStore";
import { useT } from "@/lib/i18n/I18nProvider";

type SearchData = {
  people: Person[];
  groups: Community[];
  posts: FeedPost[];
};

function SearchInner() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const [query, setQuery] = useState(q);
  const [data, setData] = useState<SearchData>({ people: [], groups: [], posts: [] });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (needle: string) => {
    setLoading(true);
    try {
      const result = await api<SearchData>(`/api/search?q=${encodeURIComponent(needle)}`);
      setData(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setQuery(q);
    const timer = window.setTimeout(() => void load(q), 180);
    return () => window.clearTimeout(timer);
  }, [q, load]);

  return (
    <div className="sortable-stack">
      <div className="vk-card vk-main-pad">
        <h1 className="vk-page-title">{t("search.title")}</h1>
        <form
          className="settings-search"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/search?q=${encodeURIComponent(query.trim())}`);
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
        {loading ? <div className="vk-empty">{t("search.searching")}</div> : null}
      </div>

      <div className="vk-card vk-main-pad">
        <h2 className="vk-section-title">{t("search.people", { n: data.people.length })}</h2>
        <div className="vk-list">
          {data.people.slice(0, 20).map((p) => (
            <div key={p.id} className="vk-list-row">
              <div className="vk-avatar sm">{p.avatar}</div>
              <div>
                <Link href={`/friends?tab=search&q=${encodeURIComponent(p.name)}`}>{p.name}</Link>
                <div style={{ color: "var(--vk-muted)", marginTop: 2 }}>
                  {p.city}
                  {p.bio ? ` · ${p.bio}` : ""}
                </div>
              </div>
            </div>
          ))}
          {!data.people.length ? <div className="vk-empty">{t("search.noPeople")}</div> : null}
        </div>
      </div>

      <div className="vk-card vk-main-pad">
        <h2 className="vk-section-title">{t("search.groups", { n: data.groups.length })}</h2>
        <div className="vk-list">
          {data.groups.slice(0, 12).map((g) => (
            <div key={g.id} className="vk-list-row">
              <div className="vk-avatar sm">{g.cover}</div>
              <div>
                <Link href={`/groups/${g.id}`}>{g.name}</Link>
                <div style={{ color: "var(--vk-muted)", marginTop: 2 }}>{g.desc}</div>
              </div>
            </div>
          ))}
          {!data.groups.length ? <div className="vk-empty">{t("search.noGroups")}</div> : null}
        </div>
      </div>

      <div className="vk-card vk-main-pad">
        <h2 className="vk-section-title">{t("search.posts", { n: data.posts.length })}</h2>
      </div>
      {data.posts.slice(0, 20).map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onLike={async (id) => {
            await postAction(id, "like");
            await load(q);
          }}
          onComment={async (id, text) => {
            await postAction(id, "comment", text);
            await load(q);
          }}
          onRepost={async (id) => {
            await postAction(id, "repost");
            await load(q);
          }}
          onBookmark={async (id) => {
            await postAction(id, "bookmark");
            await load(q);
          }}
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
