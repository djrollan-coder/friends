"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProfileEditor } from "@/components/ProfileEditor";
import { SortableBlocks } from "@/components/SortableBlocks";
import { Wall } from "@/components/Wall";
import { currentUser, friends } from "@/data/mock";
import { useT } from "@/lib/i18n/I18nProvider";
import { loadProfileMedia, type ProfileMedia } from "@/lib/profileMedia";
import { loadProfileBio, type ProfileBio } from "@/lib/profileStore";
import { loadFriendsState } from "@/lib/friendsStore";
import { loadGroups } from "@/lib/groupsStore";

function ProfileBlock() {
  const t = useT();
  const [media, setMedia] = useState<ProfileMedia>(() => ({
    photo: currentUser.photo ?? "/profile/avatar.jpg",
    cover: currentUser.cover ?? "/profile/cover.jpg",
  }));
  const [bio, setBio] = useState<ProfileBio>(() => loadProfileBio());
  const [editing, setEditing] = useState(false);
  const [friendCount, setFriendCount] = useState(friends.length);
  const [groupCount, setGroupCount] = useState(7);

  useEffect(() => {
    setMedia(loadProfileMedia());
    setBio(loadProfileBio());
    setFriendCount(loadFriendsState().friendIds.length);
    setGroupCount(loadGroups().filter((g) => g.memberIds.includes(currentUser.id)).length);
  }, []);

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
              <div
                className="vk-avatar has-photo"
                style={{ backgroundImage: `url(${media.photo})` }}
                role="img"
                aria-label={currentUser.name}
              />
              <div className="vk-side-actions">
                <Link href="/messages">{t("profile.writeMessage")}</Link>
                <button type="button" onClick={() => setEditing(true)}>
                  {t("profile.editPage")}
                </button>
              </div>
            </aside>

            <div>
              <h1 className="vk-page-title">{currentUser.name}</h1>
              <div className="vk-status-box">{bio.status}</div>
              {bio.about ? <p className="profile-about">{bio.about}</p> : null}

              <div className="vk-counts">
                <Link href="/friends">
                  <strong>{friendCount}</strong>
                  {t("profile.friendsCount")}
                </Link>
                <Link href="/photos">
                  <strong>24</strong>
                  {t("profile.photosCount")}
                </Link>
                <Link href="/groups">
                  <strong>{groupCount}</strong>
                  {t("profile.groupsCount")}
                </Link>
                <Link href="/videos">
                  <strong>3</strong>
                  {t("profile.videosCount")}
                </Link>
              </div>

              <table className="vk-info-table">
                <tbody>
                  <tr>
                    <td>{t("profile.birthday")}:</td>
                    <td>
                      <a href="#">{bio.birthday}</a>
                    </td>
                  </tr>
                  <tr>
                    <td>{t("profile.city")}:</td>
                    <td>
                      <a href="#">{bio.city}</a>
                    </td>
                  </tr>
                  <tr>
                    <td>{t("profile.relationship")}:</td>
                    <td>
                      <a href="#">{bio.relationship}</a>
                    </td>
                  </tr>
                </tbody>
              </table>
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
