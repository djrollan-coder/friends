"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useI18n, useT } from "@/lib/i18n/I18nProvider";
import type { Locale } from "@/lib/i18n/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onScheduleAt: (sendAt: number) => void;
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function monthTitle(locale: Locale, date: Date) {
  try {
    return new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : locale, {
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return `${date.getMonth() + 1}.${date.getFullYear()}`;
  }
}

function weekdayLabels(locale: Locale) {
  const map: Record<Locale, string[]> = {
    ru: ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"],
    uk: ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "НД"],
    en: ["MO", "TU", "WE", "TH", "FR", "SA", "SU"],
    es: ["LU", "MA", "MI", "JU", "VI", "SA", "DO"],
    de: ["MO", "DI", "MI", "DO", "FR", "SA", "SO"],
    fr: ["LU", "MA", "ME", "JE", "VE", "SA", "DI"],
  };
  return map[locale] ?? map.en;
}

export function ScheduleMessageModal({
  open,
  onClose,
  onScheduleAt,
}: Props) {
  const t = useT();
  const { locale } = useI18n();
  const [mounted, setMounted] = useState(false);
  const now = useMemo(() => new Date(), [open]);
  const [cursor, setCursor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selected, setSelected] = useState(() => startOfDay(now));
  const [time, setTime] = useState(() => {
    const d = new Date(now.getTime() + 5 * 60_000);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const n = new Date();
    setCursor(new Date(n.getFullYear(), n.getMonth(), 1));
    setSelected(startOfDay(n));
    const d = new Date(n.getTime() + 5 * 60_000);
    setTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted) return null;

  const days = weekdayLabels(locale);
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);

  const [hh, mm] = time.split(":").map((x) => Number(x));
  const sendAt = new Date(selected);
  sendAt.setHours(hh || 0, mm || 0, 0, 0);
  const valid = sendAt.getTime() > now.getTime() + 15_000;

  const primaryLabel = sameDay(selected, now)
    ? t("msg.sendTodayAt", { time })
    : t("msg.sendAt", {
        date: `${pad(selected.getDate())}.${pad(selected.getMonth() + 1)}`,
        time,
      });

  const grid7: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap: 4,
    width: "100%",
  };

  const modal = (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.58)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: 12,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sched-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(420px, 100%)",
          maxHeight: "min(92vh, 720px)",
          overflow: "auto",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "#1a1c1f",
          boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
          padding: "12px 14px 16px",
          color: "#ececed",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "36px 1fr 36px",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            style={iconBtn}
          >
            ×
          </button>
          <h2
            id="sched-title"
            style={{ margin: 0, textAlign: "center", fontSize: 17, color: "#fff" }}
          >
            {t("msg.sendTimeTitle")}
          </h2>
          <span style={{ width: 36, height: 36 }} aria-hidden />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "36px 1fr 36px",
            alignItems: "center",
            margin: "4px 0 10px",
          }}
        >
          <button
            type="button"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            aria-label={t("common.back")}
            style={iconBtn}
          >
            ‹
          </button>
          <div
            style={{
              textAlign: "center",
              textTransform: "capitalize",
              color: "#fff",
              fontWeight: 650,
              fontSize: 15,
            }}
          >
            {monthTitle(locale, cursor)}
          </div>
          <button
            type="button"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            aria-label="next"
            style={iconBtn}
          >
            ›
          </button>
        </div>

        <div style={{ ...grid7, marginBottom: 6 }}>
          {days.map((d) => (
            <span
              key={d}
              style={{
                textAlign: "center",
                color: "#a3a4a8",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {d}
            </span>
          ))}
        </div>

        <div style={grid7}>
          {cells.map((day, idx) => {
            if (!day) {
              return <span key={`e${idx}`} style={{ aspectRatio: "1" }} />;
            }
            const date = new Date(year, month, day);
            const disabled = startOfDay(date) < startOfDay(now);
            const active = sameDay(date, selected);
            return (
              <button
                key={`${year}-${month}-${day}`}
                type="button"
                disabled={disabled}
                onClick={() => setSelected(startOfDay(date))}
                style={{
                  aspectRatio: "1",
                  border: 0,
                  borderRadius: "50%",
                  background: active ? "#c4784a" : "transparent",
                  color: active ? "#fff" : disabled ? "rgba(236,236,237,0.28)" : "#ececed",
                  cursor: disabled ? "not-allowed" : "pointer",
                  font: "inherit",
                  fontSize: 14,
                  fontWeight: active ? 700 : 400,
                }}
              >
                {day}
              </button>
            );
          })}
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginTop: 14,
            fontSize: 14,
          }}
        >
          <span>{t("msg.time")}</span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            style={{
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.28)",
              color: "#fff",
              borderRadius: 999,
              padding: "7px 12px",
              font: "inherit",
              fontSize: 14,
            }}
          />
        </label>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginTop: 12,
            color: "#a3a4a8",
            fontSize: 14,
          }}
        >
          <span>{t("msg.repeat")}</span>
          <span
            style={{
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 999,
              padding: "6px 12px",
              fontSize: 13,
            }}
          >
            {t("msg.never")}
          </span>
        </div>

        <button
          type="button"
          className="vk-btn"
          disabled={!valid}
          onClick={() => {
            if (!valid) return;
            onScheduleAt(sendAt.getTime());
          }}
          style={{ width: "100%", marginTop: 16, justifyContent: "center" }}
        >
          {primaryLabel}
        </button>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

const iconBtn: CSSProperties = {
  width: 36,
  height: 36,
  border: 0,
  borderRadius: "50%",
  background: "transparent",
  color: "#ececed",
  fontSize: 22,
  lineHeight: 1,
  cursor: "pointer",
};
