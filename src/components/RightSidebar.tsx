"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { interestOptions } from "@/data/interests";
import { hotNews } from "@/data/mock";
import { contentInterest } from "@/lib/i18n/contentMaps";
import { useI18n, useT } from "@/lib/i18n/I18nProvider";
import {
  loadPlaylists,
  renamePlaylist,
  savePlaylists,
  type PlaylistData,
} from "@/lib/playlistStore";
import {
  loadRightBlocks,
  type RightBlockId,
} from "@/lib/rightBlocksStore";
import { useInterests } from "@/lib/useInterests";
import { MusicPlayer } from "./MusicPlayer";
import { SortableBlocks } from "./SortableBlocks";
import { Stories } from "./Stories";

const PLAYLISTS_COLLAPSE_KEY = "friends.playlists.collapsed.v1";
const PLAYLISTS_VISIBLE_COLLAPSED = 2;

function PlaylistsBlockInner() {
  const t = useT();
  const searchParams = useSearchParams();
  const activeId = searchParams.get("playlist");
  const [playlists, setPlaylists] = useState<PlaylistData[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    function refresh() {
      setPlaylists(loadPlaylists());
    }
    refresh();
    try {
      setCollapsed(localStorage.getItem(PLAYLISTS_COLLAPSE_KEY) !== "0");
    } catch {
      /* ignore */
    }
    window.addEventListener("friends-playlists-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("friends-playlists-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  function commitEdit(id: string) {
    const pl = playlists.find((p) => p.id === id);
    if (!pl) {
      setEditingId(null);
      return;
    }
    const nextTitle = draft.trim();
    if (!nextTitle || nextTitle === pl.title) {
      setEditingId(null);
      return;
    }
    const next = renamePlaylist(playlists, id, nextTitle);
    savePlaylists(next);
    setPlaylists(next);
    setEditingId(null);
  }

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(PLAYLISTS_COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const canCollapse = playlists.length > PLAYLISTS_VISIBLE_COLLAPSED;
  const visible = useMemo(() => {
    if (!collapsed || !canCollapse) return playlists;
    const head = playlists.slice(0, PLAYLISTS_VISIBLE_COLLAPSED);
    if (!activeId || head.some((pl) => pl.id === activeId)) return head;
    const active = playlists.find((pl) => pl.id === activeId);
    if (!active) return head;
    return [head[0], active].filter(Boolean) as PlaylistData[];
  }, [playlists, collapsed, canCollapse, activeId]);

  return (
    <div className="vk-right-card">
      <div className="playlists-head">
        <h3>{t("right.playlists")}</h3>
        {canCollapse ? (
          <button
            type="button"
            className="playlists-toggle"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
          >
            {collapsed ? t("right.expand") : t("right.collapse")}
          </button>
        ) : null}
      </div>
      <div className="playlist-list">
        {visible.map((pl) => (
          <div
            key={pl.id}
            className={`playlist-item${activeId === pl.id ? " is-active" : ""}`}
          >
            <span className="playlist-cover" aria-hidden>
              {pl.cover}
            </span>
            <span className="playlist-meta">
              {editingId === pl.id ? (
                <input
                  className="playlist-rename-input"
                  value={draft}
                  autoFocus
                  maxLength={64}
                  aria-label={t("audio.renamePlaylist")}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => commitEdit(pl.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitEdit(pl.id);
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setEditingId(null);
                    }
                  }}
                />
              ) : (
                <Link href={`/audio?playlist=${pl.id}`} className="playlist-title">
                  {pl.title}
                </Link>
              )}
              <span className="playlist-count">{pl.trackIds.length}</span>
            </span>
            <button
              type="button"
              className="playlist-rename-btn"
              title={t("audio.renamePlaylist")}
              aria-label={t("audio.renamePlaylist")}
              onClick={() => {
                setEditingId(pl.id);
                setDraft(pl.title);
              }}
            >
              ✎
            </button>
          </div>
        ))}
      </div>
      <div className="playlists-foot">
        <Link href="/audio" className="vk-right-link">
          {t("nav.audio")} →
        </Link>
        {canCollapse ? (
          <button
            type="button"
            className="playlists-toggle is-foot"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
          >
            {collapsed
              ? t("right.showMore", { n: playlists.length - visible.length })
              : t("right.collapse")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function PlaylistsBlock() {
  const t = useT();
  return (
    <Suspense
      fallback={
        <div className="vk-right-card">
          <h3>{t("right.playlists")}</h3>
        </div>
      }
    >
      <PlaylistsBlockInner />
    </Suspense>
  );
}

function HotNewsBlock() {
  const t = useT();
  const { tc } = useI18n();
  return (
    <div className="vk-right-card">
      <h3>{t("right.hot")}</h3>
      <div className="hot-news-list">
        {hotNews.map((item, index) => (
          <Link key={item.id} href="/feed" className="hot-news-item">
            <span className="hot-news-rank">{index + 1}</span>
            <span className="hot-news-meta">
              <span className="hot-news-title">{tc.news(item.id, item.title)}</span>
              <span className="hot-news-sub">
                {tc.newsSource(item.source)} · {item.views}
              </span>
            </span>
          </Link>
        ))}
      </div>
      <Link href="/feed" className="vk-right-link" style={{ marginTop: 6 }}>
        {t("nav.feed")} →
      </Link>
    </div>
  );
}

function InterestsBlock() {
  const t = useT();
  const { tc, locale } = useI18n();
  const { selected, toggle } = useInterests();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return interestOptions.slice(0, 24);
    return interestOptions.filter((tag) => {
      const label = contentInterest(locale, tag).toLowerCase();
      return tag.toLowerCase().includes(q) || label.includes(q);
    });
  }, [query, locale]);

  return (
    <div className="vk-right-card">
      <div className="interests-head">
        <h3>{t("right.interests")}</h3>
        <Link href="/settings" className="interests-edit">
          {t("right.allTopics")}
        </Link>
      </div>

      {!open ? (
        <>
          <div className="interest-chips">
            {selected.length ? (
              selected.slice(0, 8).map((tag) => (
                <span key={tag} className="interest-chip is-on">
                  {tc.interest(tag)}
                </span>
              ))
            ) : (
              <span className="interest-empty">{t("right.pickTopics")}</span>
            )}
          </div>
          <button
            type="button"
            className="vk-right-link interests-quick"
            onClick={() => setOpen(true)}
          >
            {t("right.quickSetup")}
          </button>
        </>
      ) : (
        <>
          <label className="settings-search is-compact">
            <span className="settings-search-icon" aria-hidden>
              ⌕
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("right.searchTopics")}
              aria-label={t("right.searchTopics")}
            />
          </label>
          <div className="interest-chips is-edit">
            {filtered.map((tag) => {
              const on = selected.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  className={`interest-chip${on ? " is-on" : ""}`}
                  onClick={() => toggle(tag)}
                  aria-pressed={on}
                >
                  {tc.interest(tag)}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="vk-right-link interests-quick"
            onClick={() => setOpen(false)}
          >
            {t("right.done")}
          </button>
        </>
      )}
    </div>
  );
}

function PlayerBlock() {
  const t = useT();
  return (
    <div className="vk-right-card">
      <h3>{t("nav.audio")}</h3>
      <MusicPlayer compact />
    </div>
  );
}

function StoriesBlock() {
  const t = useT();
  return (
    <div className="vk-right-card">
      <h3>{t("stories.title")}</h3>
      <Stories compact />
    </div>
  );
}

const BLOCK_NODES: Record<RightBlockId, () => ReactNode> = {
  "hot-news": () => <HotNewsBlock />,
  interests: () => <InterestsBlock />,
  playlists: () => <PlaylistsBlock />,
  player: () => <PlayerBlock />,
  stories: () => <StoriesBlock />,
};

export function RightSidebar() {
  const t = useT();
  const pathname = usePathname();
  const isMusicPage = pathname === "/audio" || pathname.startsWith("/audio/");
  const [enabled, setEnabled] = useState<RightBlockId[]>([]);

  useEffect(() => {
    function refresh() {
      setEnabled(loadRightBlocks());
    }
    refresh();
    window.addEventListener("friends-right-blocks-changed", refresh);
    return () => window.removeEventListener("friends-right-blocks-changed", refresh);
  }, []);

  const items = enabled
    .filter((id) => !(isMusicPage && id === "player"))
    .map((id) => ({
      id,
      node: BLOCK_NODES[id](),
    }));

  return (
    <aside className="vk-right">
      {items.length ? (
        <SortableBlocks
          storageKey="friends.blocks.right.custom"
          className="sortable-stack"
          items={items}
        />
      ) : (
        <div className="vk-right-card right-blocks-empty">
          <p>{t("right.manageBlocksHint")}</p>
        </div>
      )}
    </aside>
  );
}
