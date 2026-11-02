"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n/I18nProvider";
import { NavIcon } from "./NavIcons";

const items = [
  { href: "/", icon: "profile", key: "nav.profile" },
  { href: "/feed", icon: "feed", key: "nav.feed" },
  { href: "/messages", icon: "messages", key: "nav.messages", badge: 1 },
  { href: "/friends", icon: "friends", key: "nav.friends" },
  { href: "/settings", icon: "settings", key: "nav.more" },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const t = useT();

  return (
    <nav className="mobile-bottom-nav" aria-label="Primary">
      {items.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? "is-active" : undefined}
            aria-current={active ? "page" : undefined}
          >
            <span className="mobile-bottom-icon">
              <NavIcon name={item.icon} />
              {"badge" in item && item.badge ? (
                <span className="vk-badge">{item.badge}</span>
              ) : null}
            </span>
            <span className="mobile-bottom-label">{t(item.key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
