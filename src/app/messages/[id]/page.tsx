"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  clearChatMessages,
  deleteChat,
  fetchChat,
  peerOf,
  sendChatMessage,
  type ChatThread,
} from "@/lib/chatStore";
import { MessageComposer } from "@/components/MessageComposer";
import { VideoCall, type CallParticipant } from "@/components/VideoCall";
import { useAuth } from "@/components/AuthProvider";
import { useT } from "@/lib/i18n/I18nProvider";
import { useLive } from "@/lib/live";

export default function MessageThreadPage() {
  const t = useT();
  const router = useRouter();
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [thread, setThread] = useState<ChatThread | null | undefined>(undefined);
  const [inCall, setInCall] = useState(false);

  const load = useCallback(async () => {
    const chat = await fetchChat(id);
    setThread(chat);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useLive(["message"], (event) => {
    if (event.read) return;
    if (event.chatId && event.chatId !== id) return;
    void load();
  });

  const peer = useMemo(() => (thread ? peerOf(thread) : undefined), [thread]);

  const callPeople: CallParticipant[] = useMemo(() => {
    if (!thread) return [];
    const members = thread.members ?? [];
    return thread.memberIds.map((mid) => {
      if (mid === user?.id) {
        return {
          id: mid,
          name: user?.name ?? t("call.self"),
          avatar: user?.avatar ?? "F",
          isSelf: true,
        };
      }
      const found = members.find((m) => m.id === mid);
      return {
        id: mid,
        name: found?.name ?? t("call.participant"),
        avatar: found?.avatar ?? "??",
      };
    });
  }, [thread, user?.id, user?.name, user?.avatar, t]);

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

  const memberName = (mid: string) => {
    if (mid === user?.id) return user?.name ?? t("call.self");
    return thread.members?.find((m) => m.id === mid)?.name ?? mid;
  };

  return (
    <div className="vk-card vk-main-pad">
      <div className="messages-head">
        <h1 className="vk-page-title">
          <Link href="/messages">{t("messages.back")}</Link> ·{" "}
          {thread.type === "group" ? thread.title : peer?.name}
        </h1>
        <div className="messages-head-actions">
          <button
            type="button"
            className="vk-btn ghost"
            onClick={async () => {
              if (!window.confirm(t("messages.clearConfirm"))) return;
              setThread(await clearChatMessages(thread.id));
            }}
          >
            {t("messages.clear")}
          </button>
          <button
            type="button"
            className="vk-btn danger"
            onClick={async () => {
              if (!window.confirm(t("messages.deleteConfirm"))) return;
              await deleteChat(thread.id);
              router.replace("/messages");
            }}
          >
            {t("messages.delete")}
          </button>
          <button type="button" className="vk-btn" onClick={() => setInCall(true)}>
            {thread.type === "group" ? t("messages.groupVideoCall") : t("messages.videoCall")}
          </button>
        </div>
      </div>
      {thread.type === "group" ? (
        <div className="vk-status-box">
          {t("messages.members")} {thread.memberIds.map(memberName).join(", ")}
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
          const mine = msg.authorId === user?.id;
          const author = thread.members?.find((m) => m.id === msg.authorId);
          return (
            <div key={msg.id} className={`vk-list-row${mine ? " message-out" : ""}`}>
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
        peerId={thread.peer?.id}
        onSend={async (text) => {
          const next = await sendChatMessage(thread.id, text);
          if (next) setThread(next);
        }}
        onSendSilent={async (text) => {
          const next = await sendChatMessage(thread.id, text, { silent: true });
          if (next) setThread(next);
        }}
        onScheduled={load}
      />
    </div>
  );
}
