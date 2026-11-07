# Friends — приватная соцсеть

Next.js 16 + React 19 приложение: лента, профиль, друзья, сообщества, мессенджер,
фото, видео, музыка, файлы, сторис и уведомления. Данные хранятся на сервере в
SQLite, поэтому один аккаунт работает на всех устройствах, а сообщения и
уведомления приходят в реальном времени (SSE).

## Запуск

```bash
npm install
npm run dev      # http://localhost:3000
# или
npm run build && npm run start
```

Требуется Node.js 24+ (встроенный драйвер `node:sqlite`).

При первом запуске автоматически создаются:

- база `data/friends.db` (SQLite, встроенный драйвер `node:sqlite`);
- демо-пользователи, посты, сообщества и тестовое содержимое;
- папка `data/uploads` для загруженных файлов (фото, видео, аудио, документы).

`data/` не коммитится в git. Каталог можно переопределить переменной
`FRIENDS_DATA_DIR` (например, на смонтированный диск). Если рабочий каталог
доступен только для чтения, приложение само переключается на системный temp —
в этом случае данные не переживают перезапуск.

> **Vercel/serverless:** файловая система инстанса эфемерна. SQLite в `/tmp`
> не разделяется между инстансами: аккаунты, посты и сессии теряются. Для
> постоянного хранения нужна внешняя БД (Postgres/Neon) и объектное хранилище
> для файлов (Vercel Blob/S3), либо VPS/Docker с постоянным томом.

## Аккаунты

- Вход по email: код + magic link из письма (Resend). Код хранится как HMAC, TTL 10 мин,
  лимит попыток и rate-limit по email/IP. Пароль остаётся запасным способом.
- Пароли (если заданы) хешируются scrypt, сессия — httpOnly-cookie (подписанный portable token).
- Вход через Telegram (Login Widget и бот, если заданы env-переменные).
- Вход по QR: телефон подтверждает сессию, десктоп получает cookie.
- Новому аккаунту автоматически подставляются демо-друзья и контент, чтобы
  интерфейс не был пустым. Других реальных пользователей можно найти в поиске.

## Админка

`/manage` доступна пользователям с правами администратора:

- **Обзор** — реальные метрики, график за 7 дней, последние события.
- **Пользователи** — поиск, блокировка, выдача/снятие прав, удаление.
- **Контент** — публикации, очередь премодерации, одобрение и удаление.
- **Сообщество** — список групп и удаление.
- **Безопасность** — жалобы пользователей, закрытие и удаление объекта.
- **Настройки** — регистрация, премодерация, комментарии (применяются сразу).
- **Агенты** — AI-новости (Friends News) и техподдержка `/support`, тикеты эскалации.
- **Скачать отчёт** — CSV с метриками и пользователями.

Первый зарегистрированный пользователь автоматически становится админом.
Дополнительно админов можно задать через `FRIENDS_ADMIN_EMAILS`.

Локальный seed-админ (только с `FRIENDS_SEED_DEFAULT_ADMIN=1`, не на Vercel):
`admin@friends.local` + `FRIENDS_SEED_ADMIN_PASSWORD` (или дефолт из `.env.example` комментариев).

В production админы — через `FRIENDS_ADMIN_EMAILS` и первого зарегистрированного пользователя.

## Переменные окружения

См. `.env.example`:

```bash
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=           # optional Telegram webhook secret token
NEXT_PUBLIC_GOOGLE_CLIENT_ID=      # Google Drive backup (optional)
NEXT_PUBLIC_SITE_URL=              # public origin (CSRF + Telegram deep links)
FRIENDS_DATA_DIR=                  # optional persistent data directory
FRIENDS_ADMIN_EMAILS=              # comma-separated admin emails
RESEND_API_KEY=                    # Resend for email login codes
RESEND_FROM_EMAIL=Friends <onboarding@resend.dev>
FRIENDS_SESSION_SECRET=            # required on Vercel/production
AI_GATEWAY_API_KEY=                # Vercel AI Gateway (OIDC on Vercel also works)
FRIENDS_AI_MODEL=openai/gpt-4o-mini
CRON_SECRET=                       # Bearer for /api/cron/news
```

## Основные API

| Группа | Маршруты |
| --- | --- |
| Auth | `/api/auth/{register,login,logout,me,email}`, `/api/auth/telegram/*`, `/api/auth/qr/*` |
| Лента | `GET/POST /api/feed`, `POST/DELETE /api/posts/[id]`, `GET /api/bookmarks` |
| Люди | `/api/friends`, `/api/friends/[id]`, `/api/people`, `/api/users/[id]`, `/api/profile`, `/api/search` |
| Сообщества | `/api/groups`, `/api/groups/[id]` |
| Чаты | `/api/chats`, `/api/chats/[id]`, `/api/chats/[id]/messages` |
| Уведомления | `/api/notifications`, `/api/notifications/[id]` |
| Медиа | `/api/photos`, `/api/albums`, `/api/videos`, `/api/documents`, `/api/stories`, `/api/upload`, `/api/media/[name]` |
| Разное | `/api/listings`, `/api/settings`, `/api/invites`, `/api/events` (SSE), `/api/reports` |
| Админка | `/api/admin/{overview,users,posts,groups,reports,settings,report.csv}` |

## Проверка

```bash
npx tsc --noEmit
npm run lint
npm run build
```
