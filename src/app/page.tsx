"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ProfileEditor } from "@/components/ProfileEditor";
import { SortableBlocks } from "@/components/SortableBlocks";
import { Wall } from "@/components/Wall";
import { useAuth } from "@/components/AuthProvider";
import { useT } from "@/lib/i18n/I18nProvider";
import { ApiError } from "@/lib/api";
import { useLive } from "@/lib/live";
import {
  compressProfileImage,
  defaultProfileMedia,
  type CompressKind,
  type ProfileMedia,
} from "@/lib/profileMedia";
import {
  bioFromProfile,
  emptyProfileBio,
  fetchProfile,
  saveProfile,
  type ProfileBio,
  type ProfileDTO,
} from "@/lib/profileStore";

/**
 * Persist profile media. On Vercel the upload filesystem is ephemeral, so we
 * store a compressed JPEG data URL directly in the user row.
 */
async function persistMediaValue(
  value: string,
  fallback: string,
  kind: CompressKind,
): Promise<string | undefined> {
  if (!value || value === fallback) return undefined;
  if (value.startsWith("data:")) {
    return compressProfileImage(value, kind);
  }
  // Legacy /api/media/... URLs from older uploads — keep if present.
  return value;
}

function ProfileBlock() {
  const t = useT();
  const { user, refresh } = useAuth();
  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [media, setMedia] = useState<ProfileMedia>(defaultProfileMedia);
  const [bio, setBio] = useState<ProfileBio>(emptyProfileBio);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    const next = await fetchProfile();
    if (!next) return;
    setProfile(next);
    setBio(bioFromProfile(next));
    setMedia({
      photo: next.photo || defaultProfileMedia.photo,
      cover: next.cover || defaultProfileMedia.cover,
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load, user?.id]);

  // Don't reload media while the editor is open — a live presence ping used to
  // overwrite in-progress avatar/cover picks and make slots appear to swap.
  useLive(["presence"], () => {
    if (!editing) void load();
  });

  const displayName = profile?.name ?? user?.name ?? "";
  // Always render from media state so avatar/cover never swap after save.
  const avatarUrl = media.photo;
  const coverUrl = media.cover;
  const hasPhoto = Boolean(avatarUrl && avatarUrl !== defaultProfileMedia.photo);
  const counts = profile?.counts;

  return (
    <>
      <div className="vk-card vk-profile-card">
        <div
          className="vk-profile-cover"
          style={{ backgroundImage: `url(${coverUrl})` }}
          role="img"
          aria-label={t("profile.cover")}
        />

        <div className="vk-main-pad vk-profile-body">
          <div className="vk-profile-layout">
            <aside>
              {hasPhoto ? (
                <Link
                  href="/"
                  className="vk-avatar has-photo"
                  style={{ backgroundImage: `url(${avatarUrl})` }}
                  role="img"
                  aria-label={displayName}
                />
              ) : (
                <Link href="/" className="vk-avatar" aria-label={displayName}>
                  {profile?.avatar ?? user?.avatar ?? "F"}
                </Link>
              )}
              <div className="vk-side-actions">
                <Link href="/messages">{t("profile.writeMessage")}</Link>
                <button type="button" onClick={() => setEditing(true)}>
                  {t("profile.editPage")}
                </button>
              </div>
            </aside>

            <div>
              <h1 className="vk-page-title">{displayName}</h1>
              {profile?.username ? (
                <div className="vk-status-box">@{profile.username}</div>
              ) : bio.status ? (
                <div className="vk-status-box">{bio.status}</div>
              ) : null}
              {bio.about ? <p className="profile-about">{bio.about}</p> : null}

              <div className="vk-counts">
                <Link href="/friends">
                  <strong>{counts?.friends ?? 0}</strong>
                  {t("profile.friendsCount")}
                </Link>
                <Link href="/photos">
                  <strong>{counts?.photos ?? 0}</strong>
                  {t("profile.photosCount")}
                </Link>
                <Link href="/groups">
                  <strong>{counts?.groups ?? 0}</strong>
                  {t("profile.groupsCount")}
                </Link>
                <Link href="/videos">
                  <strong>{counts?.videos ?? 0}</strong>
                  {t("profile.videosCount")}
                </Link>
              </div>

              {(bio.birthday || bio.city || bio.relationship) && (
                <table className="vk-info-table">
                  <tbody>
                    {bio.birthday ? (
                      <tr>
                        <td>{t("profile.birthday")}:</td>
                        <td>
                          <span>{bio.birthday}</span>
                        </td>
                      </tr>
                    ) : null}
                    {bio.city ? (
                      <tr>
                        <td>{t("profile.city")}:</td>
                        <td>
                          <span>{bio.city}</span>
                        </td>
                      </tr>
                    ) : null}
                    {bio.relationship ? (
                      <tr>
                        <td>{t("profile.relationship")}:</td>
                        <td>
                          <span>{bio.relationship}</span>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      <ProfileEditor
        open={editing}
        media={media}
        bio={bio}
        onClose={() => setEditing(false)}
        onSave={async ({ media: nextMedia, bio: nextBio }) => {
          try {
            const photo = await persistMediaValue(
              nextMedia.photo,
              defaultProfileMedia.photo,
              "photo",
            );
            const cover = await persistMediaValue(
              nextMedia.cover,
              defaultProfileMedia.cover,
              "cover",
            );
            const updated = await saveProfile({
              status: nextBio.status,
              about: nextBio.about,
              city: nextBio.city,
              birthday: nextBio.birthday,
              relationship: nextBio.relationship,
              photo,
              cover,
            });
            // Prefer the exact slots we just wrote — never re-map from a partial DTO.
            const savedPhoto =
              photo ?? updated.photo ?? nextMedia.photo ?? defaultProfileMedia.photo;
            const savedCover =
              cover ?? updated.cover ?? nextMedia.cover ?? defaultProfileMedia.cover;
            setProfile(updated);
            setBio(bioFromProfile(updated));
            setMedia({ photo: savedPhoto, cover: savedCover });
            void refresh();
          } catch (error) {
            if (error instanceof ApiError && error.code === "file_too_large") {
              throw new Error("file_too_large");
            }
            throw error;
          }
        }}
      />
    </>
  );
}

export default function MyPage() {
  return (
    <SortableBlocks
      storageKey="friends.blocks.home"
      className="sortable-stack"
      items={[
        { id: "profile", node: <ProfileBlock /> },
        { id: "wall", node: <Wall /> },
      ]}
    />
  );
}
