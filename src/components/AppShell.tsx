"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import { LeftNav } from "@/components/LeftNav";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { OnlineBar } from "@/components/OnlineBar";
import { RightSidebar } from "@/components/RightSidebar";
import { ScheduledSendRunner } from "@/components/ScheduledSendRunner";
import { useAuth } from "@/components/AuthProvider";
import { LiveBridge } from "@/lib/live";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { ready, user } = useAuth();
  const isLogin = pathname === "/login" || pathname.startsWith("/login/");
  const isManage = pathname === "/manage" || pathname.startsWith("/manage/");

  // Login UI must render even before auth hydrates — otherwise LAN clients
  // stuck behind a blocked /_next payload never leave the boot screen.
  useEffect(() => {
    if (ready || isLogin) return;
    const timer = window.setTimeout(() => {
      window.location.replace("/login");
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [ready, isLogin]);

  if (isLogin) {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <div className="auth-boot">
        <div className="auth-boot-card">Friends</div>
        <a className="auth-boot-link" href="/login">
          Войти
        </a>
      </div>
    );
  }

  if (!user) {
    return <>{children}</>;
  }

  if (isManage) {
    return (
      <div className="vk-page admin-shell">
        <LiveBridge />
        <Header />
        <main className="admin-shell-main">{children}</main>
        <ScheduledSendRunner />
      </div>
    );
  }

  return (
    <div className="vk-page has-mobile-nav">
      <LiveBridge />
      <Header />
      <div className="vk-shell">
        <LeftNav />
        <main className="vk-main">{children}</main>
        <RightSidebar />
      </div>
      <OnlineBar />
      <MobileBottomNav />
      <ScheduledSendRunner />
    </div>
  );
}
