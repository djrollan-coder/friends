"use client";

import { useEffect, useMemo, useState } from "react";
import { GoogleDrivePanel } from "@/components/GoogleDrivePanel";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { interestOptions } from "@/data/interests";
import { contentInterest } from "@/lib/i18n/contentMaps";
import { useI18n, useT } from "@/lib/i18n/I18nProvider";
import { useInterests } from "@/lib/useInterests";
import { api } from "@/lib/api";
import type { CirclePrivacy } from "@/lib/circleStore";

type InviteItem = {
  code: string;
  note: string;
  usesLeft: number;
  createdAt: number;
};

type Tab = "circle" | "privacy" | "interests" | "invites" | "language" | "drive";

function privacyOptionLabel(
  t: (key: string) => string,
  value: CirclePrivacy["wall"] | CirclePrivacy["messages"] | CirclePrivacy["calls"],
) {
  if (value === "only_me") return t("settings.onlyMe");
  if (value === "close") return t("settings.close");
  if (value === "nobody") return t("settings.nobody");
  return t("settings.friends");
}

export default function SettingsPage() {
  const t = useT();
  const { tc, locale } = useI18n();
  const { selected, toggle } = useInterests();
  const [tab, setTab] = useState<Tab>("circle");
  const [query, setQuery] = useState("");
  const [privacy, setPrivacy] = useState<CirclePrivacy>({
    wall: "friends",
    messages: "friends",
    calls: "close",
    searchable: false,
    showOnline: true,
  });
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api<{ privacy: CirclePrivacy; invites: InviteItem[] }>("/api/settings");
        if (cancelled) return;
        setPrivacy(data.privacy);
        setInvites(data.invites);
      } catch {
        /* keep defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...interestOptions];
    return interestOptions.filter((tag) => {
      const label = contentInterest(locale, tag).toLowerCase();
      return tag.toLowerCase().includes(q) || label.includes(q);
    });
  }, [query, locale]);

  function updatePrivacy<K extends keyof CirclePrivacy>(key: K, value: CirclePrivacy[K]) {
    const next = { ...privacy, [key]: value };
    setPrivacy(next);
    void api("/api/settings", {
      method: "PATCH",
      body: JSON.stringify({ [key]: value }),
    }).catch(() => undefined);
  }

  return (
    <div className="vk-main-pad settings-page">
      <h1 className="vk-page-title">{t("settings.title")}</h1>
      <p className="settings-lead">{t("settings.lead")}</p>

      <div className="settings-layout">
        <div className="vk-side-actions settings-nav">
          {(
            [
              ["circle", "settings.circle"],
              ["privacy", "settings.privacy"],
              ["invites", "settings.invites"],
              ["interests", "settings.interests"],
              ["drive", "drive.title"],
              ["language", "settings.language"],
            ] as const
          ).map(([id, key]) => (
            <button
              key={id}
              type="button"
              className={tab === id ? "is-active" : undefined}
              onClick={() => setTab(id)}
            >
              {t(key)}
            </button>
          ))}
        </div>

        {tab === "drive" ? <GoogleDrivePanel /> : null}

        {tab === "language" ? (
          <section className="vk-card settings-panel">
            <h2 className="settings-panel-title">{t("settings.language")}</h2>
            <p className="settings-panel-desc">{t("settings.languageDesc")}</p>
            <LanguageSwitch />
            <div className="device-hint">
              <span>{t("device.phone")}</span>
              <span>{t("device.tablet")}</span>
              <span>{t("device.desktop")}</span>
            </div>
          </section>
        ) : null}

        {tab === "circle" ? (
          <section className="vk-card settings-panel">
            <h2 className="settings-panel-title">{t("settings.circleTitle")}</h2>
            <p className="settings-panel-desc">{t("settings.circleDesc")}</p>
            <div className="circle-points">
              <div>
                <strong>{t("settings.inviteBy")}</strong>
                <span>{t("settings.inviteByDesc")}</span>
              </div>
              <div>
                <strong>{t("settings.privacyDefault")}</strong>
                <span>{t("settings.privacyDefaultDesc")}</span>
              </div>
              <div>
                <strong>{t("settings.liveChat")}</strong>
                <span>{t("settings.liveChatDesc")}</span>
              </div>
            </div>
          </section>
        ) : null}

        {tab === "privacy" ? (
          <section className="vk-card settings-panel">
            <div className="settings-panel-head">
              <div>
                <h2 className="settings-panel-title">{t("settings.privacy")}</h2>
                <p className="settings-panel-desc">{t("settings.privacyDesc")}</p>
              </div>
            </div>

            <div className="privacy-rows">
              <label>
                <span>{t("settings.wall")}</span>
                <select
                  value={privacy.wall}
                  onChange={(e) =>
                    updatePrivacy("wall", e.target.value as CirclePrivacy["wall"])
                  }
                >
                  <option value="friends">{t("settings.friends")}</option>
                  <option value="close">{t("settings.close")}</option>
                  <option value="only_me">{t("settings.onlyMe")}</option>
                </select>
              </label>
              <label>
                <span>{t("settings.messages")}</span>
                <select
                  value={privacy.messages}
                  onChange={(e) =>
                    updatePrivacy("messages", e.target.value as CirclePrivacy["messages"])
                  }
                >
                  <option value="friends">{t("settings.friends")}</option>
                  <option value="close">{t("settings.close")}</option>
                  <option value="nobody">{t("settings.nobody")}</option>
                </select>
              </label>
              <label>
                <span>{t("settings.calls")}</span>
                <select
                  value={privacy.calls}
                  onChange={(e) =>
                    updatePrivacy("calls", e.target.value as CirclePrivacy["calls"])
                  }
                >
                  <option value="friends">{t("settings.friends")}</option>
                  <option value="close">{t("settings.close")}</option>
                </select>
              </label>
            </div>

            <div className="privacy-toggles">
              <button
                type="button"
                className={`interest-chip${privacy.searchable ? " is-on" : ""}`}
                onClick={() => updatePrivacy("searchable", !privacy.searchable)}
              >
                {privacy.searchable ? t("settings.searchableOn") : t("settings.searchableOff")}
              </button>
              <button
                type="button"
                className={`interest-chip${privacy.showOnline ? " is-on" : ""}`}
                onClick={() => updatePrivacy("showOnline", !privacy.showOnline)}
              >
                {privacy.showOnline ? t("settings.onlineOn") : t("settings.onlineOff")}
              </button>
            </div>

            <div className="vk-status-box" style={{ marginTop: 14 }}>
              {t("settings.privacyNow", {
                wall: privacyOptionLabel(t, privacy.wall),
                messages: privacyOptionLabel(t, privacy.messages),
                calls: privacyOptionLabel(t, privacy.calls),
              })}
            </div>
          </section>
        ) : null}

        {tab === "invites" ? (
          <section className="vk-card settings-panel">
            <div className="settings-panel-head">
              <div>
                <h2 className="settings-panel-title">{t("settings.invites")}</h2>
                <p className="settings-panel-desc">{t("settings.invitesDesc")}</p>
              </div>
              <button
                type="button"
                className="vk-btn"
                onClick={async () => {
                  try {
                    const data = await api<{ invites: InviteItem[] }>("/api/invites", {
                      method: "POST",
                    });
                    setInvites(data.invites);
                  } catch {
                    /* ignore */
                  }
                }}
              >
                {t("settings.newCode")}
              </button>
            </div>

            <div className="vk-list">
              {invites.map((invite) => (
                <div key={invite.code} className="vk-list-row">
                  <div>
                    <strong className="invite-code">{invite.code}</strong>
                    <div style={{ color: "var(--vk-muted)", marginTop: 2 }}>
                      {invite.note} · {t("settings.usesLeft", { n: invite.usesLeft })}
                    </div>
                  </div>
                  <div className="vk-list-meta friends-actions">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(invite.code);
                          setCopied(invite.code);
                          window.setTimeout(() => setCopied(""), 1200);
                        } catch {
                          /* ignore */
                        }
                      }}
                    >
                      {copied === invite.code ? t("settings.copied") : t("settings.copy")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {tab === "interests" ? (
          <section className="vk-card settings-panel">
            <div className="settings-panel-head">
              <div>
                <h2 className="settings-panel-title">{t("settings.topicsTitle")}</h2>
                <p className="settings-panel-desc">{t("settings.topicsDesc")}</p>
              </div>
              <div className="settings-selected-count">
                {t("settings.selectedCount", { n: selected.length })}
              </div>
            </div>

            <label className="settings-search">
              <span className="settings-search-icon" aria-hidden>
                ⌕
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("right.searchTopics")}
                aria-label={t("right.searchTopics")}
              />
            </label>

            {selected.length ? (
              <div className="settings-selected">
                <div className="settings-section-label">{t("settings.selected")}</div>
                <div className="interest-chips">
                  {selected.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className="interest-chip is-on"
                      onClick={() => toggle(tag)}
                      aria-pressed
                    >
                      {tc.interest(tag)} ×
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="settings-section-label">
              {query.trim()
                ? t("settings.results", { n: filtered.length })
                : t("settings.allTopicsCount", { n: interestOptions.length })}
            </div>

            {filtered.length ? (
              <div className="interest-chips is-edit settings-theme-grid">
                {filtered.map((tag) => {
                  const on = selected.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      className={`interest-chip${on ? " is-on" : ""}`}
                      onClick={() => toggle(tag)}
                      aria-pressed={on}
                    >
                      {tc.interest(tag)}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="settings-empty">{t("settings.noneFound", { q: query.trim() })}</div>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
