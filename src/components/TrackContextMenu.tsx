"use client";

import { useEffect, useRef } from "react";
import type { PlaylistData } from "@/lib/playlistStore";
import type { Track } from "@/lib/tracksStore";
import { useT } from "@/lib/i18n/I18nProvider";

export type ContextMenuState = {
  x: number;
  y: number;
  track: Track;
};

type Props = {
  menu: ContextMenuState | null;
  playlists: PlaylistData[];
  onClose: () => void;
  onAddToPlaylist: (playlistId: string, trackId: string) => void;
};

export function TrackContextMenu({
  menu,
  playlists,
  onClose,
  onAddToPlaylist,
}: Props) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }

    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  const maxX = typeof window !== "undefined" ? window.innerWidth - 220 : menu.x;
  const maxY = typeof window !== "undefined" ? window.innerHeight - 280 : menu.y;
  const left = Math.min(menu.x, maxX);
  const top = Math.min(menu.y, maxY);

  return (
    <div
      ref={ref}
      className="track-ctx"
      style={{ left, top }}
      role="menu"
      aria-label={t("audio.addToPlaylist")}
    >
      <div className="track-ctx-head">
        {menu.track.title}
        <span>{menu.track.artist}</span>
      </div>
      <div className="track-ctx-label">{t("audio.addToPlaylist")}</div>
      {playlists.map((pl) => {
        const already = pl.trackIds.includes(menu.track.id);
        return (
          <button
            key={pl.id}
            type="button"
            className="track-ctx-item"
            role="menuitem"
            disabled={already}
            onClick={() => {
              onAddToPlaylist(pl.id, menu.track.id);
              onClose();
            }}
          >
            <span className="track-ctx-cover" aria-hidden>
              {pl.cover}
            </span>
            <span className="track-ctx-meta">
              <span>{pl.title}</span>
              <span>
                {already ? t("audio.alreadyIn") : t("audio.trackCount", { n: pl.trackIds.length })}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
