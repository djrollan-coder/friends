"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { friends } from "@/data/mock";
import { getSessionUser } from "@/lib/sessionUser";
import {
  findChat,
  getChat,
  loadChats,
  peerOf,
  sendChatMessage,
  type ChatThread,
} from "@/lib/chatStore";
import { MessageComposer } from "@/components/MessageComposer";
import { VideoCall, type CallParticipant } from "@/components/VideoCall";
import { useT } from "@/lib/i18n/I18nProvider";

export default function MessageThreadPage() {
  const t = useT();
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [thread, setThread] = useState<ChatThread | null | undefined>(undefined);
  const [inCall, setInCall] = useState(false);

  useEffect(() => {
    loadChats();
    setThread(findChat(id) ?? null);
  }, [id]);

  useEffect(() => {
    function onChatUpdated(e: Event) {
      const detail = (e as CustomEvent<{ threadIds?: string[] }>).detail;
      if (!id) return;
      if (detail?.threadIds && !detail.threadIds.includes(id)) return;
      setThread(findChat(id) ?? null);
    }
    window.addEventListener("friends-chat-updated", onChatUpdated);
    window.addEventListener("friends-scheduled-changed", onChatUpdated);
    const poll = window.setInterval(() => {
      setThread(findChat(id) ?? null);
    }, 3000);
    return () => {
      window.removeEventListener("friends-chat-updated", onChatUpdated);
      window.removeEventListener("friends-scheduled-changed", onChatUpdated);
      window.clearInterval(poll);
    };
  }, [id]);

  const peer = useMemo(() => (thread ? peerOf(thread) : undefined), [thread]);

  const callPeople: CallParticipant[] = useMemo(() => {
    if (!thread) return [];
    return thread.memberIds.map((mid) => {
      if (mid === getSessionUser().id) {
        return {
          id: getSessionUser().id,
          name: getSessionUser().name,
          avatar: getSessionUser().avatar,
          isSelf: true,
        };
      }
      const user = friends.find((f) => f.id === mid);
      return {
        id: mid,
        name: user?.name ?? t("call.participant"),
        avatar: user?.avatar ?? "??",
      };
    });
  }, [thread, t]);

  if (thread === undefined) {
    return (
      <div className="vk-card vk-main-pad">
        <h1 className="vk-page-title">
          <Link href="/messages">{t("messages.back")}</Link>
        </h1>
        <div className="vk-empty">{t("messages.opening")}</div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="vk-card vk-main-pad">
        <h1 className="vk-page-title">
          <Link href="/messages">{t("messages.back")}</Link>
        </h1>
        <div className="vk-empty">{t("messages.notFound")}</div>
      </div>
    );
  }

  return (
    <div className="vk-card vk-main-pad">
      <div className="messages-head">
        <h1 className="vk-page-title">
          <Link href="/messages">{t("messages.back")}</Link> ·{" "}
          {thread.type === "group" ? thread.title : peer?.name}
        </h1>
        <button type="button" className="vk-btn" onClick={() => setInCall(true)}>
          {thread.type === "group" ? t("messages.groupVideoCall") : t("messages.videoCall")}
        </button>
      </div>
      {thread.type === "group" ? (
        <div className="vk-status-box">
          {t("messages.members")}{" "}
          {thread.memberIds
            .map((mid) =>
              mid === getSessionUser().id
                ? getSessionUser().name
                : friends.find((f) => f.id === mid)?.name ?? mid,
            )
            .join(", ")}
        </div>
      ) : null}

      <VideoCall
        open={inCall}
        mode={thread.type}
        title={thread.type === "group" ? thread.title : peer?.name ?? t("messages.call")}
        participants={callPeople}
        onClose={() => setInCall(false)}
      />

      <div className="vk-list chat-thread">
        {thread.messages.map((msg) => {
          const mine = msg.authorId === getSessionUser().id;
          const author =
            msg.authorId === getSessionUser().id
              ? getSessionUser()
              : friends.find((f) => f.id === msg.authorId);
          return (
            <div
              key={msg.id}
              className={`vk-list-row${mine ? " message-out" : ""}`}
            >
              {!mine ? <div className="vk-avatar sm">{author?.avatar ?? "??"}</div> : null}
              <div style={mine ? { marginLeft: "auto", textAlign: "right" } : undefined}>
                {thread.type === "group" && !mine ? (
                  <div className="chat-author">{author?.name}</div>
                ) : null}
                <div>{msg.text}</div>
                <div style={{ color: "var(--vk-muted)", marginTop: 4, fontSize: 12 }}>
                  {msg.silent ? `🔕 ${msg.createdAt}` : msg.createdAt}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <MessageComposer
        threadId={thread.id}
        isDm={thread.type === "dm"}
        onSend={(text) => {
          sendChatMessage(thread.id, text);
          setThread(getChat(thread.id) ?? null);
        }}
        onSendSilent={(text) => {
          sendChatMessage(thread.id, text, { silent: true });
          setThread(getChat(thread.id) ?? null);
        }}
        onScheduled={() => setThread(getChat(thread.id) ?? null)}
      />
    </div>
  );
}
