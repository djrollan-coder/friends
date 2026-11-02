"use client";

import { useMemo, useState } from "react";
import { albumTitle, albums, photos, type PhotoItem } from "@/data/albums";
import { useI18n, useT } from "@/lib/i18n/I18nProvider";

type Tab = "photos" | "albums";
type SortMode = "newest" | "oldest" | "name" | "likes" | "album";
type ViewMode = "grid-l" | "grid-m" | "grid-s" | "list" | "masonry";

const SORT_IDS: SortMode[] = ["newest", "oldest", "name", "likes", "album"];
const VIEW_IDS: ViewMode[] = ["grid-l", "grid-m", "grid-s", "list", "masonry"];

function sortPhotos(list: PhotoItem[], mode: SortMode) {
  const next = [...list];
  switch (mode) {
    case "oldest":
      return next.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    case "name":
      return next.sort((a, b) => a.title.localeCompare(b.title, "ru"));
    case "likes":
      return next.sort((a, b) => b.likes - a.likes);
    case "album":
      return next.sort((a, b) => {
        const byAlbum = albumTitle(a.albumId).localeCompare(albumTitle(b.albumId), "ru");
        return byAlbum || b.createdAt.localeCompare(a.createdAt);
      });
    case "newest":
    default:
      return next.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

function sortAlbums(mode: SortMode) {
  const next = [...albums];
  switch (mode) {
    case "name":
      return next.sort((a, b) => a.title.localeCompare(b.title, "ru"));
    case "likes":
    case "newest":
      return next.sort((a, b) => b.count - a.count);
    case "oldest":
      return next.sort((a, b) => a.count - b.count);
    case "album":
    default:
      return next;
  }
}

export default function PhotosPage() {
  const t = useT();
  const { tc } = useI18n();
  const [tab, setTab] = useState<Tab>("photos");
  const [sort, setSort] = useState<SortMode>("newest");
  const [view, setView] = useState<ViewMode>("grid-m");
  const [albumFilter, setAlbumFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  const sortLabelKey: Record<SortMode, string> = {
    newest: "photos.sortNewest",
    oldest: "photos.sortOldest",
    name: "photos.sortName",
    likes: "photos.sortLikes",
    album: "photos.sortAlbum",
  };

  const sortOptions = useMemo(
    () => SORT_IDS.map((id) => ({ id, label: t(sortLabelKey[id]) })),
    [t],
  );

  const viewOptions = useMemo(
    () =>
      VIEW_IDS.map((id) => ({
        id,
        label: id === "grid-l" ? "▣" : id === "grid-m" ? "▦" : id === "grid-s" ? "▤" : id === "list" ? "☰" : "▥",
        title: t(
          id === "grid-l"
            ? "photos.viewLarge"
            : id === "grid-m"
              ? "photos.viewMedium"
              : id === "grid-s"
                ? "photos.viewSmall"
                : id === "list"
                  ? "photos.viewList"
                  : "photos.viewMasonry",
        ),
      })),
    [t],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return photos.filter((p) => {
      if (albumFilter !== "all" && p.albumId !== albumFilter) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        albumTitle(p.albumId).toLowerCase().includes(q)
      );
    });
  }, [albumFilter, query]);

  const sortedPhotos = useMemo(() => sortPhotos(filtered, sort), [filtered, sort]);
  const sortedAlbums = useMemo(() => sortAlbums(sort), [sort]);

  return (
    <div className="vk-card photos-page">
      <div className="photos-head">
        <h1 className="vk-page-title">{t("photos.title")}</h1>
        <p className="photos-lead">
          {tab === "photos"
            ? t("photos.leadPhotos", { n: sortedPhotos.length })
            : t("photos.leadAlbums", { n: sortedAlbums.length })}
        </p>

        <div className="photos-toolbar">
          <div className="photos-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              className={tab === "photos" ? "is-active" : undefined}
              aria-selected={tab === "photos"}
              onClick={() => setTab("photos")}
            >
              {t("photos.tabPhotos")}
            </button>
            <button
              type="button"
              role="tab"
              className={tab === "albums" ? "is-active" : undefined}
              aria-selected={tab === "albums"}
              onClick={() => setTab("albums")}
            >
              {t("photos.tabAlbums")}
            </button>
          </div>
          <button type="button" className="photos-create">
            {t("photos.createAlbum")}
          </button>
        </div>

        <div className="photos-controls">
          <label className="photos-control">
            <span>{t("photos.sort")}</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              aria-label={t("photos.sort")}
            >
              {sortOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          {tab === "photos" ? (
            <>
              <label className="photos-control">
                <span>{t("photos.album")}</span>
                <select
                  value={albumFilter}
                  onChange={(e) => setAlbumFilter(e.target.value)}
                  aria-label={t("photos.album")}
                >
                  <option value="all">{t("photos.allAlbums")}</option>
                  {albums.map((a) => (
                    <option key={a.id} value={a.id}>
                      {tc.album(a.id, a.title)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="photos-control photos-search-control">
                <span>{t("photos.search")}</span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("photos.searchPlaceholder")}
                  aria-label={t("photos.searchPlaceholder")}
                />
              </label>

              <div className="photos-view-toggle" role="group" aria-label={t("photos.view")}>
                {viewOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    title={opt.title}
                    aria-label={opt.title}
                    className={view === opt.id ? "is-active" : undefined}
                    onClick={() => setView(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {tab === "albums" ? (
        <div className={`photos-albums view-${view === "list" ? "list" : "grid"}`}>
          {sortedAlbums.map((album) => (
            <button
              key={album.id}
              type="button"
              className="photos-album"
              onClick={() => {
                setAlbumFilter(album.id);
                setTab("photos");
              }}
            >
              <span className="photos-album-cover" style={{ background: album.tone }}>
                {album.cover}
              </span>
              <span className="photos-album-meta">
                <span className="photos-album-title">{tc.album(album.id, album.title)}</span>
                <span className="photos-album-count">{t("photos.albumCount", { n: album.count })}</span>
              </span>
            </button>
          ))}
        </div>
      ) : sortedPhotos.length ? (
        <div className={`photos-grid view-${view}`}>
          {sortedPhotos.map((photo, index) => (
            <article
              key={photo.id}
              className={`photos-card tall-${(index % 5) + 1}`}
              style={{ background: photo.tone }}
            >
              <div className="photos-card-mark" aria-hidden>
                {photo.label}
              </div>
              <div className="photos-card-body">
                <div className="photos-card-title">{tc.photo(photo.title)}</div>
                <div className="photos-card-meta">
                  <span>{tc.album(photo.albumId, albumTitle(photo.albumId))}</span>
                  <span>{tc.date(photo.createdLabel)}</span>
                  <span>♥ {photo.likes}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="vk-empty">{t("photos.empty")}</div>
      )}
    </div>
  );
}
