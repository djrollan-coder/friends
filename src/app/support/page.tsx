"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

export default function SupportPage() {
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/support/chat",
      credentials: "same-origin",
    }),
  });
  const [input, setInput] = useState("");
  const busy = status !== "ready";

  return (
    <div className="vk-card vk-main-pad support-page">
      <div className="messages-head">
        <div>
          <h1 className="vk-page-title">Поддержка</h1>
          <p className="vk-muted" style={{ margin: "4px 0 0", fontSize: 12 }}>
            AI-агент кабинета Friends. Ответит по входу, Telegram, настройкам и эскалирует админам.
          </p>
        </div>
      </div>

      <div className="support-thread">
        {!messages.length ? (
          <div className="vk-empty">Спросите, например: «не приходит код на почту» или «как войти через Telegram».</div>
        ) : null}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`support-bubble ${message.role === "user" ? "is-me" : "is-bot"}`}
          >
            <b>{message.role === "user" ? "Вы" : "Поддержка"}</b>
            <div>
              {message.parts.map((part, index) =>
                part.type === "text" ? <span key={index}>{part.text}</span> : null,
              )}
            </div>
          </div>
        ))}
        {error ? <div className="admin-error">{error.message}</div> : null}
      </div>

      <form
        className="support-composer"
        onSubmit={(e) => {
          e.preventDefault();
          const text = input.trim();
          if (!text || busy) return;
          void sendMessage({ text });
          setInput("");
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Опишите проблему…"
          disabled={busy}
        />
        <button type="submit" className="vk-btn" disabled={busy || !input.trim()}>
          {busy ? "…" : "Отправить"}
        </button>
      </form>
    </div>
  );
}
