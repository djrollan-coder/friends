"use client";

import { useRef, useState } from "react";
import { useT } from "@/lib/i18n/I18nProvider";
import { fileToDataUrl } from "@/lib/profileMedia";

type Props = {
  title?: string;
  placeholder?: string;
  onSubmit: (payload: { text: string; image?: string; video?: string }) => void;
};

export function Composer({ title, placeholder, onSubmit }: Props) {
  const t = useT();
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | undefined>();
  const [video, setVideo] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const resolvedTitle = title ?? t("composer.newPost");
  const resolvedPlaceholder = placeholder ?? t("composer.placeholder");

  async function onImage(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      setImage(await fileToDataUrl(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.82 }));
      setVideo(undefined);
    } finally {
      setBusy(false);
    }
  }

  async function onVideo(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const reader = new FileReader();
      const data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("read failed"));
        reader.readAsDataURL(file);
      });
      setVideo(data);
      setImage(undefined);
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    if (!text.trim() && !image && !video) return;
    onSubmit({ text, image, video });
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
      <div className="vk-composer-actions">
        <div className="vk-composer-tools">
          <button type="button" onClick={() => imageRef.current?.click()} disabled={busy}>
            {t("composer.photo")}
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
