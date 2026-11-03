"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchFriends,
  friendAction,
  relationOf,
  searchPeople,
  type FriendAction,
} from "@/lib/friendsStore";
import { ensureDm } from "@/lib/chatStore";
import { useAuth } from "@/components/AuthProvider";
import { useT } from "@/lib/i18n/I18nProvider";
import { useLive } from "@/lib/live";
import { SwipeFriendRow } from "@/components/SwipeFriendRow";
import type { FriendsState, Person } from "@/lib/dto";

type Tab = "all" | "requests" | "outgoing" | "search" | "recommended" | "following";

const EMPTY_STATE: FriendsState = {
  friendIds: [],
  incoming: [],
  outgoing: [],
  following: [],
};

function FriendsInner() {
  const t = useT();
  const router = useRouter();
  const { user } = useAuth();
  const params = useSearchParams();
  const tab = (params.get("tab") as Tab) || "all";
  const [state, setState] = useState<FriendsState>(EMPTY_STATE);
  const [people, setPeople] = useState<Person[]>([]);
  const [online, setOnline] = useState<string[]>([]);
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    const data = await fetchFriends();
    setState(data.state);
    setPeople(data.people);
    setOnline(data.online);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setQuery(params.get("q") ?? "");
  }, [params]);

  useLive(["friends", "presence"], () => void load());

  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  const friends = useMemo(
    () => state.friendIds.map((id) => byId.get(id)).filter(Boolean) as Person[],
    [state.friendIds, byId],
  );
  const incoming = useMemo(
    () => state.incoming.map((id) => byId.get(id)).filter(Boolean) as Person[],
    [state.incoming, byId],
  );
  const outgoing = useMemo(
    () => state.outgoing.map((id) => byId.get(id)).filter(Boolean) as Person[],
    [state.outgoing, byId],
  );
  const recommended = useMemo(
    () =>
      people.filter(
        (p) =>
          p.id !== user?.id &&
          !state.friendIds.includes(p.id) &&
          !state.incoming.includes(p.id) &&
          !state.outgoing.includes(p.id),
      ),
    [people, state, user?.id],
  );
  const searchResults = useMemo(
    () =>
      searchPeople(query, people)
        .filter((p) => p.id !== user?.id)
        .map((p) => ({ ...p, relation: relationOf(p.id, state) })),
    [query, people, state, user?.id],
  );

  function setTab(next: Tab) {
    const url = next === "all" ? "/friends" : `/friends?tab=${next}`;
    router.push(url);
  }

  async function act(personId: string, action: FriendAction) {
    setBusyId(personId);
    try {
      setState(await friendAction(personId, action));
    } finally {
      setBusyId("");
    }
  }

  async function openDm(userId: string) {
    const { thread } = await ensureDm(userId);
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
          <strong>{friends.filter((f) => online.includes(f.id)).length}</strong>
          {t("friends.countOnline")}
        </span>
        <span>
          <strong>{incoming.length}</strong>
          {t("friends.countRequests")}
        </span>
      </div>

      {tab === "all" ? (
        <div className="friends-list">
          {friends.map((friend) => (
            <SwipeFriendRow
              key={friend.id}
              deleteLabel={t("friends.remove")}
              onDelete={() => {
                if (!window.confirm(t("friends.removeConfirm"))) return;
                void act(friend.id, "remove");
              }}
            >
              <div className="vk-list-row friends-row">
                <button
                  type="button"
                  className="friends-avatar-btn"
                  aria-label={t("friends.write")}
                  onClick={() => void openDm(friend.id)}
                >
                  <div className="vk-avatar sm">{friend.avatar}</div>
                </button>
                <div className="friends-row-main">
                  <Link href={`/friends?tab=search&q=${encodeURIComponent(friend.name)}`}>
                    {friend.name}
                  </Link>
                  {online.includes(friend.id) ? (
                    <span className="vk-online-dot" title={t("common.online")} />
                  ) : null}
                  <div style={{ color: "var(--vk-muted)", marginTop: 2 }}>
                    {online.includes(friend.id) ? t("friends.onlineNow") : t("friends.wasRecently")}
                  </div>
                </div>
              </div>
            </SwipeFriendRow>
          ))}
          {!friends.length ? <div className="vk-empty">{t("common.empty")}</div> : null}
        </div>
      ) : null}

      {tab === "requests" ? (
        <div className="vk-list">
          {incoming.length ? (
            incoming.map((person) => (
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
                    disabled={busyId === person.id}
                    onClick={() => void act(person.id, "accept")}
                  >
                    {t("friends.accept")}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === person.id}
                    onClick={() => void act(person.id, "decline")}
                  >
                    {t("friends.decline")}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="vk-empty">{t("friends.noIncoming")}</div>
          )}
        </div>
      ) : null}

      {tab === "outgoing" ? (
        <div className="vk-list">
          {outgoing.length ? (
            outgoing.map((person) => (
              <div key={person.id} className="vk-list-row">
                <div className="vk-avatar sm">{person.avatar}</div>
                <div>
                  <strong>{person.name}</strong>
                  <div style={{ color: "var(--vk-muted)", marginTop: 2 }}>
                    {t("friends.requestSent")}
                  </div>
                </div>
                <div className="vk-list-meta friends-actions">
                  <button
                    type="button"
                    disabled={busyId === person.id}
                    onClick={() => void act(person.id, "cancel")}
                  >
                    {t("friends.cancel")}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="vk-empty">{t("common.empty")}</div>
          )}
        </div>
      ) : null}

      {tab === "recommended" || tab === "search" ? (
        <div className="vk-list">
          {(tab === "search" ? searchResults : recommended).map((person) => {
            const relation = "relation" in person ? person.relation : relationOf(person.id, state);
            return (
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
                  {relation === "friend" ? (
                    <span>{t("friends.inFriends")}</span>
                  ) : relation === "outgoing" ? (
                    <button
                      type="button"
                      disabled={busyId === person.id}
                      onClick={() => void act(person.id, "cancel")}
                    >
                      {t("friends.cancel")}
                    </button>
                  ) : relation === "incoming" ? (
                    <button
                      type="button"
                      className="vk-btn"
                      disabled={busyId === person.id}
                      onClick={() => void act(person.id, "accept")}
                    >
                      {t("friends.accept")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="vk-btn"
                      disabled={busyId === person.id}
                      onClick={() => void act(person.id, "request")}
                    >
                      {t("friends.add")}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busyId === person.id}
                    onClick={() => void act(person.id, "follow")}
                  >
                    {state.following.includes(person.id)
                      ? t("friends.unfollow")
                      : t("friends.follow")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {tab === "following" ? (
        <div className="vk-list">
          {state.following.length ? (
            state.following.map((id) => {
              const person = byId.get(id);
              return (
                <div key={id} className="vk-list-row">
                  <div className="vk-avatar sm">{person?.avatar ?? "??"}</div>
                  <div>
                    <strong>{person?.name ?? id}</strong>
                    <div style={{ color: "var(--vk-muted)", marginTop: 2 }}>
                      {t("friends.subscription")}
                    </div>
                  </div>
                  <div className="vk-list-meta friends-actions">
                    <button
                      type="button"
                      disabled={busyId === id}
                      onClick={() => void act(id, "follow")}
                    >
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
