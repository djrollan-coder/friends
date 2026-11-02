export type Locale = "ru" | "uk" | "en" | "es" | "de" | "fr";

export const LOCALES: Locale[] = ["ru", "uk", "en", "es", "de", "fr"];

export const LOCALE_LABELS: Record<Locale, string> = {
  ru: "Русский",
  uk: "Українська",
  en: "English",
  es: "Español",
  de: "Deutsch",
  fr: "Français",
};

export type Dict = Record<string, string>;
