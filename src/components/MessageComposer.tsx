"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { useT } from "@/lib/i18n/I18nProvider";
import {
  cancelScheduled,
  scheduleTimerMessage,
  scheduleWhenOnline,
  scheduledForThread,
  type ScheduledMessage,
} from "@/lib/scheduledMessages";
import { ScheduleMessageModal } from "./ScheduleMessageModal";

type Props = {
  threadId?: string;
  isDm?: boolean;
  onSend?: (text: string) => void;
  /** silent = no sound / quiet send */
  onSendSilent?: (text: string) => void;
  onScheduled?: () => void;
};

type MenuPos = { x: number; y: number };

export function MessageComposer({
  threadId,
  isDm,
  onSend,
  onSendSilent,
  onScheduled,
}: Props) {
  const t = useT();
  const [text, setText] = useState("");
  const [menu, setMenu] = useState<MenuPos | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, setPending] = useState<ScheduledMessage[]>([]);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const skipCloseRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function refreshPending() {
    if (!threadId) {
      setPending([]);
      return;
    }
    setPending(scheduledForThread(threadId));
  }

  useEffect(() => {
    refreshPending();
    function onChange() {
      refreshPending();
    }
    window.addEventListener("friends-scheduled-changed", onChange);
    return () => window.removeEventListener("friends-scheduled-changed", onChange);
  }, [threadId]);

  useEffect(() => {
    function onDoc(e: globalThis.MouseEvent) {
      if (!menu || skipCloseRef.current) return;
      if (menuRef.current?.contains(e.target as Node)) return;
      setMenu(null);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menu]);

  function send(silent = false) {
    const value = text.trim();
    if (!value) return;
    if (silent) onSendSilent?.(value) ?? onSend?.(value);
    else onSend?.(value);
    setText("");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    send(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      send(false);
    }
  }

  function openMenu(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!threadId || !text.trim()) return;
    skipCloseRef.current = true;
    const w = 260;
    const h = isDm ? 168 : 120;
    const x = Math.min(e.clientX, window.innerWidth - w - 8);
    const y = Math.min(e.clientY, window.innerHeight - h - 8);
    setMenu({ x: Math.max(8, x), y: Math.max(8, y) });
    window.setTimeout(() => {
      skipCloseRef.current = false;
    }, 0);
  }

  function openMenuFromBtn(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!threadId || !text.trim()) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    skipCloseRef.current = true;
    const w = 260;
    const h = isDm ? 168 : 120;
    setMenu({
      x: Math.max(8, Math.min(rect.right - w, window.innerWidth - w - 8)),
      y: Math.max(8, Math.min(rect.top - h - 8, window.innerHeight - h - 8)),
    });
    window.setTimeout(() => {
      skipCloseRef.current = false;
    }, 0);
  }

  function afterSchedule() {
    setText("");
    setPickerOpen(false);
    setMenu(null);
    refreshPending();
    onScheduled?.();
  }

  function formatPending(item: ScheduledMessage) {
    if (item.mode === "when_online") return t("msg.pendingOnline");
    if (!item.sendAt) return t("msg.pendingTimer");
    const when = new Date(item.sendAt);
    return `${String(when.getDate()).padStart(2, "0")}.${String(when.getMonth() + 1).padStart(2, "0")} ${String(when.getHours()).padStart(2, "0")}:${String(when.getMinutes()).padStart(2, "0")}`;
  }

  const canSchedule = !!threadId && !!text.trim();

  const menuNode =
    mounted && menu ? (
      createPortal(
        <div
          ref={menuRef}
          role="menu"
          onMouseDown={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            position: "fixed",
            left: menu.x,
            top: menu.y,
            zIndex: 10000,
            minWidth: 248,
            padding: 6,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(36, 38, 41, 0.98)",
            boxShadow: "0 14px 40px rgba(0,0,0,0.5)",
            display: "grid",
            gap: 2,
          }}
        >
          <MenuItem
            icon="🔕"
            label={t("msg.sendSilent")}
            onClick={() => {
              setMenu(null);
              send(true);
            }}
          />
          {isDm ? (
            <MenuItem
              icon="👤⏱"
              label={t("msg.whenOnline")}
              onClick={() => {
                if (!threadId || !text.trim()) return;
                scheduleWhenOnline(threadId, text);
                afterSchedule();
              }}
            />
          ) : null}
          <MenuItem
            icon="🕒"
            label={t("msg.sendLater")}
            onClick={() => {
              setMenu(null);
              setPickerOpen(true);
            }}
          />
        </div>,
        document.body,
      )
    ) : null;

  return (
    <div className="msg-composer">
      <form className="vk-composer" style={{ marginTop: 12 }} onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onContextMenu={openMenu}
          placeholder={t("msg.placeholder")}
          aria-label={t("msg.aria")}
        />
        <div className="vk-composer-actions">
          <div className="msg-send-group">
            <button
              className="vk-btn"
              type="submit"
              disabled={!text.trim()}
              onContextMenu={openMenuFromBtn}
            >
              {t("msg.send")}
            </button>
            <button
              type="button"
              className="msg-schedule-btn"
              disabled={!canSchedule}
              title={t("msg.sendLater")}
              aria-label={t("msg.sendLater")}
              aria-haspopup="menu"
              aria-expanded={!!menu}
              onClick={openMenuFromBtn}
              onContextMenu={openMenuFromBtn}
            >
              ▾
            </button>
          </div>
        </div>
      </form>

      {pending.length ? (
        <div className="msg-pending" aria-live="polite">
          {pending.map((item) => (
            <div key={item.id} className="msg-pending-row">
              <span className="msg-pending-text" title={item.text}>
                {item.text}
              </span>
              <span className="msg-pending-meta">{formatPending(item)}</span>
              <button
                type="button"
                className="msg-pending-cancel"
                onClick={() => {
                  cancelScheduled(item.id);
                  refreshPending();
                }}
              >
                {t("common.cancel")}
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {menuNode}

      <ScheduleMessageModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onScheduleAt={(sendAt) => {
          if (!threadId || !text.trim()) return;
          const delay = Math.max(1000, sendAt - Date.now());
          scheduleTimerMessage(threadId, text, delay);
          afterSchedule();
        }}
      />
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        border: 0,
        background: "transparent",
        color: "#ececed",
        textAlign: "left",
        padding: "11px 12px",
        borderRadius: 10,
        cursor: "pointer",
        font: "inherit",
        fontSize: 15,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <span style={{ width: 22, textAlign: "center", fontSize: 16 }} aria-hidden>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}
