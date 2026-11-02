"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useT } from "@/lib/i18n/I18nProvider";

export type SortableItem = {
  id: string;
  node: ReactNode;
};

type Props = {
  storageKey: string;
  items: SortableItem[];
  className?: string;
};

function reorder(list: string[], fromId: string, toId: string) {
  const next = [...list];
  const from = next.indexOf(fromId);
  const to = next.indexOf(toId);
  if (from < 0 || to < 0 || from === to) return list;
  next.splice(from, 1);
  next.splice(to, 0, fromId);
  return next;
}

export function SortableBlocks({ storageKey, items, className }: Props) {
  const t = useT();
  const defaultOrder = useMemo(() => items.map((i) => i.id), [items]);
  const [order, setOrder] = useState<string[]>(defaultOrder);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const dragIdRef = useRef<string | null>(null);
  const overIdRef = useRef<string | null>(null);
  const orderRef = useRef(order);
  orderRef.current = order;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setOrder(defaultOrder);
        return;
      }
      const saved = JSON.parse(raw) as string[];
      const known = new Set(defaultOrder);
      const cleaned = saved.filter((id) => known.has(id));
      for (const id of defaultOrder) {
        if (!cleaned.includes(id)) cleaned.push(id);
      }
      setOrder(cleaned);
    } catch {
      setOrder(defaultOrder);
    }
  }, [storageKey, defaultOrder]);

  const persist = useCallback(
    (next: string[]) => {
      setOrder(next);
      localStorage.setItem(storageKey, JSON.stringify(next));
    },
    [storageKey],
  );

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i.node])), [items]);

  const findIdAtPoint = useCallback((x: number, y: number) => {
    for (const id of Object.keys(blockRefs.current)) {
      const el = blockRefs.current[id];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return id;
      }
    }
    return null;
  }, []);

  useEffect(() => {
    if (!dragging) return;

    function onMove(e: PointerEvent) {
      const id = findIdAtPoint(e.clientX, e.clientY);
      if (id && id !== overIdRef.current) {
        overIdRef.current = id;
        setOver(id);
      }
    }

    function onUp() {
      const fromId = dragIdRef.current;
      const toId = overIdRef.current;
      if (fromId && toId && fromId !== toId) {
        persist(reorder(orderRef.current, fromId, toId));
      }
      dragIdRef.current = null;
      overIdRef.current = null;
      setDragging(null);
      setOver(null);
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
  }, [dragging, findIdAtPoint, persist]);

  function startDrag(e: ReactPointerEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    dragIdRef.current = id;
    overIdRef.current = id;
    setDragging(id);
    setOver(id);
    document.body.classList.add("is-sorting");
  }

  return (
    <div className={className}>
      {order.map((id) => {
        const node = byId.get(id);
        if (!node) return null;
        const isDragging = dragging === id;
        const isOver = !!dragging && over === id && dragging !== id;
        return (
          <div
            key={id}
            ref={(el) => {
              blockRefs.current[id] = el;
            }}
            className={`sortable-block${isDragging ? " is-dragging" : ""}${isOver ? " is-over" : ""}`}
          >
            <button
              type="button"
              className="sortable-handle"
              title={t("sort.dragBlock")}
              aria-label={t("sort.dragBlock")}
              onPointerDown={(e) => startDrag(e, id)}
            >
              <svg viewBox="0 0 12 16" width="12" height="16" aria-hidden>
                <circle cx="3" cy="2" r="1.4" fill="currentColor" />
                <circle cx="9" cy="2" r="1.4" fill="currentColor" />
                <circle cx="3" cy="8" r="1.4" fill="currentColor" />
                <circle cx="9" cy="8" r="1.4" fill="currentColor" />
                <circle cx="3" cy="14" r="1.4" fill="currentColor" />
                <circle cx="9" cy="14" r="1.4" fill="currentColor" />
              </svg>
            </button>
            <div className="sortable-body">{node}</div>
          </div>
        );
      })}
    </div>
  );
}
