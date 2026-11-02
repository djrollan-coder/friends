"use client";

import { useEffect } from "react";
import { processDueScheduled } from "@/lib/scheduledMessages";

/** Quiet background sender for timer / when-online messages */
export function ScheduledSendRunner() {
  useEffect(() => {
    function tick() {
      const { sent } = processDueScheduled();
      if (sent.length) {
        window.dispatchEvent(
          new CustomEvent("friends-chat-updated", {
            detail: { threadIds: sent.map((s) => s.threadId) },
          }),
        );
      }
    }
    tick();
    const id = window.setInterval(tick, 2000);
    window.addEventListener("friends-presence-changed", tick);
    window.addEventListener("friends-scheduled-changed", tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("friends-presence-changed", tick);
      window.removeEventListener("friends-scheduled-changed", tick);
    };
  }, []);

  return null;
}
