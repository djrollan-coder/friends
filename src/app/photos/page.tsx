"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, uploadFile } from "@/lib/api";
import { useT } from "@/lib/i18n/I18nProvider";

type Tab = "photos" | "albums";
type SortMode = "newest" | "oldest" | "name" | "likes" | "album";
type ViewMode = "grid-l" | "grid-m" | "grid-s" | "list" | "masonry";

type AlbumItem = {
  id: string;
  title: string;
  count: number;
  cover: string;
  tone: string;
};

type PhotoItem = {
  id: string;
  albumId: string;
  title: string;
  tone: string;
  label: string;
  url?: string;
  createdAt: string;
  createdLabel: string;
  likes: number;
};

const SORT_IDS: SortMode[] = ["newest", "oldest", "name", "likes", "album"];
const VIEW_IDS: ViewMode[] = ["grid-l", "grid-m", "grid-s", "list", "masonry"];

function sortPhotos(list: PhotoItem[], mode: SortMode, titleOf: (id: string) => string) {
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
        const byAlbum = titleOf(a.albumId).localeCompare(titleOf(b.albumId), "ru");
        return byAlbum || b.createdAt.localeCompare(a.createdAt);
      });
    case "newest":
    default:
      return next.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

function sortAlbums(list: AlbumItem[], mode: SortMode) {
  const next = [...list];
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
  const [tab, setTab] = useState<Tab>("photos");
  const [sort, setSort] = useState<SortMode>("newest");
  const [view, setView] = useState<ViewMode>("grid-m");
  const [albumFilter, setAlbumFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<{ albums: AlbumItem[]; photos: PhotoItem[] }>("/api/photos");
      setAlbums(data.albums);
      setPhotos(data.photos);
    } catch {
      /* offline */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const titleOf = useCallback(
    (albumId: string) => albums.find((a) => a.id === albumId)?.title ?? "Альбом",
    [albums],
  );

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
      return p.title.toLowerCase().includes(q) || titleOf(p.albumId).toLowerCase().includes(q);
    });
  }, [photos, albumFilter, query, titleOf]);

  const sortedPhotos = useMemo(() => sortPhotos(filtered, sort, titleOf), [filtered, sort, titleOf]);
  const sortedAlbums = useMemo(() => sortAlbums(albums, sort), [albums, sort]);

  async function createAlbum() {
    const name = window.prompt(t("photos.createAlbum"));
    if (!name?.trim()) return;
    setBusy(true);
    try {
      const data = await api<{ albums: AlbumItem[] }>("/api/albums", {
        method: "POST",
        body: JSON.stringify({ title: name }),
      });
      setAlbums(data.albums);
    } finally {
      setBusy(false);
    }
  }

  async function uploadPhoto(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const uploaded = await uploadFile(file);
      await api("/api/photos", {
        method: "POST",
        body: JSON.stringify({
          url: uploaded.url,
          title: file.name.replace(/\.[^.]+$/, ""),
          albumId: albumFilter === "all" ? undefined : albumFilter,
        }),
      });
      await load();
      setTab("photos");
    } finally {
      setBusy(false);
    }
  }

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
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="photos-create"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              Загрузить фото
            </button>
            <button type="button" className="photos-create" disabled={busy} onClick={() => void createAlbum()}>
              {t("photos.createAlbum")}
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              void uploadPhoto(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
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
                      {a.title}
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
                <span className="photos-album-title">{album.title}</span>
                <span className="photos-album-count">
                  {t("photos.albumCount", { n: album.count })}
                </span>
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
              style={
                photo.url
                  ? {
                      backgroundImage: `url(${photo.url})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : { background: photo.tone }
              }
            >
              <div className="photos-card-mark" aria-hidden>
                {photo.label}
              </div>
              <div className="photos-card-body">
                <div className="photos-card-title">{photo.title}</div>
                <div className="photos-card-meta">
                  <span>{titleOf(photo.albumId)}</span>
                  <span>{photo.createdLabel}</span>
                  <button
                    type="button"
                    className="photos-like-btn"
                    onClick={async () => {
                      const data = await api<{ photos: PhotoItem[] }>(`/api/photos/${photo.id}`, {
                        method: "POST",
                        body: JSON.stringify({ action: "like" }),
                      });
                      setPhotos(data.photos);
                      void load();
                    }}
                  >
                    ♥ {photo.likes}
                  </button>
                  <button
                    type="button"
                    className="photos-delete-btn"
                    aria-label={t("common.delete")}
                    onClick={async () => {
                      if (!window.confirm(t("common.delete") + "?")) return;
                      const data = await api<{ photos: PhotoItem[] }>(`/api/photos/${photo.id}`, {
                        method: "DELETE",
                      });
                      setPhotos(data.photos);
                      void load();
                    }}
                  >
                    ×
                  </button>
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
