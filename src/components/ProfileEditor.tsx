"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/I18nProvider";
import {
  clearProfileMedia,
  fileToDataUrl,
  loadProfileMedia,
  saveProfileMedia,
  type ProfileMedia,
} from "@/lib/profileMedia";
import {
  clearProfileBio,
  loadProfileBio,
  saveProfileBio,
  type ProfileBio,
} from "@/lib/profileStore";

type Props = {
  open: boolean;
  onClose: () => void;
  media: ProfileMedia;
  bio: ProfileBio;
  onSave: (next: { media: ProfileMedia; bio: ProfileBio }) => void;
};

export function ProfileEditor({ open, onClose, media, bio, onSave }: Props) {
  const t = useT();
  const [draftMedia, setDraftMedia] = useState(media);
  const [draftBio, setDraftBio] = useState(bio);
  const [busy, setBusy] = useState<"photo" | "cover" | null>(null);
  const [error, setError] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setDraftMedia(media);
      setDraftBio(bio);
      setError("");
      setBusy(null);
    }
  }, [open, media, bio]);

  if (!open) return null;

  async function onPick(kind: "photo" | "cover", file: File | undefined) {
    if (!file) return;
    setBusy(kind);
    setError("");
    try {
      const dataUrl = await fileToDataUrl(
        file,
        kind === "photo"
          ? { maxWidth: 720, maxHeight: 720, quality: 0.86 }
          : { maxWidth: 1600, maxHeight: 640, quality: 0.82 },
      );
      setDraftMedia((prev) => ({ ...prev, [kind]: dataUrl }));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("profile.uploadError"));
    } finally {
      setBusy(null);
    }
  }

  function save() {
    try {
      saveProfileMedia(draftMedia);
      saveProfileBio(draftBio);
      onSave({ media: draftMedia, bio: draftBio });
      onClose();
    } catch {
      setError(t("profile.saveError"));
    }
  }

  function resetDefaults() {
    clearProfileMedia();
    clearProfileBio();
    const nextMedia = loadProfileMedia();
    const nextBio = loadProfileBio();
    setDraftMedia(nextMedia);
    setDraftBio(nextBio);
    onSave({ media: nextMedia, bio: nextBio });
  }

  return (
    <div className="profile-editor-backdrop" role="presentation" onClick={onClose}>
      <div
        className="profile-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-editor-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="profile-editor-head">
          <h2 id="profile-editor-title">{t("profile.editPage")}</h2>
          <button
            type="button"
            className="profile-editor-close"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            ×
          </button>
        </div>

        <p className="profile-editor-hint">{t("profile.editHint")}</p>

        <div className="profile-editor-cover-wrap">
          <div
            className="profile-editor-cover"
            style={{ backgroundImage: `url(${draftMedia.cover})` }}
          />
          <button
            type="button"
            className="profile-editor-pick"
            disabled={busy === "cover"}
            onClick={() => coverRef.current?.click()}
          >
            {busy === "cover" ? t("common.loading") : t("profile.changeCover")}
          </button>
          <input
            ref={coverRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              void onPick("cover", e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>

        <div className="profile-editor-photo-row">
          <div
            className="profile-editor-photo"
            style={{ backgroundImage: `url(${draftMedia.photo})` }}
          />
          <div className="profile-editor-photo-actions">
            <button
              type="button"
              className="profile-editor-pick solid"
              disabled={busy === "photo"}
              onClick={() => photoRef.current?.click()}
            >
              {busy === "photo" ? t("common.loading") : t("profile.changeAvatar")}
            </button>
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                void onPick("photo", e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <p>{t("profile.photoHint")}</p>
          </div>
        </div>

        <div className="profile-editor-fields">
          <label>
            {t("profile.status")}
            <input
              value={draftBio.status}
              onChange={(e) => setDraftBio((b) => ({ ...b, status: e.target.value }))}
              maxLength={80}
            />
          </label>
          <label>
            {t("profile.about")}
            <textarea
              value={draftBio.about}
              onChange={(e) => setDraftBio((b) => ({ ...b, about: e.target.value }))}
              rows={3}
              maxLength={400}
            />
          </label>
          <div className="profile-editor-grid">
            <label>
              {t("profile.city")}
              <input
                value={draftBio.city}
                onChange={(e) => setDraftBio((b) => ({ ...b, city: e.target.value }))}
              />
            </label>
            <label>
              {t("profile.birthday")}
              <input
                value={draftBio.birthday}
                onChange={(e) => setDraftBio((b) => ({ ...b, birthday: e.target.value }))}
              />
            </label>
          </div>
          <label>
            {t("profile.relationship")}
            <input
              value={draftBio.relationship}
              onChange={(e) => setDraftBio((b) => ({ ...b, relationship: e.target.value }))}
            />
          </label>
        </div>

        {error ? <div className="profile-editor-error">{error}</div> : null}

        <div className="profile-editor-footer">
          <button type="button" className="profile-editor-reset" onClick={resetDefaults}>
            {t("profile.reset")}
          </button>
          <div className="profile-editor-footer-right">
            <button type="button" className="profile-editor-cancel" onClick={onClose}>
              {t("common.cancel")}
            </button>
            <button type="button" className="profile-editor-save" onClick={save} disabled={!!busy}>
              {t("common.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
