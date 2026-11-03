"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ProfileEditor } from "@/components/ProfileEditor";
import { SortableBlocks } from "@/components/SortableBlocks";
import { Wall } from "@/components/Wall";
import { useAuth } from "@/components/AuthProvider";
import { useT } from "@/lib/i18n/I18nProvider";
import { uploadDataUrl } from "@/lib/api";
import { useLive } from "@/lib/live";
import {
  defaultProfileMedia,
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

async function persistMediaValue(value: string, fallback: string) {
  if (!value || value === fallback) return null;
  if (value.startsWith("data:")) {
    const uploaded = await uploadDataUrl(value, "profile");
    return uploaded.url;
  }
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

  useLive(["presence"], load);

  const displayName = profile?.name ?? user?.name ?? "";
  const photo = profile?.photo || user?.photoUrl || media.photo;
  const hasPhoto = Boolean(photo && photo !== defaultProfileMedia.photo);
  const counts = profile?.counts;

  return (
    <>
      <div className="vk-card vk-profile-card">
        <div
          className="vk-profile-cover"
          style={{ backgroundImage: `url(${media.cover})` }}
          role="img"
          aria-label={t("profile.cover")}
        />

        <div className="vk-main-pad vk-profile-body">
          <div className="vk-profile-layout">
            <aside>
              {hasPhoto ? (
                <div
                  className="vk-avatar has-photo"
                  style={{ backgroundImage: `url(${photo})` }}
                  role="img"
                  aria-label={displayName}
                />
              ) : (
                <div className="vk-avatar" role="img" aria-label={displayName}>
                  {profile?.avatar ?? user?.avatar ?? "F"}
                </div>
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
          const photo = await persistMediaValue(
            nextMedia.photo,
            defaultProfileMedia.photo,
          );
          const cover = await persistMediaValue(
            nextMedia.cover,
            defaultProfileMedia.cover,
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
          setProfile(updated);
          setBio(bioFromProfile(updated));
          setMedia({
            photo: updated.photo || defaultProfileMedia.photo,
            cover: updated.cover || defaultProfileMedia.cover,
          });
          void refresh();
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
