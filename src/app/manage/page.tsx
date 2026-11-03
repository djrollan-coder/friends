"use client";

import { useState } from "react";

const sections = ["Обзор", "Пользователи", "Сообщество", "Контент", "Безопасность", "Настройки"];
const activity = [
  { icon: "👤", title: "Новый пользователь", detail: "Мария К. присоединилась к сети", time: "2 мин назад", tone: "violet" },
  { icon: "▤", title: "Публикация опубликована", detail: "Алексей поделился новой записью", time: "18 мин назад", tone: "orange" },
  { icon: "⚑", title: "Жалоба на контент", detail: "Запись в сообществе «Город» · #2481", time: "36 мин назад", tone: "red" },
  { icon: "✓", title: "Проверка завершена", detail: "Профиль пользователя подтверждён", time: "1 ч назад", tone: "green" },
];

export default function ManagePage() {
  const [section, setSection] = useState("Обзор");
  const [query, setQuery] = useState("");
  const [enabled, setEnabled] = useState({ registration: true, moderation: true, comments: false });
  const [notice, setNotice] = useState("");

  function action(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }

  return (
    <div className="admin-page">
      <div className="admin-heading">
        <div><div className="admin-eyebrow"><span className="admin-live" /> ЦЕНТР УПРАВЛЕНИЯ</div><h1>Управление</h1><p>Всё, что происходит в вашей социальной сети.</p></div>
        <button className="admin-primary" onClick={() => action("Отчёт подготовлен")}>↓ <span>Скачать отчёт</span></button>
      </div>

      <div className="admin-tabs" role="tablist">{sections.map((item, i) => <button key={item} role="tab" aria-selected={section === item} className={section === item ? "selected" : ""} onClick={() => setSection(item)}>{item}{i === 1 && <span className="admin-tab-count">2</span>}</button>)}</div>

      {section === "Обзор" ? <>
        <section className="admin-metrics">
          <article className="admin-metric"><div className="admin-metric-top"><span>Пользователи</span><span className="admin-metric-icon lilac">♙</span></div><strong>12 486</strong><div className="admin-trend"><b>↗ 12,8%</b><span>за последние 30 дней</span></div><div className="admin-spark spark-a"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
          <article className="admin-metric"><div className="admin-metric-top"><span>Активны сегодня</span><span className="admin-metric-icon mint">◉</span></div><strong>3 204</strong><div className="admin-trend"><b>↗ 8,2%</b><span>к прошлой неделе</span></div><div className="admin-spark spark-b"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
          <article className="admin-metric"><div className="admin-metric-top"><span>Публикации</span><span className="admin-metric-icon amber">▤</span></div><strong>8 931</strong><div className="admin-trend"><b>↗ 4,6%</b><span>за последние 30 дней</span></div><div className="admin-spark spark-c"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
          <article className="admin-metric"><div className="admin-metric-top"><span>Ожидают проверки</span><span className="admin-metric-icon rose">⚑</span></div><strong>07</strong><div className="admin-trend admin-warn"><b>Требуют внимания</b><span>жалобы и запросы</span></div><div className="admin-spark spark-d"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
        </section>

        <section className="admin-grid">
          <article className="admin-card admin-chart-card"><div className="admin-card-head"><div><h2>Рост аудитории</h2><p>Новые пользователи за неделю</p></div><select aria-label="Период"><option>Эта неделя</option><option>Этот месяц</option><option>Этот год</option></select></div><div className="admin-chart"><div className="admin-y-labels"><span>400</span><span>300</span><span>200</span><span>100</span><span>0</span></div><div className="admin-plot"><div className="admin-gridlines"><i/><i/><i/><i/><i/></div><svg viewBox="0 0 680 190" preserveAspectRatio="none" aria-label="График роста аудитории"><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#c4784a" stopOpacity=".28"/><stop offset="1" stopColor="#c4784a" stopOpacity="0"/></linearGradient></defs><path d="M0 156 C35 145 50 151 82 128 S130 138 164 113 S210 120 246 92 S290 105 330 78 S378 94 412 62 S454 77 494 52 S540 65 575 34 S630 40 680 12 V190 H0Z" fill="url(#area)"/><path d="M0 156 C35 145 50 151 82 128 S130 138 164 113 S210 120 246 92 S290 105 330 78 S378 94 412 62 S454 77 494 52 S540 65 575 34 S630 40 680 12" fill="none" stroke="#d58b5c" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinecap="round"/></svg><div className="admin-x-labels"><span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span></div></div></div><div className="admin-chart-legend"><span><i/> Новые регистрации</span><span>Итого за неделю <b>1 284</b></span></div></article>
          <article className="admin-card admin-activity-card"><div className="admin-card-head"><div><h2>Последние события</h2><p>Что происходит прямо сейчас</p></div><button className="admin-text-btn" onClick={() => setSection("Пользователи")}>Все события <span>→</span></button></div><div className="admin-activity-list">{activity.map((item) => <div className="admin-activity" key={item.title}><span className={`admin-event-icon ${item.tone}`}>{item.icon}</span><div className="admin-event-copy"><b>{item.title}</b><span>{item.detail}</span></div><time>{item.time}</time></div>)}</div></article>
        </section>

        <section className="admin-bottom-grid"><article className="admin-card admin-quick"><div className="admin-card-head"><div><h2>Быстрые действия</h2><p>Часто используемые инструменты</p></div></div><div className="admin-actions"><button onClick={() => setSection("Пользователи")}><span className="admin-action-icon lilac">♙</span><span><b>Пользователи</b><small>Поиск и управление аккаунтами</small></span><em>→</em></button><button onClick={() => setSection("Безопасность")}><span className="admin-action-icon rose">⚑</span><span><b>Модерация</b><small>7 обращений ждут ответа</small></span><em>→</em></button><button onClick={() => setSection("Настройки")}><span className="admin-action-icon amber">⚙</span><span><b>Настройки сети</b><small>Параметры и доступ</small></span><em>→</em></button></div></article>
        <article className="admin-card admin-health"><div className="admin-card-head"><div><h2>Состояние сети</h2><p>Все системы работают штатно</p></div><span className="admin-status"><i/> В норме</span></div><div className="admin-health-items"><div><span>Сервер</span><b>99,98%</b><div className="admin-health-bar"><i style={{width:"99%"}}/></div></div><div><span>Хранилище</span><b>64% занято</b><div className="admin-health-bar"><i style={{width:"64%"}}/></div></div><div><span>Последняя резервная копия</span><b>Сегодня, 04:00</b><div className="admin-backup">✓ <span>Копия создана успешно</span></div></div></div></article></section>
      </> : <section className="admin-card admin-section-panel"><div className="admin-card-head"><div><h2>{section}</h2><p>{section === "Настройки" ? "Управляйте основными параметрами сети" : `Инструменты раздела «${section.toLowerCase()}»`}</p></div></div>{section === "Пользователи" ? <><div className="admin-search">⌕<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по имени, ID или почте"/><span>⌘ K</span></div><div className="admin-empty-state"><span>♙</span><b>{query ? `Результаты поиска: «${query}»` : "Управление пользователями"}</b><p>Находите аккаунты, проверяйте статус и управляйте доступом.</p><button className="admin-primary" onClick={() => action("Список пользователей открыт")}>Открыть список →</button></div></> : section === "Настройки" ? <div className="admin-settings">{[["registration","Регистрация пользователей","Разрешить новым пользователям создавать аккаунт"],["moderation","Премодерация публикаций","Проверять новые публикации перед показом в ленте"],["comments","Комментарии по умолчанию закрыты","Для новых публикаций комментарии будут отключены"]].map(([key,title,desc])=><div className="admin-setting" key={key}><span><b>{title}</b><small>{desc}</small></span><button aria-label={title} aria-pressed={enabled[key as keyof typeof enabled]} className={`admin-switch ${enabled[key as keyof typeof enabled] ? "on" : ""}`} onClick={() => setEnabled((current) => ({...current, [key]: !current[key as keyof typeof current]}))}><i/></button></div>)}</div> : <div className="admin-empty-state"><span>{section === "Безопасность" ? "⚑" : "▤"}</span><b>{section === "Безопасность" ? "7 обращений ждут проверки" : "Инструменты скоро появятся"}</b><p>{section === "Безопасность" ? "Проверьте жалобы и запросы пользователей." : "Здесь будут собраны инструменты управления этим разделом."}</p>{section === "Безопасность" && <button className="admin-primary" onClick={() => action("Очередь модерации открыта")}>Открыть очередь →</button>}</div>}</section>}
      {notice && <div className="admin-toast">✓ &nbsp;{notice}</div>}
      <div className="admin-footer">Friends Admin <span>•</span> Версия 1.0 <span>•</span> Все системы работают</div>
    </div>
  );
}
