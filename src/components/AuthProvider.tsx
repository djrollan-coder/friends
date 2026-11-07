"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AuthUser } from "@/lib/auth";
import { setSessionAuthUser } from "@/lib/sessionUser";

type AuthContextValue = {
  user: AuthUser | null;
  ready: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
  refresh: () => Promise<AuthUser | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const userRef = useRef<AuthUser | null>(null);

  const applyUser = useCallback((next: AuthUser | null) => {
    userRef.current = next;
    setSessionAuthUser(next);
    setUser(next);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" });
      if (response.status === 401) {
        applyUser(null);
        return null;
      }
      if (!response.ok) return userRef.current;
      const data = (await response.json()) as { user: AuthUser | null };
      const next = data.user ?? null;
      applyUser(next);
      return next;
    } catch {
      // Keep current session on transient network errors — don't kick to /login.
      return userRef.current;
    }
  }, [applyUser]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "same-origin",
          cache: "no-store",
        });
        const data = (await response.json()) as { user: AuthUser | null };
        if (!cancelled) applyUser(data.user ?? null);
      } catch {
        if (!cancelled) applyUser(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyUser]);

  useEffect(() => {
    if (!ready) return;
    const isAuthPage = pathname === "/login" || pathname.startsWith("/login/");
    if (!user && !isAuthPage) {
      router.replace("/login");
    } else if (user && isAuthPage) {
      router.replace("/");
    }
  }, [ready, user, pathname, router]);

  const login = useCallback(
    (next: AuthUser) => {
      applyUser(next);
    },
    [applyUser],
  );

  const logout = useCallback(() => {
    void fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
    applyUser(null);
    router.replace("/login");
  }, [applyUser, router]);

  const value = useMemo(
    () => ({ user, ready, login, logout, refresh }),
    [user, ready, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
