"use client";

import { useRef, useState } from "react";
import { useT } from "@/lib/i18n/I18nProvider";
import { uploadFile } from "@/lib/api";

type Props = {
  title?: string;
  placeholder?: string;
  onSubmit: (payload: { text: string; image?: string; video?: string }) => void | Promise<void>;
};

export function Composer({ title, placeholder, onSubmit }: Props) {
  const t = useT();
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | undefined>();
  const [video, setVideo] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const resolvedTitle = title ?? t("composer.newPost");
  const resolvedPlaceholder = placeholder ?? t("composer.placeholder");

  async function onImage(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const uploaded = await uploadFile(file);
      setImage(uploaded.url);
      setVideo(undefined);
    } catch {
      setError(t("profile.uploadError"));
    } finally {
      setBusy(false);
    }
  }

  async function onVideo(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const uploaded = await uploadFile(file);
      setVideo(uploaded.url);
      setImage(undefined);
    } catch {
      setError(t("profile.uploadError"));
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    if (!text.trim() && !image && !video) return;
    void onSubmit({ text, image, video });
    setText("");
    setImage(undefined);
    setVideo(undefined);
  }

  return (
    <div className="vk-composer">
      <div className="vk-composer-title">{resolvedTitle}</div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={resolvedPlaceholder}
        rows={3}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
      />
      {image ? (
        <div className="vk-composer-preview" style={{ backgroundImage: `url(${image})` }} />
      ) : null}
      {video ? <video className="vk-post-video" src={video} controls /> : null}
      {error ? <div className="profile-editor-error">{error}</div> : null}
      <div className="vk-composer-actions">
        <div className="vk-composer-tools">
          <button type="button" onClick={() => imageRef.current?.click()} disabled={busy}>
            {busy ? t("common.loading") : t("composer.photo")}
          </button>
          <button type="button" onClick={() => videoRef.current?.click()} disabled={busy}>
            {t("composer.video")}
          </button>
          <input
            ref={imageRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              void onImage(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <input
            ref={videoRef}
            type="file"
            accept="video/*"
            hidden
            onChange={(e) => {
              void onVideo(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
        <button
          type="button"
          className="vk-btn"
          disabled={busy || (!text.trim() && !image && !video)}
          onClick={submit}
        >
          {t("post.send")}
        </button>
      </div>
    </div>
  );
}
