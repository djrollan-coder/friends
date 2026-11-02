"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { useT } from "@/lib/i18n/I18nProvider";

type Props = {
  onSubmit: (text: string) => void;
};

export function WallComposer({ onSubmit }: Props) {
  const t = useT();
  const [text, setText] = useState("");

  function send() {
    const value = text.trim();
    if (!value) return;
    onSubmit(value);
    setText("");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    send();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <form className="vk-composer" onSubmit={handleSubmit}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t("composer.shiftHint")}
        aria-label={t("composer.newPost")}
      />
      <div className="vk-composer-actions">
        <span className="composer-hint">Shift+Enter</span>
        <button className="vk-btn" type="submit" disabled={!text.trim()}>
          {t("post.send")}
        </button>
      </div>
    </form>
  );
}
