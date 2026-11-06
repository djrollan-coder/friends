"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

const STORAGE_KEY = "friends-skin-bright";
const MIN = 0.62;
const MAX = 1.38;

function clampBright(value: number) {
  return Math.min(MAX, Math.max(MIN, value));
}

function brightToAngleDeg(bright: number) {
  const t = (bright - MIN) / (MAX - MIN);
  return ((t * Math.PI * 2 - Math.PI / 2) * 180) / Math.PI;
}

function angleToBright(angle: number) {
  let a = angle + Math.PI / 2;
  while (a < 0) a += Math.PI * 2;
  while (a >= Math.PI * 2) a -= Math.PI * 2;
  return clampBright(MIN + (a / (Math.PI * 2)) * (MAX - MIN));
}

function applyBright(value: number) {
  document.documentElement.style.setProperty("--skin-bright", String(value));
}

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 1;
    const n = Number(raw);
    return Number.isFinite(n) ? clampBright(n) : 1;
  } catch {
    return 1;
  }
}

function persist(value: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    /* private mode */
  }
}

export function BrightnessOrb() {
  const rootRef = useRef<HTMLButtonElement>(null);
  const brightRef = useRef(1);
  const dragging = useRef(false);
  const [bright, setBright] = useState(1);

  const paint = useEffectEvent((value: number) => {
    brightRef.current = value;
    applyBright(value);
    const el = rootRef.current;
    if (el) el.style.setProperty("--orb-angle", `${brightToAngleDeg(value)}deg`);
  });

  useEffect(() => {
    const initial = readStored();
    setBright(initial);
    paint(initial);
  }, []);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (!dragging.current) return;
      const el = rootRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const angle = Math.atan2(
        event.clientY - (rect.top + rect.height / 2),
        event.clientX - (rect.left + rect.width / 2),
      );
      paint(angleToBright(angle));
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      const value = brightRef.current;
      setBright(value);
      persist(value);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const pct = Math.round(((bright - MIN) / (MAX - MIN)) * 100);

  return (
    <button
      ref={rootRef}
      type="button"
      className="skin-orb"
      aria-label={`Яркость интерфейса ${pct}%`}
      title="Тяни точку — яркость скина"
      style={{ ["--orb-angle" as string]: `${brightToAngleDeg(bright)}deg` }}
      onPointerDown={(event) => {
        event.preventDefault();
        dragging.current = true;
        rootRef.current?.setPointerCapture(event.pointerId);
        const el = rootRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const angle = Math.atan2(
          event.clientY - (rect.top + rect.height / 2),
          event.clientX - (rect.left + rect.width / 2),
        );
        paint(angleToBright(angle));
      }}
      onKeyDown={(event) => {
        if (
          event.key !== "ArrowLeft" &&
          event.key !== "ArrowRight" &&
          event.key !== "ArrowUp" &&
          event.key !== "ArrowDown"
        ) {
          return;
        }
        event.preventDefault();
        const step = event.key === "ArrowLeft" || event.key === "ArrowDown" ? -0.04 : 0.04;
        const next = clampBright(brightRef.current + step);
        paint(next);
        setBright(next);
        persist(next);
      }}
    >
      <span className="skin-orb-core" aria-hidden>
        <span className="skin-orb-glow" />
        <span className="skin-orb-knob" />
      </span>
    </button>
  );
}
