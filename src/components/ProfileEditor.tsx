"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/lib/i18n/I18nProvider";
import { ApiError } from "@/lib/api";
import { CoverAdjuster } from "@/components/CoverAdjuster";
import {
  compressProfileImage,
  defaultProfileMedia,
  prepareCoverSource,
  type ProfileMedia,
} from "@/lib/profileMedia";
import { emptyProfileBio, type ProfileBio } from "@/lib/profileStore";

declare global {
  interface Window {
    __FRIENDS_NATIVE__?: boolean;
    __FRIENDS_PHOTO_CALLBACK__?: (dataUrl: string, kind?: string, requestId?: string) => void;
    webkit?: {
      messageHandlers?: {
        friends?: { postMessage: (body: Record<string, unknown>) => void };
      };
    };
  }
}

function isNativeIOS() {
  return typeof window !== "undefined" && !!window.__FRIENDS_NATIVE__;
}

type Props = {
  open: boolean;
  onClose: () => void;
  media: ProfileMedia;
  bio: ProfileBio;
  onSave: (next: { media: ProfileMedia; bio: ProfileBio }) => Promise<void> | void;
};

export function ProfileEditor({ open, onClose, media, bio, onSave }: Props) {
  const t = useT();
  const [draftMedia, setDraftMedia] = useState(media);
  const [draftBio, setDraftBio] = useState(bio);
  const [busy, setBusy] = useState<"photo" | "cover" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  /** Full-frame source for cover scale/pan; kept while the editor is open. */
  const [coverSource, setCoverSource] = useState<string | null>(null);
  const [coverAdjustOpen, setCoverAdjustOpen] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const wasOpenRef = useRef(false);
  /** Locked slot for the in-flight native pick — never trust a mismatched echo. */
  const pendingKindRef = useRef<"photo" | "cover" | null>(null);
  const pendingRequestRef = useRef<string>("");
  const pickTimeoutRef = useRef<number | null>(null);

  // Sync drafts only when the editor opens — never mid-edit (live reloads used to
  // reset busy and let a second pick steal the first image into the wrong slot).
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setDraftMedia(media);
      setDraftBio(bio);
      setError("");
      setBusy(null);
      setCoverSource(null);
      setCoverAdjustOpen(false);
      pendingKindRef.current = null;
      pendingRequestRef.current = "";
      window.__FRIENDS_PHOTO_CALLBACK__ = undefined;
    }
    if (!open) {
      pendingKindRef.current = null;
      pendingRequestRef.current = "";
      window.__FRIENDS_PHOTO_CALLBACK__ = undefined;
      setCoverAdjustOpen(false);
      if (pickTimeoutRef.current != null) {
        window.clearTimeout(pickTimeoutRef.current);
        pickTimeoutRef.current = null;
      }
    }
    wasOpenRef.current = open;
  }, [open, media, bio]);

  if (!open) return null;

  // iOS Safari blocks programmatic .click() on file inputs inside overflow:auto containers.
  // Rendering them via portal (directly in body) works around this restriction.
  const fileInputs =
    typeof document !== "undefined"
      ? createPortal(
          <>
            <input
              ref={coverRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                void onPick("cover", e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                void onPick("photo", e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </>,
          document.body,
        )
      : null;

  function clearPickWait() {
    if (pickTimeoutRef.current != null) {
      window.clearTimeout(pickTimeoutRef.current);
      pickTimeoutRef.current = null;
    }
    pendingKindRef.current = null;
    pendingRequestRef.current = "";
    window.__FRIENDS_PHOTO_CALLBACK__ = undefined;
  }

  async function openCoverAdjuster(source: Blob | string) {
    const prepared = await prepareCoverSource(source);
    setCoverSource(prepared);
    setCoverAdjustOpen(true);
  }

  async function onPick(kind: "photo" | "cover", file: File | undefined) {
    if (!file || busy) return;
    setBusy(kind);
    setError("");
    try {
      if (kind === "cover") {
        await openCoverAdjuster(file);
        return;
      }
      const dataUrl = await compressProfileImage(file, kind);
      setDraftMedia((prev) => ({ ...prev, [kind]: dataUrl }));
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      setError(code === "file_too_large" ? t("profile.saveError") : t("profile.uploadError"));
    } finally {
      setBusy(null);
    }
  }

  function pickNative(kind: "photo" | "cover") {
    if (busy || pendingKindRef.current) return;
    const requestId = `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    pendingKindRef.current = kind;
    pendingRequestRef.current = requestId;
    setBusy(kind);
    setError("");

    pickTimeoutRef.current = window.setTimeout(() => {
      if (pendingRequestRef.current !== requestId) return;
      clearPickWait();
      setBusy(null);
      setError(t("profile.uploadError"));
    }, 45_000);

    window.__FRIENDS_PHOTO_CALLBACK__ = (
      dataUrl: string,
      returnedKind?: string,
      returnedRequestId?: string,
    ) => {
      // Drop stale / mismatched deliveries — never write into the other slot.
      if (pendingRequestRef.current !== requestId) return;
      if (returnedRequestId && returnedRequestId !== requestId) return;
      if (returnedKind && returnedKind !== kind) return;
      if (pendingKindRef.current !== kind) return;

      clearPickWait();
      if (!dataUrl) {
        setBusy(null);
        return;
      }

      if (kind === "cover") {
        void openCoverAdjuster(dataUrl)
          .catch((e) => {
            const code = e instanceof Error ? e.message : "";
            setError(code === "file_too_large" ? t("profile.saveError") : t("profile.uploadError"));
          })
          .finally(() => setBusy(null));
        return;
      }

      void compressProfileImage(dataUrl, kind)
        .then((resized) => {
          setDraftMedia((prev) => ({ ...prev, [kind]: resized }));
        })
        .catch((e) => {
          const code = e instanceof Error ? e.message : "";
          setError(code === "file_too_large" ? t("profile.saveError") : t("profile.uploadError"));
        })
        .finally(() => setBusy(null));
    };

    const handler = window.webkit?.messageHandlers?.friends;
    if (!handler) {
      clearPickWait();
      setBusy(null);
      setError(t("profile.uploadError"));
      (kind === "cover" ? coverRef : photoRef).current?.click();
      return;
    }
    handler.postMessage({ type: "pickPhoto", kind, requestId });
  }

  async function save() {
    if (busy || saving || pendingKindRef.current) return;
    setSaving(true);
    setError("");
    try {
      // Snapshot slots before any await so they cannot cross.
      const photoSrc = draftMedia.photo;
      const coverSrc = draftMedia.cover;
      const nextPhoto = photoSrc.startsWith("data:")
        ? await compressProfileImage(photoSrc, "photo")
        : photoSrc;
      const nextCover = coverSrc.startsWith("data:")
        ? await compressProfileImage(coverSrc, "cover")
        : coverSrc;
      const nextMedia: ProfileMedia = { photo: nextPhoto, cover: nextCover };
      setDraftMedia(nextMedia);
      await onSave({ media: nextMedia, bio: draftBio });
      onClose();
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === "file_too_large" || e.status === 413) setError(t("profile.saveError"));
        else if (
          e.code === "csrf_rejected" ||
          e.code === "unauthorized" ||
          e.status === 401 ||
          e.status === 403
        ) {
          setError(t("profile.saveAuth"));
        } else setError(t("profile.saveFailed"));
      } else {
        const code = e instanceof Error ? e.message : "";
        if (code === "file_too_large") setError(t("profile.saveError"));
        else if (code === "csrf_rejected" || code === "unauthorized") setError(t("profile.saveAuth"));
        else setError(t("profile.saveFailed"));
      }
    } finally {
      setSaving(false);
    }
  }

  function resetDefaults() {
    setDraftMedia(defaultProfileMedia);
    setDraftBio(emptyProfileBio);
  }

  return (
    <>
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

        <div className="profile-editor-body">
          <p className="profile-editor-hint">{t("profile.editHint")}</p>

          <div className="profile-editor-cover-wrap">
            <div
              className="profile-editor-cover"
              style={{ backgroundImage: `url(${draftMedia.cover})` }}
            />
            <div className="profile-editor-cover-actions">
              <button
                type="button"
                className="profile-editor-pick"
                disabled={busy !== null || saving}
                onClick={() => (isNativeIOS() ? pickNative("cover") : coverRef.current?.click())}
              >
                {busy === "cover" ? t("common.loading") : t("profile.changeCover")}
              </button>
              {coverSource ||
              (draftMedia.cover.startsWith("data:") &&
                draftMedia.cover !== defaultProfileMedia.cover) ? (
                <button
                  type="button"
                  className="profile-editor-pick"
                  disabled={busy !== null || saving}
                  onClick={() => {
                    const src = coverSource || draftMedia.cover;
                    void openCoverAdjuster(src).catch(() =>
                      setError(t("profile.uploadError")),
                    );
                  }}
                >
                  {t("profile.adjustCover")}
                </button>
              ) : null}
            </div>
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
                disabled={busy !== null || saving}
                onClick={() => (isNativeIOS() ? pickNative("photo") : photoRef.current?.click())}
              >
                {busy === "photo" ? t("common.loading") : t("profile.changeAvatar")}
              </button>
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
                rows={2}
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
        </div>

        <div className="profile-editor-footer">
          <button type="button" className="profile-editor-reset" onClick={resetDefaults}>
            {t("profile.reset")}
          </button>
          <div className="profile-editor-footer-right">
            <button type="button" className="profile-editor-cancel" onClick={onClose}>
              {t("common.cancel")}
            </button>
            <button
              type="button"
              className="profile-editor-save"
              onClick={() => void save()}
              disabled={!!busy || saving}
            >
              {t("common.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
    {fileInputs}
    {coverAdjustOpen && coverSource ? (
      <CoverAdjuster
        src={coverSource}
        onCancel={() => setCoverAdjustOpen(false)}
        onConfirm={(dataUrl) => {
          setDraftMedia((prev) => ({ ...prev, cover: dataUrl }));
          setCoverAdjustOpen(false);
        }}
      />
    ) : null}
    </>
  );
}
