"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ensureDm } from "@/lib/chatStore";
import { fetchFriends } from "@/lib/friendsStore";
import type { UserDTO } from "@/lib/dto";
import { useLive } from "@/lib/live";
import { useT } from "@/lib/i18n/I18nProvider";
import {
  loadRightBlocks,
  RIGHT_BLOCK_IDS,
  RIGHT_BLOCK_LABEL_KEYS,
  toggleRightBlock,
  type RightBlockId,
} from "@/lib/rightBlocksStore";

export function OnlineBar() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const isMusicPage = pathname === "/audio" || pathname.startsWith("/audio/");
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState<RightBlockId[]>([]);
  const [mounted, setMounted] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 60, right: 56 });
  const [friends, setFriends] = useState<UserDTO[]>([]);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    function refresh() {
      setEnabled(loadRightBlocks());
    }
    refresh();
    window.addEventListener("friends-right-blocks-changed", refresh);
    return () => window.removeEventListener("friends-right-blocks-changed", refresh);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function openMenu() {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuPos({
        top: Math.min(rect.bottom + 8, window.innerHeight - 280),
        right: Math.max(8, window.innerWidth - rect.left + 8),
      });
    }
    setEnabled(loadRightBlocks());
    setOpen((v) => !v);
  }

  const loadFriends = useCallback(async () => {
    try {
      const data = await fetchFriends();
      setFriends(data.people.filter((p) => data.online.includes(p.id)));
    } catch {
      /* offline */
    }
  }, []);

  useEffect(() => {
    void loadFriends();
  }, [loadFriends]);

  useLive(["presence", "friends"], () => void loadFriends());

  async function openDm(userId: string) {
    const { thread } = await ensureDm(userId);
    router.push(`/messages/${thread.id}`);
  }

  const menu =
    mounted && open
      ? createPortal(
          <div
            ref={menuRef}
            className="right-blocks-menu"
            role="menu"
            style={{ top: menuPos.top, right: menuPos.right }}
          >
            <div className="right-blocks-menu-title">{t("right.manageBlocks")}</div>
            <p className="right-blocks-menu-hint">{t("right.manageBlocksHint")}</p>
            {RIGHT_BLOCK_IDS.filter((id) => !(isMusicPage && id === "player")).map(
              (id) => {
                const on = enabled.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={on}
                    className={`right-blocks-menu-item${on ? " is-on" : ""}`}
                    onClick={() => setEnabled(toggleRightBlock(id))}
                  >
                    <span className="right-blocks-check" aria-hidden>
                      {on ? "✓" : ""}
                    </span>
                    <span>{t(RIGHT_BLOCK_LABEL_KEYS[id])}</span>
                    <span className="right-blocks-action">
                      {on ? t("common.delete") : t("common.add")}
                    </span>
                  </button>
                );
              },
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <aside className="vk-chatbar" aria-label={t("right.onlineFriends")}>
      <button
        ref={btnRef}
        type="button"
        className="vk-chatbar-add"
        aria-label={t("right.manageBlocks")}
        title={t("right.manageBlocks")}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={openMenu}
      >
        +
      </button>
      <div className="vk-chatbar-list">
        {friends.map((friend) => (
          <button
            key={friend.id}
            type="button"
            className="vk-chatbar-friend"
            title={friend.name}
            aria-label={t("right.openChatWith", { name: friend.name })}
            onClick={() => void openDm(friend.id)}
          >
            <span className="vk-avatar" aria-hidden>
              {friend.avatar}
            </span>
            <span className="vk-chatbar-online" aria-hidden />
          </button>
        ))}
      </div>
      {menu}
    </aside>
  );
}
