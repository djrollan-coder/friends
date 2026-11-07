"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { useT } from "@/lib/i18n/I18nProvider";
import { COVER_BANNER, renderCoverTransform } from "@/lib/profileMedia";

type Props = {
  src: string;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
};

export function CoverAdjuster({ src, onCancel, onConfirm }: Props) {
  const t = useT();
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameSize, setFrameSize] = useState({ w: 320, h: 112 });
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [natural, setNatural] = useState({ w: 1, h: 1 });
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const dragRef = useRef<{
    x: number;
    y: number;
    panX: number;
    panY: number;
  } | null>(null);

  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setFrameSize({ w: rect.width, h: rect.height });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setNatural({
        w: img.naturalWidth || img.width || 1,
        h: img.naturalHeight || img.height || 1,
      });
      setZoom(1);
      setPanX(0);
      setPanY(0);
    };
    img.src = src;
  }, [src]);

  function coverMetrics(frameW: number, frameH: number, z: number) {
    const base = Math.max(frameW / natural.w, frameH / natural.h);
    const scale = base * z;
    const dw = natural.w * scale;
    const dh = natural.h * scale;
    const maxPanX = Math.max(0, (dw - frameW) / 2);
    const maxPanY = Math.max(0, (dh - frameH) / 2);
    return { dw, dh, maxPanX, maxPanY };
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, panX, panY };
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const { maxPanX, maxPanY } = coverMetrics(frameSize.w, frameSize.h, zoom);
    if (maxPanX <= 0 && maxPanY <= 0) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    setPanX(maxPanX > 0 ? Math.max(-1, Math.min(1, drag.panX + dx / maxPanX)) : 0);
    setPanY(maxPanY > 0 ? Math.max(-1, Math.min(1, drag.panY + dy / maxPanY)) : 0);
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  async function apply() {
    setApplying(true);
    setError("");
    try {
      const dataUrl = await renderCoverTransform(src, { zoom, panX, panY });
      onConfirm(dataUrl);
    } catch {
      setError(t("profile.uploadError"));
    } finally {
      setApplying(false);
    }
  }

  const { dw, dh, maxPanX, maxPanY } = coverMetrics(frameSize.w, frameSize.h, zoom);
  const tx = panX * maxPanX;
  const ty = panY * maxPanY;

  return createPortal(
    <div className="cover-adjuster-backdrop" role="presentation">
      <div
        className="cover-adjuster"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cover-adjuster-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cover-adjuster-head">
          <h2 id="cover-adjuster-title">{t("profile.coverAdjust")}</h2>
          <button
            type="button"
            className="profile-editor-close"
            onClick={onCancel}
            aria-label={t("common.close")}
          >
            ×
          </button>
        </div>

        <p className="cover-adjuster-hint">{t("profile.coverDrag")}</p>

        <div
          ref={frameRef}
          className="cover-adjuster-frame"
          style={{ aspectRatio: `${COVER_BANNER.width} / ${COVER_BANNER.height}` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            draggable={false}
            className="cover-adjuster-img"
            style={{
              width: dw,
              height: dh,
              transform: `translate(${(frameSize.w - dw) / 2 + tx}px, ${(frameSize.h - dh) / 2 + ty}px)`,
            }}
          />
        </div>

        <label className="cover-adjuster-zoom">
          <span>{t("profile.coverZoom")}</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </label>

        {error ? <div className="profile-editor-error">{error}</div> : null}

        <div className="cover-adjuster-footer">
          <button type="button" className="profile-editor-cancel" onClick={onCancel}>
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="profile-editor-save"
            disabled={applying}
            onClick={() => void apply()}
          >
            {applying ? t("common.loading") : t("profile.coverApply")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
