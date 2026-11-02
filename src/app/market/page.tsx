"use client";

import { useT } from "@/lib/i18n/I18nProvider";

export default function MarketPage() {
  const t = useT();
  return (
    <div className="vk-main-pad">
      <h1 className="vk-page-title">{t("stub.marketTitle")}</h1>
      <div className="vk-empty">{t("stub.marketEmpty")}</div>
    </div>
  );
}
