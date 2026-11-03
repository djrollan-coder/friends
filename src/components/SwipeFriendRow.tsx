"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

const DELETE_WIDTH = 84;
const THRESHOLD = 52;

type Props = {
  children: ReactNode;
  deleteLabel: string;
  onDelete: () => void;
};

export function SwipeFriendRow({ children, deleteLabel, onDelete }: Props) {
  const [offset, setOffset] = useState(0);
  const [swipeEnabled, setSwipeEnabled] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const base = useRef(0);
  const axis = useRef<"none" | "x" | "y">("none");
  const dragging = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: none) and (pointer: coarse), (max-width: 900px)");
    const sync = () => setSwipeEnabled(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const clamp = useCallback((value: number) => Math.min(0, Math.max(-DELETE_WIDTH, value)), []);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!swipeEnabled) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragging.current = true;
    axis.current = "none";
    startX.current = e.clientX;
    startY.current = e.clientY;
    base.current = offset;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!swipeEnabled || !dragging.current) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    if (axis.current === "none") {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      axis.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (axis.current === "y") {
        dragging.current = false;
        return;
      }
    }

    if (axis.current !== "x") return;
    e.preventDefault();
    setOffset(clamp(base.current + dx));
  }

  function endDrag() {
    if (!swipeEnabled) return;
    if (!dragging.current && axis.current !== "x") {
      dragging.current = false;
      axis.current = "none";
      return;
    }
    dragging.current = false;
    setOffset(offset < -THRESHOLD ? -DELETE_WIDTH : 0);
    axis.current = "none";
  }

  return (
    <div className={`friends-swipe${swipeEnabled ? " is-swipeable" : ""}`}>
      {swipeEnabled ? (
        <button
          type="button"
          className="friends-swipe-delete"
          tabIndex={offset < -20 ? 0 : -1}
          aria-hidden={offset >= -20}
          onClick={(e) => {
            e.stopPropagation();
            setOffset(0);
            onDelete();
          }}
        >
          {deleteLabel}
        </button>
      ) : null}
      <div
        className="friends-swipe-front"
        style={swipeEnabled ? { transform: `translate3d(${offset}px,0,0)` } : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {children}
        {!swipeEnabled ? (
          <button
            type="button"
            className="friends-quiet-remove"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            {deleteLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
