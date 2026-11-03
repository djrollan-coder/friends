"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n, useT } from "@/lib/i18n/I18nProvider";
import { api, uploadFile } from "@/lib/api";

type VideoItem = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  createdLabel: string;
  duration: string;
  views: number;
  tone: string;
  cover: string;
  src?: string;
};

type SortMode = "newest" | "oldest" | "name" | "views";
type ViewMode = "cards" | "list";

function sortVideos(list: VideoItem[], mode: SortMode, locale: string) {
  const next = [...list];
  switch (mode) {
    case "oldest":
      return next.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    case "name":
      return next.sort((a, b) => a.title.localeCompare(b.title, locale));
    case "views":
      return next.sort((a, b) => b.views - a.views);
    case "newest":
    default:
      return next.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

function probeDuration(src: string) {
  return new Promise<string>((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const total = Math.round(video.duration || 0);
      const m = Math.floor(total / 60);
      const s = String(total % 60).padStart(2, "0");
      resolve(`${m}:${s}`);
    };
    video.onerror = () => resolve("0:00");
    video.src = src;
  });
}

export default function VideosPage() {
  const t = useT();
  const { tc, locale } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [sort, setSort] = useState<SortMode>("newest");
  const [view, setView] = useState<ViewMode>("cards");
  const [query, setQuery] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await api<{ videos: VideoItem[] }>("/api/videos");
        setVideos(data.videos);
      } catch {
        /* offline */
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = !q
      ? videos
      : videos.filter(
          (v) =>
            v.title.toLowerCase().includes(q) ||
            v.description.toLowerCase().includes(q),
        );
    return sortVideos(list, sort, locale);
  }, [videos, query, sort, locale]);

  async function submitAdd() {
    setError("");
    if (!title.trim() && !file && !url.trim()) {
      setError(t("videos.errorNeed"));
      return;
    }
    setBusy(true);
    try {
      let src: string | undefined;
      let duration = "0:00";
      if (file) {
        if (!file.type.startsWith("video/")) {
          setError(t("videos.errorFile"));
          return;
        }
        const uploaded = await uploadFile(file);
        src = uploaded.url;
        duration = await probeDuration(src);
      } else if (url.trim()) {
        src = url.trim();
        duration = await probeDuration(src).catch(() => "0:00");
      }

      const data = await api<{ videos: VideoItem[] }>("/api/videos", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim() || file?.name || t("videos.newVideo"),
          description,
          src,
          duration,
        }),
      });
      setVideos(data.videos);
      setOpenAdd(false);
      setTitle("");
      setDescription("");
      setUrl("");
      setFile(null);
    } catch {
      setError(t("videos.errorAdd"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="vk-card videos-page">
      <div className="videos-head">
        <div>
          <h1 className="vk-page-title">{t("videos.title")}</h1>
          <p className="videos-lead">{t("videos.count", { n: filtered.length })}</p>
        </div>
        <button type="button" className="vk-btn" onClick={() => setOpenAdd((v) => !v)}>
          {openAdd ? t("videos.cancel") : t("videos.add")}
        </button>
      </div>

      {openAdd ? (
        <div className="videos-add">
          <label>
            {t("videos.name")}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="…"
            />
          </label>
          <label>
            {t("videos.description")}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="…"
            />
          </label>
          <label>
            {t("videos.link")}
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
            />
          </label>
          <button
            type="button"
            className="videos-file-btn"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            {file ? file.name : t("videos.pickFile")}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            hidden
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {error ? <div className="videos-error">{error}</div> : null}
          <button type="button" className="vk-btn" onClick={() => void submitAdd()} disabled={busy}>
            {busy ? t("videos.saving") : t("videos.save")}
          </button>
        </div>
      ) : null}

      <div className="videos-toolbar">
        <select
          className="videos-select"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          aria-label={t("videos.sortNewest")}
        >
          <option value="newest">{t("videos.sortNewest")}</option>
          <option value="oldest">{t("videos.sortOldest")}</option>
          <option value="name">{t("videos.sortName")}</option>
          <option value="views">{t("videos.sortViews")}</option>
        </select>

        <input
          className="videos-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("videos.search")}
          aria-label={t("videos.search")}
        />

        <div className="videos-view" role="group" aria-label={t("videos.cards")}>
          <button
            type="button"
            className={view === "cards" ? "is-active" : undefined}
            onClick={() => setView("cards")}
          >
            {t("videos.cards")}
          </button>
          <button
            type="button"
            className={view === "list" ? "is-active" : undefined}
            onClick={() => setView("list")}
          >
            {t("videos.list")}
          </button>
        </div>
      </div>

      {filtered.length ? (
        <div className={`videos-list is-${view}`}>
          {filtered.map((video) => {
            const active = playingId === video.id && !!video.src;
            return (
              <article key={video.id} className="videos-item">
                <div className="videos-thumb" style={{ background: video.tone }}>
                  {active ? (
                    <video
                      className="videos-player"
                      src={video.src}
                      controls
                      autoPlay
                      playsInline
                      onPlay={async () => {
                        const data = await api<{ videos: VideoItem[] }>(`/api/videos/${video.id}`, {
                          method: "POST",
                          body: JSON.stringify({ action: "view" }),
                        });
                        setVideos(data.videos);
                      }}
                    />
                  ) : (
                    <>
                      <span className="videos-thumb-code">{video.cover}</span>
                      <span className="videos-thumb-time">{video.duration}</span>
                    </>
                  )}
                </div>

                <div className="videos-info">
                  <h2 className="videos-title">{tc.video(video.title)}</h2>
                  <p className="videos-desc">{tc.videoDesc(video.description)}</p>
                  <p className="videos-meta">
                    {tc.date(video.createdLabel)}
                    {" · "}
                    {t("videos.views", { n: video.views })}
                    {!video.src ? ` · ${t("videos.demo")}` : ""}
                  </p>
                  <div className="videos-actions">
                    {video.src ? (
                      <button
                        type="button"
                        className="videos-action primary"
                        onClick={() => setPlayingId(video.id)}
                      >
                        {t("videos.watch")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="videos-action primary"
                        onClick={() => setPlayingId(video.id)}
                        disabled
                      >
                        {t("videos.noFile")}
                      </button>
                    )}
                    <button
                      type="button"
                      className="videos-action"
                      onClick={async () => {
                        if (playingId === video.id) setPlayingId(null);
                        const data = await api<{ videos: VideoItem[] }>(`/api/videos/${video.id}`, {
                          method: "DELETE",
                        });
                        setVideos(data.videos);
                      }}
                    >
                      {t("common.delete")}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="vk-empty">{t("videos.empty")}</div>
      )}
    </div>
  );
}
