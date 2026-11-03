"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createGroupChat,
  deleteChat,
  fetchChats,
  peerOf,
  type ChatThread,
} from "@/lib/chatStore";
import { fetchPeople } from "@/lib/friendsStore";
import type { Person } from "@/lib/dto";
import { useT } from "@/lib/i18n/I18nProvider";
import { useLive } from "@/lib/live";
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
  const [people, setPeople] = useState<Person[]>([]);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setChats(await fetchChats());
  }, []);

  useEffect(() => {
    void load();
    void fetchPeople().then((list) => {
      setPeople(list);
      setPicked((prev) => (prev.length ? prev : list.slice(0, 2).map((p) => p.id)));
    });
  }, [load]);

  useLive(["message"], (event) => {
    if (event.read) return;
    void load();
  });

  const groups = useMemo(() => chats.filter((c) => c.type === "group"), [chats]);
  const dms = useMemo(() => chats.filter((c) => c.type === "dm"), [chats]);

  function toggleMember(id: string) {
    setPicked((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function openThread(id: string) {
    router.push(`/messages/${id}`);
  }

  async function removeThread(id: string) {
    if (!window.confirm(t("messages.deleteConfirm"))) return;
    setChats(await deleteChat(id));
  }

  async function createChat() {
    setBusy(true);
    try {
      const { thread, chats: next } = await createGroupChat(title, picked);
      setChats(next);
      setCreating(false);
      setTitle("");
      router.push(`/messages/${thread.id}`);
    } finally {
      setBusy(false);
    }
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
                  onClick={() => void removeThread(thread.id)}
                >
                  ×
                </button>
              </div>
            );
          })}
          <button
            type="button"
            className="messages-group-add"
            onClick={() => setCreating(true)}
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
            {people.map((f) => (
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
            disabled={!picked.length || busy}
            onClick={() => void createChat()}
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
            onDelete={(id) => void removeThread(id)}
            emptyLabel={t("messages.noMessages")}
            deleteLabel={t("messages.delete")}
          />
        ))}
        {!dms.length ? <div className="vk-empty">{t("common.empty")}</div> : null}
      </div>
    </div>
  );
}
