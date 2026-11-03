"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  acceptFriend,
  cancelOutgoing,
  declineFriend,
  getPerson,
  loadFriendsState,
  recommendations,
  removeFriend,
  searchPeople,
  sendFriendRequest,
  toggleFollow,
  type FriendsState,
} from "@/lib/friendsStore";
import { ensureDm } from "@/lib/chatStore";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/I18nProvider";
import { SwipeFriendRow } from "@/components/SwipeFriendRow";

type Tab = "all" | "requests" | "outgoing" | "search" | "recommended" | "following";

function FriendsInner() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const tab = (params.get("tab") as Tab) || "all";
  const [state, setState] = useState<FriendsState>(() => loadFriendsState());
  const [query, setQuery] = useState(params.get("q") ?? "");

  useEffect(() => {
    setState(loadFriendsState());
  }, []);

  const friends = useMemo(
    () => state.friendIds.map((id) => getPerson(id)).filter(Boolean),
    [state.friendIds],
  );
  const incoming = useMemo(
    () => state.incoming.map((id) => getPerson(id)).filter(Boolean),
    [state.incoming],
  );
  const outgoing = useMemo(
    () => state.outgoing.map((id) => getPerson(id)).filter(Boolean),
    [state.outgoing],
  );
  const recommended = useMemo(() => recommendations(state), [state]);
  const searchResults = useMemo(() => searchPeople(query, state), [query, state]);

  function setTab(next: Tab) {
    const url = next === "all" ? "/friends" : `/friends?tab=${next}`;
    router.push(url);
  }

  function openDm(userId: string) {
    const { thread } = ensureDm(userId);
    router.push(`/messages/${thread.id}`);
  }

  return (
    <div className="vk-card vk-main-pad friends-page">
      <h1 className="vk-page-title">{t("friends.title")}</h1>

      <div className="friends-tabs">
        {(
          [
            ["all", `${t("friends.tabAll")} · ${friends.length}`],
            ["requests", `${t("friends.tabRequests")} · ${incoming.length}`],
            ["outgoing", `${t("friends.tabOutgoing")} · ${outgoing.length}`],
            ["recommended", t("friends.tabRecommended")],
            ["following", `${t("friends.tabFollowing")} · ${state.following.length}`],
            ["search", t("friends.tabSearch")],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "is-active" : undefined}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "search" || tab === "recommended" ? (
        <label className="settings-search" style={{ marginTop: 4 }}>
          <span className="settings-search-icon" aria-hidden>
            ⌕
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("friends.searchPlaceholder")}
            aria-label={t("friends.searchPlaceholder")}
          />
        </label>
      ) : null}

      <div className="vk-counts" style={{ marginTop: 8 }}>
        <span>
          <strong>{friends.length}</strong>
          {t("friends.countFriends")}
        </span>
        <span>
          <strong>{friends.filter((f) => f?.online).length}</strong>
          {t("friends.countOnline")}
        </span>
        <span>
          <strong>{incoming.length}</strong>
          {t("friends.countRequests")}
        </span>
      </div>

      {tab === "all" ? (
        <div className="friends-list">
          {friends.map((friend) =>
            friend ? (
              <SwipeFriendRow
                key={friend.id}
                deleteLabel={t("friends.remove")}
                onDelete={() => {
                  if (!window.confirm(t("friends.removeConfirm"))) return;
                  setState(removeFriend(state, friend.id));
                }}
              >
                <div className="vk-list-row friends-row">
                  <button
                    type="button"
                    className="friends-avatar-btn"
                    aria-label={t("friends.write")}
                    onClick={() => openDm(friend.id)}
                  >
                    <div className="vk-avatar sm">{friend.avatar}</div>
                  </button>
                  <div className="friends-row-main">
                    <Link href="/">{friend.name}</Link>
                    {friend.online ? (
                      <span className="vk-online-dot" title={t("common.online")} />
                    ) : null}
                    <div style={{ color: "var(--vk-muted)", marginTop: 2 }}>
                      {friend.online ? t("friends.onlineNow") : t("friends.wasRecently")}
                    </div>
                  </div>
                </div>
              </SwipeFriendRow>
            ) : null,
          )}
        </div>
      ) : null}

      {tab === "requests" ? (
        <div className="vk-list">
          {incoming.length ? (
            incoming.map((person) =>
              person ? (
                <div key={person.id} className="vk-list-row">
                  <div className="vk-avatar sm">{person.avatar}</div>
                  <div>
                    <strong>{person.name}</strong>
                    <div style={{ color: "var(--vk-muted)", marginTop: 2 }}>
                      {t("friends.wantsAdd")}
                    </div>
                  </div>
                  <div className="vk-list-meta friends-actions">
                    <button
                      type="button"
                      className="vk-btn"
                      onClick={() => setState(acceptFriend(state, person.id))}
                    >
                      {t("friends.accept")}
                    </button>
                    <button type="button" onClick={() => setState(declineFriend(state, person.id))}>
                      {t("friends.decline")}
                    </button>
                  </div>
                </div>
              ) : null,
            )
          ) : (
            <div className="vk-empty">{t("friends.noIncoming")}</div>
          )}
        </div>
      ) : null}

      {tab === "outgoing" ? (
        <div className="vk-list">
          {outgoing.length ? (
            outgoing.map((person) =>
              person ? (
                <div key={person.id} className="vk-list-row">
                  <div className="vk-avatar sm">{person.avatar}</div>
                  <div>
                    <strong>{person.name}</strong>
                    <div style={{ color: "var(--vk-muted)", marginTop: 2 }}>
                      {t("friends.requestSent")}
                    </div>
                  </div>
                  <div className="vk-list-meta friends-actions">
                    <button type="button" onClick={() => setState(cancelOutgoing(state, person.id))}>
                      {t("friends.cancel")}
                    </button>
                  </div>
                </div>
              ) : null,
            )
          ) : (
            <div className="vk-empty">{t("common.empty")}</div>
          )}
        </div>
      ) : null}

      {tab === "recommended" || tab === "search" ? (
        <div className="vk-list">
          {(tab === "search" ? searchResults : recommended).map((person) => (
            <div key={person.id} className="vk-list-row">
              <div className="vk-avatar sm">{person.avatar}</div>
              <div>
                <strong>{person.name}</strong>
                <div style={{ color: "var(--vk-muted)", marginTop: 2 }}>
                  {person.city}
                  {person.bio ? ` · ${person.bio}` : ""}
                </div>
              </div>
              <div className="vk-list-meta friends-actions">
                {"relation" in person && person.relation === "friend" ? (
                  <span>{t("friends.inFriends")}</span>
                ) : "relation" in person && person.relation === "outgoing" ? (
                  <button type="button" onClick={() => setState(cancelOutgoing(state, person.id))}>
                    {t("friends.cancel")}
                  </button>
                ) : "relation" in person && person.relation === "incoming" ? (
                  <button
                    type="button"
                    className="vk-btn"
                    onClick={() => setState(acceptFriend(state, person.id))}
                  >
                    {t("friends.accept")}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="vk-btn"
                    onClick={() => setState(sendFriendRequest(state, person.id))}
                  >
                    {t("friends.add")}
                  </button>
                )}
                <button type="button" onClick={() => setState(toggleFollow(state, person.id))}>
                  {state.following.includes(person.id) ? t("friends.unfollow") : t("friends.follow")}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "following" ? (
        <div className="vk-list">
          {state.following.length ? (
            state.following.map((id) => {
              const person = getPerson(id);
              return (
                <div key={id} className="vk-list-row">
                  <div className="vk-avatar sm">{person?.avatar ?? "??"}</div>
                  <div>
                    <strong>{person?.name ?? id}</strong>
                    <div style={{ color: "var(--vk-muted)", marginTop: 2 }}>{t("friends.subscription")}</div>
                  </div>
                  <div className="vk-list-meta friends-actions">
                    <button type="button" onClick={() => setState(toggleFollow(state, id))}>
                      {t("friends.unfollow")}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="vk-empty">{t("friends.noFollowing")}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function FriendsPage() {
  const t = useT();
  return (
    <Suspense fallback={<div className="vk-card vk-main-pad">{t("common.loading")}</div>}>
      <FriendsInner />
    </Suspense>
  );
}
