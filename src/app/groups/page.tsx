"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { currentUser } from "@/data/mock";
import {
  createGroup,
  joinGroup,
  leaveGroup,
  loadGroups,
  type Community,
} from "@/lib/groupsStore";
import { useT } from "@/lib/i18n/I18nProvider";

export default function GroupsPage() {
  const t = useT();
  const [groups, setGroups] = useState<Community[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "private">("public");

  useEffect(() => {
    setGroups(loadGroups());
  }, []);

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
            onClick={() => {
              const { groups: next } = createGroup({ name, desc, privacy });
              setGroups(next);
              setOpen(false);
              setName("");
              setDesc("");
            }}
          >
            {t("groups.createCommunity")}
          </button>
        </div>
      ) : null}

      <div className="vk-list">
        {groups.map((group) => {
          const joined = group.memberIds.includes(currentUser.id);
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
                  group.ownerId === currentUser.id ? (
                    <span>{t("groups.youAdmin")}</span>
                  ) : (
                    <button type="button" onClick={() => setGroups(leaveGroup(group.id))}>
                      {t("groups.leave")}
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    className="vk-btn"
                    onClick={() => setGroups(joinGroup(group.id))}
                  >
                    {t("groups.join")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
