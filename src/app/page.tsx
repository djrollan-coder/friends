"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProfileEditor } from "@/components/ProfileEditor";
import { SortableBlocks } from "@/components/SortableBlocks";
import { Wall } from "@/components/Wall";
import { useAuth } from "@/components/AuthProvider";
import { friends } from "@/data/mock";
import { useT } from "@/lib/i18n/I18nProvider";
import {
  defaultProfileMedia,
  loadProfileMedia,
  type ProfileMedia,
} from "@/lib/profileMedia";
import { loadProfileBio, type ProfileBio } from "@/lib/profileStore";
import { loadFriendsState } from "@/lib/friendsStore";
import { loadGroups } from "@/lib/groupsStore";
import { getSessionUser } from "@/lib/sessionUser";

function ProfileBlock() {
  const t = useT();
  const { user } = useAuth();
  const me = getSessionUser();
  const displayName = user?.name ?? me.name;
  const [media, setMedia] = useState<ProfileMedia>(() => defaultProfileMedia());
  const [bio, setBio] = useState<ProfileBio>(() => loadProfileBio());
  const [editing, setEditing] = useState(false);
  const [friendCount, setFriendCount] = useState(friends.length);
  const [groupCount, setGroupCount] = useState(0);

  useEffect(() => {
    const session = getSessionUser();
    setMedia(loadProfileMedia(session.id));
    setBio(loadProfileBio(session.id));
    setFriendCount(loadFriendsState().friendIds.length);
    setGroupCount(loadGroups().filter((g) => g.memberIds.includes(session.id)).length);
  }, [user?.id]);

  const photo = user?.photoUrl || media.photo;
  const hasPhoto = Boolean(photo && photo !== "/profile/avatar.jpg");

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
                  {user?.avatar ?? me.avatar}
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
              {user?.username ? (
                <div className="vk-status-box">@{user.username}</div>
              ) : bio.status ? (
                <div className="vk-status-box">{bio.status}</div>
              ) : null}
              {bio.about ? <p className="profile-about">{bio.about}</p> : null}

              <div className="vk-counts">
                <Link href="/friends">
                  <strong>{friendCount}</strong>
                  {t("profile.friendsCount")}
                </Link>
                <Link href="/photos">
                  <strong>0</strong>
                  {t("profile.photosCount")}
                </Link>
                <Link href="/groups">
                  <strong>{groupCount}</strong>
                  {t("profile.groupsCount")}
                </Link>
                <Link href="/videos">
                  <strong>0</strong>
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
                          <a href="#">{bio.birthday}</a>
                        </td>
                      </tr>
                    ) : null}
                    {bio.city ? (
                      <tr>
                        <td>{t("profile.city")}:</td>
                        <td>
                          <a href="#">{bio.city}</a>
                        </td>
                      </tr>
                    ) : null}
                    {bio.relationship ? (
                      <tr>
                        <td>{t("profile.relationship")}:</td>
                        <td>
                          <a href="#">{bio.relationship}</a>
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
        onSave={({ media: nextMedia, bio: nextBio }) => {
          setMedia(nextMedia);
          setBio(nextBio);
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
