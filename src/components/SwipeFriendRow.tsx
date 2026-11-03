"use client";

import {
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

const DELETE_WIDTH = 88;
const THRESHOLD = 56;

type Props = {
  children: ReactNode;
  deleteLabel: string;
  onDelete: () => void;
};

export function SwipeFriendRow({ children, deleteLabel, onDelete }: Props) {
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const base = useRef(0);
  const axis = useRef<"none" | "x" | "y">("none");
  const dragging = useRef(false);

  const clamp = useCallback((value: number) => Math.min(0, Math.max(-DELETE_WIDTH, value)), []);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragging.current = true;
    axis.current = "none";
    startX.current = e.clientX;
    startY.current = e.clientY;
    base.current = offset;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
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
    if (!dragging.current && axis.current !== "x") {
      dragging.current = false;
      axis.current = "none";
      return;
    }
    dragging.current = false;
    const opened = offset < -THRESHOLD;
    setOffset(opened ? -DELETE_WIDTH : 0);
    axis.current = "none";
  }

  function onPointerUp() {
    endDrag();
  }

  return (
    <div className="friends-swipe">
      <button
        type="button"
        className="friends-swipe-delete"
        tabIndex={offset < -20 ? 0 : -1}
        onClick={(e) => {
          e.stopPropagation();
          setOffset(0);
          onDelete();
        }}
      >
        {deleteLabel}
      </button>
      <div
        className="friends-swipe-front"
        style={{ transform: `translate3d(${offset}px,0,0)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={endDrag}
      >
        {children}
      </div>
    </div>
  );
}
