"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { useT } from "@/lib/i18n/I18nProvider";
import { unreadCount } from "@/lib/notify";

export function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const t = useT();
  const avatar = user?.avatar ?? "F";
  const [q, setQ] = useState("");
  const [badge, setBadge] = useState(0);

  useEffect(() => {
    setBadge(unreadCount());
    const id = window.setInterval(() => setBadge(unreadCount()), 1500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <header className="vk-header">
      <div className="vk-header-inner">
        <Link href="/" className="vk-logo">
          <span className="vk-logo-mark">F</span>
          Friends
        </Link>

        <form
          className="vk-search-wrap"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/search?q=${encodeURIComponent(q.trim())}`);
          }}
        >
          <span className="vk-search-icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4 4" />
            </svg>
          </span>
          <input
            className="vk-search"
            type="search"
            placeholder={t("header.search")}
            aria-label={t("header.search")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </form>

        <nav className="vk-header-links">
          <LanguageSwitch compact />
          <Link
            href="/notifications"
            className="vk-header-icon"
            aria-label={t("header.notifications")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 16h12l-1.2-1.6V10a4.8 4.8 0 1 0-9.6 0v4.4L6 16Z" />
              <path d="M10 18a2 2 0 0 0 4 0" />
            </svg>
            {badge > 0 ? (
              <span className="vk-badge" style={{ position: "absolute", top: 4, right: 4 }}>
                {badge}
              </span>
            ) : null}
          </Link>
          <Link href="/audio" className="vk-header-icon" aria-label={t("header.music")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 18V7l10-2v11" />
              <circle cx="7" cy="18" r="2" />
              <circle cx="17" cy="16" r="2" />
            </svg>
          </Link>
          <button
            type="button"
            className="vk-header-icon"
            aria-label={t("header.logout")}
            title={t("header.logout")}
            onClick={logout}
          >
            <span className="vk-header-avatar">{avatar}</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
