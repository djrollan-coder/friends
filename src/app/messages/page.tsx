"use client";

import { useEffect, useMemo, useState } from "react";
import { friends } from "@/data/mock";
import {
  createGroupChat,
  deleteChat,
  loadChats,
  peerOf,
  type ChatThread,
} from "@/lib/chatStore";
import { useT } from "@/lib/i18n/I18nProvider";
import { useRouter } from "next/navigation";

function ThreadRow({
  thread,
  onOpen,
  onDelete,
  emptyLabel,
  deleteLabel,
}: {
  thread: ChatThread;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  emptyLabel: string;
  deleteLabel: string;
}) {
  const peer = peerOf(thread);
  const last = thread.messages[thread.messages.length - 1];
  return (
    <div className="messages-row-wrap">
      <button
        type="button"
        className="vk-list-row messages-row"
        onClick={() => onOpen(thread.id)}
      >
        <div className="vk-avatar sm">{peer?.avatar ?? "??"}</div>
        <div className="messages-row-main">
          <div className="messages-row-title">{thread.title}</div>
          <div className="messages-preview">{last?.text ?? emptyLabel}</div>
        </div>
        <div className="vk-list-meta">
          {last?.createdAt ?? ""}
          {thread.unread ? (
            <span className="vk-badge" style={{ marginLeft: 8 }}>
              {thread.unread}
            </span>
          ) : null}
        </div>
      </button>
      <button
        type="button"
        className="messages-delete-btn"
        aria-label={deleteLabel}
        title={deleteLabel}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete(thread.id);
        }}
      >
        ×
      </button>
    </div>
  );
}

export default function MessagesPage() {
  const router = useRouter();
  const t = useT();
  const [chats, setChats] = useState<ChatThread[]>([]);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [picked, setPicked] = useState<string[]>([friends[0].id, friends[1].id]);

  useEffect(() => {
    setChats(loadChats());
  }, []);

  const groups = useMemo(() => {
    const lastAt = (t: ChatThread) => t.messages[t.messages.length - 1]?.createdAt ?? "";
    return chats
      .filter((t) => t.type === "group")
      .sort((a, b) => lastAt(b).localeCompare(lastAt(a), "ru"));
  }, [chats]);

  const dms = useMemo(() => {
    const lastAt = (t: ChatThread) => t.messages[t.messages.length - 1]?.createdAt ?? "";
    return chats
      .filter((t) => t.type === "dm")
      .sort((a, b) => lastAt(b).localeCompare(lastAt(a), "ru"));
  }, [chats]);

  function toggleMember(id: string) {
    setPicked((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function openThread(id: string) {
    router.push(`/messages/${id}`);
  }

  function removeThread(id: string) {
    if (!window.confirm(t("messages.deleteConfirm"))) return;
    setChats(deleteChat(id));
  }

  function openCreate() {
    setCreating(true);
  }

  return (
    <div className="vk-card vk-main-pad">
      <div className="messages-head">
        <h1 className="vk-page-title">{t("messages.title")}</h1>
      </div>

      <div className="messages-groups-row">
        <div className="messages-groups">
          {groups.map((thread) => {
            const last = thread.messages[thread.messages.length - 1];
            return (
              <div key={thread.id} className="messages-group-chip-wrap">
                <button
                  type="button"
                  className="messages-group-chip"
                  onClick={() => openThread(thread.id)}
                  title={last?.text ?? thread.title}
                >
                  <span className="vk-avatar sm">GR</span>
                  <span className="messages-group-name">{thread.title}</span>
                  {thread.unread ? (
                    <span className="vk-badge">{thread.unread}</span>
                  ) : null}
                </button>
                <button
                  type="button"
                  className="messages-group-delete"
                  aria-label={t("messages.delete")}
                  title={t("messages.delete")}
                  onClick={() => removeThread(thread.id)}
                >
                  ×
                </button>
              </div>
            );
          })}
          <button
            type="button"
            className="messages-group-add"
            onClick={openCreate}
            aria-label={t("messages.createGroup")}
            title={t("messages.createGroup")}
          >
            +
          </button>
        </div>
        <button
          type="button"
          className="vk-btn messages-group-cta"
          onClick={() => setCreating((v) => !v)}
        >
          {creating ? t("common.close") : t("messages.groupChat")}
        </button>
      </div>

      {creating ? (
        <div className="group-create">
          <label>
            {t("videos.name")}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("messages.groupName")}
              autoFocus
            />
          </label>
          <div className="interest-chips is-edit" style={{ marginTop: 10 }}>
            {friends.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`interest-chip${picked.includes(f.id) ? " is-on" : ""}`}
                onClick={() => toggleMember(f.id)}
              >
                {f.name}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="vk-btn"
            style={{ marginTop: 12 }}
            disabled={!picked.length}
            onClick={() => {
              const { thread, chats: next } = createGroupChat(title, picked);
              setChats(next);
              setCreating(false);
              setTitle("");
              router.push(`/messages/${thread.id}`);
            }}
          >
            {t("common.create")}
          </button>
        </div>
      ) : null}

      <div className="vk-list">
        {dms.map((thread) => (
          <ThreadRow
            key={thread.id}
            thread={thread}
            onOpen={openThread}
            onDelete={removeThread}
            emptyLabel={t("messages.noMessages")}
            deleteLabel={t("messages.delete")}
          />
        ))}
      </div>
    </div>
  );
}
