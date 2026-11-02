"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";
import type { Locale } from "@/lib/i18n/types";

export function LanguageSwitch({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, locales, labels, t } = useI18n();

  if (compact) {
    return (
      <label className="lang-switch-compact">
        <span className="sr-only">{t("header.language")}</span>
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
          aria-label={t("header.language")}
        >
          {locales.map((code) => (
            <option key={code} value={code}>
              {code.toUpperCase()}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div className="lang-switch" role="group" aria-label={t("header.language")}>
      {locales.map((code) => (
        <button
          key={code}
          type="button"
          className={locale === code ? "is-active" : undefined}
          onClick={() => setLocale(code)}
        >
          {labels[code]}
        </button>
      ))}
    </div>
  );
}
