"use client";

import { useT } from "@/lib/i18n/I18nProvider";

export default function AppsPage() {
  const t = useT();
  return (
    <div className="vk-main-pad">
      <h1 className="vk-page-title">{t("stub.appsTitle")}</h1>
      <div className="vk-status-box">{t("stub.appsBody")}</div>
    </div>
  );
}
