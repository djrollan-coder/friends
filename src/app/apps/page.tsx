"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/I18nProvider";

const APPS = [
  { href: "/feed", title: "Новости", description: "Лента друзей и сообществ" },
  { href: "/messages", title: "Мессенджер", description: "Личные и групповые чаты" },
  { href: "/friends", title: "Друзья", description: "Заявки, подписки и поиск людей" },
  { href: "/groups", title: "Сообщества", description: "Создавайте группы по интересам" },
  { href: "/photos", title: "Фото", description: "Альбомы и загрузка фотографий" },
  { href: "/videos", title: "Видео", description: "Свои ролики и ссылки" },
  { href: "/audio", title: "Музыка", description: "Плеер и локальная медиатека" },
  { href: "/bookmarks", title: "Закладки", description: "Сохранённые публикации" },
  { href: "/docs", title: "Файлы", description: "Хранилище документов" },
  { href: "/settings", title: "Настройки", description: "Приватность, интересы, приглашения" },
];

export default function AppsPage() {
  const t = useT();
  return (
    <div className="vk-main-pad">
      <h1 className="vk-page-title">{t("stub.appsTitle")}</h1>
      <p className="settings-lead">Все сервисы Friends в одном месте.</p>
      <div className="apps-grid">
        {APPS.map((app) => (
          <Link key={app.href} href={app.href} className="vk-card apps-card">
            <div className="apps-card-mark">{app.title.slice(0, 1)}</div>
            <div>
              <strong>{app.title}</strong>
              <div style={{ color: "var(--vk-muted)", marginTop: 4 }}>{app.description}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
