"use client";

import { useEffect, useRef } from "react";

export type LiveEventPayload = {
  type: string;
  [key: string]: unknown;
};

/** Opens one SSE connection for the signed-in session. */
export function LiveBridge() {
  useEffect(() => {
    let source: EventSource | null = null;
    let closed = false;

    function connect() {
      if (closed) return;
      source = new EventSource("/api/events");
      source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as LiveEventPayload;
          if (!data?.type) return;
          window.dispatchEvent(new CustomEvent("friends-live", { detail: data }));
        } catch {
          /* ignore malformed frame */
        }
      };
      source.onerror = () => {
        source?.close();
        source = null;
        if (!closed) window.setTimeout(connect, 4000);
      };
    }

    connect();
    return () => {
      closed = true;
      source?.close();
    };
  }, []);

  return null;
}

/**
 * Subscribes a component to live events. `types` limits which server events
 * trigger the callback; pass null for every event. The callback also runs when
 * the tab becomes visible again, which covers suspended mobile WebViews.
 */
export function useLive(types: string[] | null, callback: (event: LiveEventPayload) => void) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const key = types ? types.join(",") : "*";

  useEffect(() => {
    const allowed = key === "*" ? null : new Set(key.split(","));
    function onLive(event: Event) {
      const data = (event as CustomEvent<LiveEventPayload>).detail;
      if (!data?.type) return;
      if (allowed && !allowed.has(data.type)) return;
      callbackRef.current(data);
    }
    function onVisible() {
      if (document.visibilityState === "visible") {
        callbackRef.current({ type: "visible" });
      }
    }
    window.addEventListener("friends-live", onLive);
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("friends-live", onLive);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [key]);
}
