"use client";

import { friends } from "@/data/mock";
import { getSessionUser } from "@/lib/sessionUser";
import { useT } from "@/lib/i18n/I18nProvider";

type Props = {
  compact?: boolean;
};

export function Stories({ compact = false }: Props) {
  const t = useT();
  const stories = [
    { id: "me", name: t("stories.yours"), avatar: getSessionUser().avatar, create: true },
    ...friends.slice(0, 7).map((f) => ({
      id: f.id,
      name: f.name.split(" ")[0],
      avatar: f.avatar,
      create: false,
    })),
  ];

  return (
    <div
      className={`vk-stories${compact ? " is-compact" : ""}`}
      aria-label={t("stories.title")}
    >
      {stories.map((story) =>
        story.create ? (
          <button key={story.id} type="button" className="vk-story create">
            <span className="vk-story-plus" aria-hidden>
              +
            </span>
            {t("stories.create")}
          </button>
        ) : (
          <button key={story.id} type="button" className="vk-story">
            <span className="vk-story-avatar" aria-hidden>
              {story.avatar}
            </span>
            {story.name}
          </button>
        ),
      )}
    </div>
  );
}
