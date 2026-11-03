"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  createGroup,
  fetchGroups,
  groupAction,
  type Community,
} from "@/lib/groupsStore";
import { useT } from "@/lib/i18n/I18nProvider";
import { useLive } from "@/lib/live";

export default function GroupsPage() {
  const t = useT();
  const { user } = useAuth();
  const [groups, setGroups] = useState<Community[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "private">("public");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setGroups(await fetchGroups());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useLive(["group"], () => void load());

  async function act(id: string, action: "join" | "leave") {
    setBusy(true);
    try {
      setGroups(await groupAction(id, action));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="vk-main-pad">
      <div className="messages-head">
        <h1 className="vk-page-title">{t("groups.title")}</h1>
        <button type="button" className="vk-btn" onClick={() => setOpen((v) => !v)}>
          {open ? t("common.close") : t("groups.create")}
        </button>
      </div>

      {open ? (
        <div className="vk-card group-create" style={{ marginBottom: 14 }}>
          <label>
            {t("groups.name")}
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            {t("groups.description")}
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
          </label>
          <div className="friends-tabs" style={{ marginTop: 8 }}>
            <button
              type="button"
              className={privacy === "public" ? "is-active" : undefined}
              onClick={() => setPrivacy("public")}
            >
              {t("groups.open")}
            </button>
            <button
              type="button"
              className={privacy === "private" ? "is-active" : undefined}
              onClick={() => setPrivacy("private")}
            >
              {t("groups.closed")}
            </button>
          </div>
          <button
            type="button"
            className="vk-btn"
            style={{ marginTop: 12 }}
            disabled={busy || !name.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                setGroups(await createGroup({ name, desc, privacy }));
                setOpen(false);
                setName("");
                setDesc("");
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("groups.createCommunity")}
          </button>
        </div>
      ) : null}

      <div className="vk-list">
        {groups.map((group) => {
          const joined = Boolean(user?.id && group.memberIds.includes(user.id));
          return (
            <div key={group.id} className="vk-list-row">
              <div className="vk-avatar sm">{group.cover}</div>
              <div>
                <Link href={`/groups/${group.id}`}>{group.name}</Link>
                <div style={{ color: "var(--vk-muted)", marginTop: 2 }}>
                  {group.desc} ·{" "}
                  {group.privacy === "private" ? t("groups.closed") : t("groups.open")}
                </div>
              </div>
              <div className="vk-list-meta friends-actions">
                <span>{t("groups.members", { n: group.memberIds.length })}</span>
                {joined ? (
                  group.ownerId === user?.id ? (
                    <span>{t("groups.youAdmin")}</span>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void act(group.id, "leave")}
                    >
                      {t("groups.leave")}
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    className="vk-btn"
                    disabled={busy}
                    onClick={() => void act(group.id, "join")}
                  >
                    {t("groups.join")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {!groups.length ? <div className="vk-empty">{t("common.empty")}</div> : null}
      </div>
    </div>
  );
}
