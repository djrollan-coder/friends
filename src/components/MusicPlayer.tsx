"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  addTrackToPlaylist,
  loadPlaylists,
  removeTrackFromPlaylist,
  renamePlaylist,
  reorderPlaylistTracks,
  savePlaylists,
  type PlaylistData,
} from "@/lib/playlistStore";
import {
  addTracksFromFiles,
  formatPlaybackTime,
  getTrackObjectUrl,
  loadTracks,
  removeTrack,
  type Track,
} from "@/lib/tracksStore";
import { SortableBlocks } from "./SortableBlocks";
import {
  TrackContextMenu,
  type ContextMenuState,
} from "./TrackContextMenu";
import { useT } from "@/lib/i18n/I18nProvider";

type Props = {
  compact?: boolean;
};

const VOLUME_KEY = "friends.audio.volume.v1";

function loadVolume() {
  if (typeof window === "undefined") return 0.85;
  try {
    const raw = localStorage.getItem(VOLUME_KEY);
    if (raw == null) return 0.85;
    const value = Number(raw);
    if (!Number.isFinite(value)) return 0.85;
    return Math.min(1, Math.max(0, value));
  } catch {
    return 0.85;
  }
}

function saveVolume(value: number) {
  const next = Math.min(1, Math.max(0, value));
  localStorage.setItem(VOLUME_KEY, String(next));
  window.dispatchEvent(new CustomEvent("friends-audio-volume", { detail: next }));
  return next;
}

function GripIcon() {
  return (
    <svg viewBox="0 0 12 16" width="10" height="14" aria-hidden>
      <circle cx="3" cy="2" r="1.4" fill="currentColor" />
      <circle cx="9" cy="2" r="1.4" fill="currentColor" />
      <circle cx="3" cy="8" r="1.4" fill="currentColor" />
      <circle cx="9" cy="8" r="1.4" fill="currentColor" />
      <circle cx="3" cy="14" r="1.4" fill="currentColor" />
      <circle cx="9" cy="14" r="1.4" fill="currentColor" />
    </svg>
  );
}

const SLEEP_OPTIONS_MIN = [5, 15, 30, 60] as const;

function CompactPlayer() {
  const t = useT();
  const [library, setLibrary] = useState<Track[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [muted, setMuted] = useState(false);
  const [preMuteVolume, setPreMuteVolume] = useState(0.85);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState("0:00");
  const [sleepMin, setSleepMin] = useState<number | null>(null);
  const [sleepLeftSec, setSleepLeftSec] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sleepEndsAtRef = useRef<number | null>(null);

  useEffect(() => {
    function refresh() {
      const next = loadTracks();
      setLibrary(next);
      setCurrentId((id) => id ?? next[0]?.id ?? null);
    }
    function onVolume(e: Event) {
      const detail = (e as CustomEvent<number>).detail;
      const value = typeof detail === "number" ? detail : loadVolume();
      setVolume(value);
      setMuted(value <= 0.001);
      if (value > 0.001) setPreMuteVolume(value);
    }
    refresh();
    const initial = loadVolume();
    setVolume(initial);
    setPreMuteVolume(initial || 0.85);
    setMuted(initial <= 0.001);
    window.addEventListener("friends-tracks-changed", refresh);
    window.addEventListener("friends-audio-volume", onVolume);
    return () => {
      window.removeEventListener("friends-tracks-changed", refresh);
      window.removeEventListener("friends-audio-volume", onVolume);
    };
  }, []);

  const current = useMemo(
    () => library.find((tr) => tr.id === currentId) ?? library[0] ?? null,
    [library, currentId],
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = muted ? 0 : volume;
  }, [volume, muted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    let cancelled = false;
    void (async () => {
      const url = await getTrackObjectUrl(current.id);
      if (cancelled || !url) return;
      const same = audio.dataset.trackId === current.id;
      if (!same) {
        audio.dataset.trackId = current.id;
        audio.src = url;
        audio.currentTime = 0;
        setProgress(0);
        setElapsed("0:00");
      }
      audio.volume = muted ? 0 : volume;
      if (playing) {
        void audio.play().catch(() => setPlaying(false));
      } else {
        audio.pause();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [current, playing, volume, muted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    function onTime() {
      const a = audioRef.current;
      if (!a || !Number.isFinite(a.duration) || a.duration <= 0) return;
      setProgress(Math.min(100, (a.currentTime / a.duration) * 100));
      setElapsed(formatPlaybackTime(a.currentTime));
    }
    function onEnded() {
      nextTrack(true);
    }
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
    };
  });

  useEffect(() => {
    if (sleepMin == null || !sleepEndsAtRef.current) {
      setSleepLeftSec(0);
      return;
    }
    function tick() {
      const ends = sleepEndsAtRef.current;
      if (!ends) return;
      const left = Math.max(0, Math.ceil((ends - Date.now()) / 1000));
      setSleepLeftSec(left);
      if (left <= 0) {
        sleepEndsAtRef.current = null;
        setSleepMin(null);
        setPlaying(false);
        setSleepLeftSec(0);
      }
    }
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [sleepMin]);

  function nextTrack(auto = false) {
    if (!library.length || !current) return;
    const i = library.findIndex((tr) => tr.id === current.id);
    if (auto && i >= library.length - 1) {
      setPlaying(false);
      setProgress(0);
      setElapsed("0:00");
      return;
    }
    setCurrentId(library[(i + 1) % library.length].id);
    setPlaying(true);
  }

  function prevTrack() {
    if (!library.length || !current) return;
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setProgress(0);
      setElapsed("0:00");
      return;
    }
    const i = library.findIndex((tr) => tr.id === current.id);
    setCurrentId(library[(i - 1 + library.length) % library.length].id);
    setPlaying(true);
  }

  function setSleep(minutes: number | null) {
    if (minutes == null) {
      sleepEndsAtRef.current = null;
      setSleepMin(null);
      setSleepLeftSec(0);
      return;
    }
    sleepEndsAtRef.current = Date.now() + minutes * 60_000;
    setSleepMin(minutes);
    setSleepLeftSec(minutes * 60);
    if (!playing) setPlaying(true);
  }

  function formatSleepLeft(sec: number) {
    const m = Math.floor(sec / 60);
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  if (!current) {
    return (
      <div className="player-mini player-mini-empty">
        <span>{t("audio.localOnly")}</span>
        <Link href="/audio" className="vk-right-link">
          {t("audio.upload")}
        </Link>
      </div>
    );
  }

  return (
    <div className="player-mini is-rich">
      <audio ref={audioRef} preload="metadata" />

      <div className="player-mini-sleep" role="group" aria-label={t("audio.sleepTimer")}>
        <span className="player-mini-sleep-label">
          {sleepMin != null
            ? t("audio.sleepLeft", { time: formatSleepLeft(sleepLeftSec) })
            : t("audio.sleepTimer")}
        </span>
        <div className="player-mini-sleep-options">
          <button
            type="button"
            className={`player-mini-chip${sleepMin == null ? " is-on" : ""}`}
            onClick={() => setSleep(null)}
          >
            {t("audio.sleepOff")}
          </button>
          {SLEEP_OPTIONS_MIN.map((m) => (
            <button
              key={m}
              type="button"
              className={`player-mini-chip${sleepMin === m ? " is-on" : ""}`}
              onClick={() => setSleep(m)}
            >
              {t("audio.sleepMin", { m })}
            </button>
          ))}
        </div>
      </div>

      <div className="player-mini-main">
        <div className="player-cover sm" aria-hidden>
          {current.cover}
        </div>
        <div className="player-mini-info">
          <div className="player-title">{current.title}</div>
          <div className="player-artist">{current.artist}</div>
        </div>
      </div>

      <div className="player-mini-seek">
        <input
          type="range"
          min={0}
          max={100}
          value={progress}
          aria-label={t("audio.progress")}
          onChange={(e) => {
            const audio = audioRef.current;
            const value = Number(e.target.value);
            setProgress(value);
            if (audio?.duration) {
              audio.currentTime = (value / 100) * audio.duration;
              setElapsed(formatPlaybackTime(audio.currentTime));
            }
          }}
        />
        <div className="player-mini-time">
          <span>{elapsed}</span>
          <span>{current.duration}</span>
        </div>
      </div>

      <div className="player-mini-actions">
        <button
          type="button"
          className="player-icon-btn"
          aria-label={t("audio.prev")}
          onClick={prevTrack}
        >
          ⏮
        </button>
        <button
          type="button"
          className="player-icon-btn"
          aria-label={playing ? t("audio.pause") : t("audio.play")}
          onClick={() => setPlaying((v) => !v)}
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <button
          type="button"
          className="player-icon-btn"
          aria-label={t("audio.next")}
          onClick={() => nextTrack()}
        >
          ⏭
        </button>
      </div>

      <div className="player-mini-foot">
        <Link href="/audio" className="vk-right-link player-mini-more">
          {t("nav.audio")} →
        </Link>
        <div className="player-mini-volume">
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round((muted ? 0 : volume) * 100)}
            aria-label={t("audio.volume")}
            onChange={(e) => {
              const nextVol = Number(e.target.value) / 100;
              setMuted(nextVol <= 0.001);
              if (nextVol > 0.001) setPreMuteVolume(nextVol);
              setVolume(saveVolume(nextVol));
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function MusicPlayer({ compact = false }: Props) {
  if (compact) return <CompactPlayer />;
  return <FullMusicPlayer />;
}

function FullMusicPlayer() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const playlistId = searchParams.get("playlist");

  const [library, setLibrary] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistData[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState("0:00");
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [toast, setToast] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [volume, setVolume] = useState(0.85);
  const [muted, setMuted] = useState(false);
  const [preMuteVolume, setPreMuteVolume] = useState(0.85);
  const fileRef = useRef<HTMLInputElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rowRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const dragRef = useRef<string | null>(null);
  const overRef = useRef<string | null>(null);
  const playlistsRef = useRef(playlists);
  playlistsRef.current = playlists;

  useEffect(() => {
    const next = loadTracks();
    setLibrary(next);
    setPlaylists(loadPlaylists());
    setCurrentId(next[0]?.id ?? null);
    const initialVolume = loadVolume();
    setVolume(initialVolume);
    setPreMuteVolume(initialVolume || 0.85);
    setMuted(initialVolume <= 0.001);
    function onTracks() {
      const list = loadTracks();
      setLibrary(list);
      setCurrentId((id) => (id && list.some((tr) => tr.id === id) ? id : list[0]?.id ?? null));
      setPlaylists(loadPlaylists());
    }
    function onPlaylists() {
      setPlaylists(loadPlaylists());
    }
    function onVolume(e: Event) {
      const detail = (e as CustomEvent<number>).detail;
      const value = typeof detail === "number" ? detail : loadVolume();
      setVolume(value);
      setMuted(value <= 0.001);
      if (value > 0.001) setPreMuteVolume(value);
    }
    window.addEventListener("friends-tracks-changed", onTracks);
    window.addEventListener("friends-playlists-changed", onPlaylists);
    window.addEventListener("friends-audio-volume", onVolume);
    return () => {
      window.removeEventListener("friends-tracks-changed", onTracks);
      window.removeEventListener("friends-playlists-changed", onPlaylists);
      window.removeEventListener("friends-audio-volume", onVolume);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = muted ? 0 : volume;
  }, [volume, muted]);

  const activePlaylist = useMemo(
    () => playlists.find((p) => p.id === playlistId) ?? null,
    [playlists, playlistId],
  );

  useEffect(() => {
    setRenaming(false);
    setRenameValue(activePlaylist?.title ?? "");
  }, [activePlaylist?.id, activePlaylist?.title]);

  useEffect(() => {
    if (!renaming) return;
    renameRef.current?.focus();
    renameRef.current?.select();
  }, [renaming]);

  const visibleTracks = useMemo(() => {
    if (!activePlaylist) return library;
    return activePlaylist.trackIds
      .map((id) => library.find((tr) => tr.id === id))
      .filter((tr): tr is Track => !!tr);
  }, [activePlaylist, library]);

  const current = useMemo(
    () => library.find((tr) => tr.id === currentId) ?? visibleTracks[0] ?? library[0] ?? null,
    [library, currentId, visibleTracks],
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) {
      setProgress(0);
      setElapsed("0:00");
      return;
    }
    let cancelled = false;
    void (async () => {
      const url = await getTrackObjectUrl(current.id);
      if (cancelled || !url) return;
      const same = audio.dataset.trackId === current.id;
      if (!same) {
        audio.dataset.trackId = current.id;
        audio.src = url;
        audio.currentTime = 0;
      }
      audio.volume = muted ? 0 : volume;
      if (playing) {
        void audio.play().catch(() => setPlaying(false));
      } else {
        audio.pause();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [current, playing, volume, muted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    function onTime() {
      const a = audioRef.current;
      if (!a || !Number.isFinite(a.duration) || a.duration <= 0) return;
      setProgress(Math.min(100, (a.currentTime / a.duration) * 100));
      setElapsed(formatPlaybackTime(a.currentTime));
    }
    function onEnded() {
      const list = visibleTracks.length ? visibleTracks : library;
      if (!list.length || !currentId) {
        setPlaying(false);
        return;
      }
      const i = list.findIndex((tr) => tr.id === currentId);
      if (i < 0 || i >= list.length - 1) {
        setPlaying(false);
        setProgress(0);
        setElapsed("0:00");
        return;
      }
      setCurrentId(list[i + 1].id);
      setPlaying(true);
      setProgress(0);
      setElapsed("0:00");
    }
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
    };
  }, [visibleTracks, library, currentId]);

  const persist = useCallback((next: PlaylistData[]) => {
    setPlaylists(next);
    try {
      savePlaylists(next);
    } catch {
      /* ignore */
    }
  }, []);

  function selectTrack(track: Track) {
    setCurrentId(track.id);
    setPlaying(true);
    setProgress(0);
    setElapsed("0:00");
  }

  function prev() {
    const list = visibleTracks.length ? visibleTracks : library;
    if (!list.length || !current) return;
    const i = list.findIndex((tr) => tr.id === current.id);
    selectTrack(list[(i - 1 + list.length) % list.length]);
  }

  function next(auto = false) {
    const list = visibleTracks.length ? visibleTracks : library;
    if (!list.length || !current) return;
    const i = list.findIndex((tr) => tr.id === current.id);
    const track = list[(i + 1) % list.length];
    if (auto && i === list.length - 1) {
      setPlaying(false);
      setProgress(0);
      setElapsed("0:00");
      return;
    }
    selectTrack(track);
  }

  function shuffle() {
    if (!visibleTracks.length) return;
    const pick = visibleTracks[Math.floor(Math.random() * visibleTracks.length)];
    selectTrack(pick);
  }

  function showToast(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(""), 1800);
  }

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      const next = await addTracksFromFiles(files);
      setLibrary(next);
      setPlaylists(loadPlaylists());
      if (!currentId && next[0]) setCurrentId(next[0].id);
      showToast(t("audio.uploaded", { n: files.length }));
    } catch {
      showToast(t("audio.uploadFail"));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onDeleteTrack(id: string) {
    const next = await removeTrack(id);
    setLibrary(next);
    const cleaned = loadPlaylists().map((pl) => ({
      ...pl,
      trackIds: pl.trackIds.filter((tid) => tid !== id),
    }));
    persist(cleaned);
    if (currentId === id) {
      setCurrentId(next[0]?.id ?? null);
      setPlaying(false);
    }
  }

  function onAddToPlaylist(plId: string, trackId: string) {
    const next = addTrackToPlaylist(playlistsRef.current, plId, trackId);
    persist(next);
    const title = next.find((p) => p.id === plId)?.title ?? t("audio.library");
    showToast(t("audio.addedTo", { title }));
  }

  function commitRename() {
    if (!activePlaylist) {
      setRenaming(false);
      return;
    }
    const nextTitle = renameValue.trim();
    if (!nextTitle || nextTitle === activePlaylist.title) {
      setRenameValue(activePlaylist.title);
      setRenaming(false);
      return;
    }
    persist(renamePlaylist(playlistsRef.current, activePlaylist.id, nextTitle));
    setRenaming(false);
    showToast(t("audio.renamed"));
  }

  function onContextMenu(e: React.MouseEvent, track: Track) {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, track });
  }

  const findRowAtPoint = useCallback((x: number, y: number) => {
    for (const id of Object.keys(rowRefs.current)) {
      const el = rowRefs.current[id];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return id;
      }
    }
    return null;
  }, []);

  useEffect(() => {
    if (!draggingId || !activePlaylist) return;

    function onMove(e: PointerEvent) {
      const id = findRowAtPoint(e.clientX, e.clientY);
      if (id && id !== overRef.current) {
        overRef.current = id;
        setOverId(id);
      }
    }

    function onUp() {
      const fromId = dragRef.current;
      const toId = overRef.current;
      if (fromId && toId && fromId !== toId && activePlaylist) {
        persist(
          reorderPlaylistTracks(playlistsRef.current, activePlaylist.id, fromId, toId),
        );
      }
      dragRef.current = null;
      overRef.current = null;
      setDraggingId(null);
      setOverId(null);
      document.body.classList.remove("is-sorting");
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [draggingId, activePlaylist, findRowAtPoint, persist]);

  function startTrackDrag(e: ReactPointerEvent, id: string) {
    if (!activePlaylist) return;
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = id;
    overRef.current = id;
    setDraggingId(id);
    setOverId(id);
    document.body.classList.add("is-sorting");
  }

  const nowPlaying = (
    <section className="vk-card player-panel">
      <audio ref={audioRef} preload="metadata" />
      <div className="player-now">
        <div className="player-cover lg" aria-hidden>
          {current?.cover ?? "♪"}
        </div>
        <div className="player-now-meta">
          <div className="player-kicker">{t("audio.nowPlaying")}</div>
          <div className="player-now-title">
            {current?.title ?? t("audio.emptyLibrary")}
          </div>
          <div className="player-artist">
            {current?.artist ?? t("audio.localOnly")}
          </div>

          <div className="player-progress">
            <input
              type="range"
              min={0}
              max={100}
              value={progress}
              disabled={!current}
              onChange={(e) => {
                const audio = audioRef.current;
                const value = Number(e.target.value);
                setProgress(value);
                if (audio?.duration) {
                  audio.currentTime = (value / 100) * audio.duration;
                  setElapsed(formatPlaybackTime(audio.currentTime));
                }
              }}
              aria-label={t("audio.progress")}
            />
            <div className="player-time">
              <span>{elapsed}</span>
              <span>{current?.duration ?? "0:00"}</span>
            </div>
          </div>

          <div className="player-controls">
            <button
              type="button"
              className="player-ctrl"
              aria-label={t("audio.prev")}
              onClick={prev}
              disabled={!current}
            >
              ⏮
            </button>
            <button
              type="button"
              className="player-play"
              aria-label={playing ? t("audio.pause") : t("audio.play")}
              onClick={() => setPlaying((v) => !v)}
              disabled={!current}
            >
              {playing ? "❚❚" : "▶"}
            </button>
            <button
              type="button"
              className="player-ctrl"
              aria-label={t("audio.next")}
              onClick={() => next()}
              disabled={!current}
            >
              ⏭
            </button>
            <div className="player-volume">
              <input
                type="range"
                className="player-volume-slider"
                min={0}
                max={100}
                value={Math.round((muted ? 0 : volume) * 100)}
                aria-label={t("audio.volume")}
                onChange={(e) => {
                  const next = Number(e.target.value) / 100;
                  setMuted(next <= 0.001);
                  if (next > 0.001) setPreMuteVolume(next);
                  setVolume(saveVolume(next));
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  const trackList = (
    <section className="vk-card player-panel">
      <div className="player-tracks-block">
        <div className="player-tracks-head">
          <div className="player-tracks-titles">
            {activePlaylist ? (
              <>
                <button
                  type="button"
                  className="player-back"
                  onClick={() => router.push("/audio")}
                >
                  {t("audio.backLibrary")}
                </button>
                {renaming ? (
                  <input
                    ref={renameRef}
                    className="player-rename-input"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitRename();
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setRenameValue(activePlaylist.title);
                        setRenaming(false);
                      }
                    }}
                    aria-label={t("audio.renamePlaylist")}
                    maxLength={64}
                  />
                ) : (
                  <div className="player-title-row">
                    <h2 className="player-section-title">{activePlaylist.title}</h2>
                    <button
                      type="button"
                      className="player-rename-btn"
                      title={t("audio.renamePlaylist")}
                      aria-label={t("audio.renamePlaylist")}
                      onClick={() => {
                        setRenameValue(activePlaylist.title);
                        setRenaming(true);
                      }}
                    >
                      ✎
                    </button>
                  </div>
                )}
                <p className="player-tracks-sub">
                  {t("audio.tracksCount", { n: visibleTracks.length })}
                </p>
              </>
            ) : (
              <>
                <h2 className="player-section-title">{t("audio.library")}</h2>
                <p className="player-tracks-sub">{t("audio.localHint")}</p>
              </>
            )}
          </div>
          <div className="player-tracks-actions">
            {!activePlaylist ? (
              <button
                type="button"
                className="vk-btn"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                {busy ? t("audio.uploading") : t("audio.upload")}
              </button>
            ) : null}
            <button
              type="button"
              className="vk-btn player-shuffle"
              onClick={shuffle}
              disabled={!visibleTracks.length}
            >
              <svg viewBox="0 0 16 16" aria-hidden>
                <path
                  fill="currentColor"
                  d="M11.2 2.2h2.1v2.1h-1.2V3.4l-2.3 2.3-.9-.9 2.3-2.3h-.9V2.2zm-7.7 0H5.8v1.2H3.5l2.3 2.3-.9.9-2.3-2.3v.9H1.4V2.2h2.1zm9.8 9.5v.9l-2.3-2.3-.9.9 2.3 2.3h-.9v1.2h2.1V12h1.2v2.1h-2.1v-1.2H11l-3.1-3.1.9-.9 2.2 2.2v-.9h1.2zM3.5 9.3l2.3 2.3H5.8v1.2H1.4v-2.1h1.2v.9l2.2-2.2.9.9-2.2 2.2z"
                />
              </svg>
              {t("audio.shuffleAll")}
            </button>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          multiple
          hidden
          onChange={(e) => void onUpload(e.target.files)}
        />

        <ul className="player-track-list">
          {visibleTracks.map((track) => {
            const active = track.id === currentId;
            const isDragging = draggingId === track.id;
            const isOver = !!draggingId && overId === track.id && draggingId !== track.id;
            return (
              <li
                key={track.id}
                ref={(el) => {
                  rowRefs.current[track.id] = el;
                }}
                className={`player-track-row${isDragging ? " is-dragging" : ""}${isOver ? " is-over" : ""}`}
              >
                {activePlaylist ? (
                  <button
                    type="button"
                    className="track-grip"
                    title={t("audio.drag")}
                    aria-label={t("audio.drag")}
                    onPointerDown={(e) => startTrackDrag(e, track.id)}
                  >
                    <GripIcon />
                  </button>
                ) : null}
                <button
                  type="button"
                  className={`player-track${active ? " is-active" : ""}`}
                  onClick={() => selectTrack(track)}
                  onContextMenu={(e) => onContextMenu(e, track)}
                >
                  <span className="player-cover sm">{track.cover}</span>
                  <span className="player-track-meta">
                    <span className="player-title">{track.title}</span>
                    <span className="player-artist">{track.artist}</span>
                  </span>
                  <span className="player-track-actions">
                    {active && playing ? <span className="player-eq">♪</span> : null}
                    <span className="player-duration">{track.duration}</span>
                  </span>
                </button>
                {activePlaylist ? (
                  <button
                    type="button"
                    className="track-remove"
                    title={t("audio.removeFromPlaylist")}
                    aria-label={t("audio.removeFromPlaylist")}
                    onClick={() =>
                      persist(
                        removeTrackFromPlaylist(
                          playlistsRef.current,
                          activePlaylist.id,
                          track.id,
                        ),
                      )
                    }
                  >
                    ×
                  </button>
                ) : (
                  <button
                    type="button"
                    className="track-remove"
                    title={t("common.delete")}
                    aria-label={t("common.delete")}
                    onClick={() => void onDeleteTrack(track.id)}
                  >
                    ×
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {!visibleTracks.length ? (
          <div className="player-empty">
            {activePlaylist ? t("audio.emptyPlaylist") : t("audio.emptyLibrary")}
            <div style={{ marginTop: 10 }}>
              {activePlaylist ? (
                <Link href="/audio" className="vk-right-link">
                  {t("audio.toLibrary")}
                </Link>
              ) : (
                <button
                  type="button"
                  className="vk-btn"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                >
                  {t("audio.upload")}
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );

  return (
    <>
      <SortableBlocks
        storageKey="friends.blocks.audio"
        className="sortable-stack player-page"
        items={[
          { id: "now", node: nowPlaying },
          { id: "tracks", node: trackList },
        ]}
      />
      <TrackContextMenu
        menu={menu}
        playlists={playlists}
        onClose={() => setMenu(null)}
        onAddToPlaylist={onAddToPlaylist}
      />
      {toast ? <div className="player-toast">{toast}</div> : null}
    </>
  );
}
