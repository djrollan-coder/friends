"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  contentAlbum,
  contentDateLabel,
  contentHotNews,
  contentInterest,
  contentNewsSource,
  contentPhotoTitle,
  contentShortcut,
  contentVideoDescription,
  contentVideoTitle,
} from "./contentMaps";
import { dictionaries } from "./dictionaries";
import { LOCALES, LOCALE_LABELS, type Locale } from "./types";

const STORAGE_KEY = "friends.locale";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  tc: {
    album: (id: string, fallback: string) => string;
    photo: (title: string) => string;
    video: (title: string) => string;
    videoDesc: (description: string) => string;
    date: (label: string) => string;
    interest: (tag: string) => string;
    news: (id: string, fallback: string) => string;
    newsSource: (source: string) => string;
    shortcut: (label: string) => string;
  };
  locales: Locale[];
  labels: typeof LOCALE_LABELS;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function detectLocale(): Locale {
  if (typeof window === "undefined") return "ru";
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && LOCALES.includes(saved)) return saved;
  } catch {
    /* ignore */
  }
  const nav = (navigator.language || "ru").slice(0, 2).toLowerCase();
  if (
    nav === "en" ||
    nav === "es" ||
    nav === "de" ||
    nav === "fr" ||
    nav === "ru" ||
    nav === "uk"
  ) {
    return nav;
  }
  return "ru";
}

function format(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] !== undefined ? String(vars[key]) : `{${key}}`,
  );
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ru");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const next = detectLocale();
    setLocaleState(next);
    document.documentElement.lang = next;
    setReady(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.documentElement.lang = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dict = dictionaries[locale] ?? dictionaries.ru;
      const value = dict[key] ?? dictionaries.ru[key] ?? key;
      return format(value, vars);
    },
    [locale],
  );

  const tc = useMemo(
    () => ({
      album: (id: string, fallback: string) => contentAlbum(locale, id, fallback),
      photo: (title: string) => contentPhotoTitle(locale, title),
      video: (title: string) => contentVideoTitle(locale, title),
      videoDesc: (description: string) =>
        contentVideoDescription(locale, description),
      date: (label: string) => contentDateLabel(locale, label),
      interest: (tag: string) => contentInterest(locale, tag),
      news: (id: string, fallback: string) => contentHotNews(locale, id, fallback),
      newsSource: (source: string) => contentNewsSource(locale, source),
      shortcut: (label: string) => contentShortcut(locale, label),
    }),
    [locale],
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      tc,
      locales: LOCALES,
      labels: LOCALE_LABELS,
    }),
    [locale, setLocale, t, tc],
  );

  if (!ready) {
    return (
      <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
    );
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function useT() {
  return useI18n().t;
}
