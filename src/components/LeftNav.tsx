"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { extraNav, navItems, shortcutLinks } from "@/data/mock";
import { useI18n, useT } from "@/lib/i18n/I18nProvider";
import { useUnreadBadges } from "@/lib/useBadges";
import { useAuth } from "@/components/AuthProvider";
import { NavIcon } from "./NavIcons";

const STORAGE_KEY = "friends.nav.collapsed";
const EXPANDED_W = 200;
const COLLAPSED_W = 56;

const navKey: Record<string, string> = {
  "/": "nav.profile",
  "/feed": "nav.feed",
  "/messages": "nav.messages",
  "/friends": "nav.friends",
  "/groups": "nav.groups",
  "/photos": "nav.photos",
  "/audio": "nav.audio",
  "/videos": "nav.videos",
  "/bookmarks": "nav.bookmarks",
  "/apps": "nav.apps",
  "/docs": "nav.docs",
  "/support": "nav.support",
  "/settings": "nav.settings",
};

export function LeftNav() {
  const pathname = usePathname();
  const t = useT();
  const { tc } = useI18n();
  const [collapsed, setCollapsed] = useState(false);
  const badges = useUnreadBadges();
  const { user } = useAuth();

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--vk-left",
      `${collapsed ? COLLAPSED_W : EXPANDED_W}px`,
    );
    return () => {
      document.documentElement.style.setProperty("--vk-left", `${EXPANDED_W}px`);
    };
  }, [collapsed]);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function labelFor(href: string, fallback: string) {
    const key = navKey[href];
    return key ? t(key) : fallback;
  }

  return (
    <aside
      className={`vk-left${collapsed ? " is-collapsed" : ""}`}
      data-collapsed={collapsed ? "1" : "0"}
      style={{ width: collapsed ? COLLAPSED_W : EXPANDED_W }}
    >
      <button
        type="button"
        className="vk-nav-toggle"
        onClick={toggle}
        title={collapsed ? t("nav.expand") : t("nav.collapse")}
        aria-label={collapsed ? t("nav.expand") : t("nav.collapse")}
        aria-expanded={!collapsed}
      >
        <span aria-hidden>{collapsed ? "›" : "‹"}</span>
      </button>

      <nav className="vk-nav">
        {navItems.map((item) => {
          const label = labelFor(item.href, item.label);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? "active" : undefined}
              title={label}
            >
              <span className="vk-nav-icon">
                <NavIcon name={item.icon} />
              </span>
              {!collapsed ? <span className="vk-nav-label">{label}</span> : null}
              {item.href === "/messages" && badges.messages ? (
                <span className="vk-badge">{badges.messages}</span>
              ) : null}
            </Link>
          );
        })}
        <div className="vk-nav-sep" />
        {extraNav.map((item) => {
          const label = labelFor(item.href, item.label);
          return (
            <Link key={item.href} href={item.href} title={label}>
              <span className="vk-nav-icon">
                <NavIcon name={item.icon} />
              </span>
              {!collapsed ? <span className="vk-nav-label">{label}</span> : null}
            </Link>
          );
        })}
        {user?.isAdmin ? (
          <Link href="/manage" title="Управление" className={pathname.startsWith("/manage") ? "active" : undefined}>
            <span className="vk-nav-icon">
              <NavIcon name="settings" />
            </span>
            {!collapsed ? <span className="vk-nav-label">Управление</span> : null}
          </Link>
        ) : null}
      </nav>

      {!collapsed ? (
        <div className="vk-nav-extra">
          <div className="vk-nav-sep" />
          <div className="vk-shortcuts">
            {shortcutLinks.map((label) => (
              <a key={label} href="#">
                {tc.shortcut(label)}
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
