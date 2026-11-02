"use client";

import { Suspense } from "react";
import { MusicPlayer } from "@/components/MusicPlayer";
import { useT } from "@/lib/i18n/I18nProvider";

function AudioLoading() {
  const t = useT();
  return (
    <div className="vk-main-pad">
      <div className="vk-status-box">{t("audio.loading")}</div>
    </div>
  );
}

export default function AudioPage() {
  return (
    <Suspense fallback={<AudioLoading />}>
      <MusicPlayer />
    </Suspense>
  );
}
