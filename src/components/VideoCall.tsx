"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { currentUser, friends, type User } from "@/data/mock";
import { pushNotification } from "@/lib/notify";
import { useT } from "@/lib/i18n/I18nProvider";

export type CallParticipant = {
  id: string;
  name: string;
  avatar: string;
  isSelf?: boolean;
};

type Props = {
  open: boolean;
  title: string;
  mode: "dm" | "group";
  participants: CallParticipant[];
  onClose: () => void;
};

export function VideoCall({ open, title, mode, participants, onClose }: Props) {
  const t = useT();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [joined, setJoined] = useState<Record<string, boolean>>({});

  function resolveUser(id: string): User {
    if (id === currentUser.id) return currentUser;
    return (
      friends.find((f) => f.id === id) ?? {
        id,
        name: t("call.participant"),
        avatar: "??",
      }
    );
  }

  const people = useMemo(() => {
    const list = participants.length
      ? participants
      : [{ id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar, isSelf: true }];
    if (!list.some((p) => p.id === currentUser.id || p.isSelf)) {
      return [
        {
          id: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatar,
          isSelf: true,
        },
        ...list,
      ];
    }
    return list.map((p) =>
      p.id === currentUser.id || p.isSelf
        ? { ...p, isSelf: true, name: currentUser.name, avatar: currentUser.avatar }
        : p,
    );
  }, [participants]);

  useEffect(() => {
    if (!open) return;

    let alive = true;
    setError("");
    setReady(false);
    setSeconds(0);
    setMuted(false);
    setCameraOff(false);

    const initial: Record<string, boolean> = {};
    for (const p of people) {
      initial[p.id] = !!p.isSelf || p.id === currentUser.id;
    }
    setJoined(initial);

    const timers = people
      .filter((p) => p.id !== currentUser.id && !p.isSelf)
      .map((p, index) =>
        window.setTimeout(() => {
          if (!alive) return;
          setJoined((prev) => ({ ...prev, [p.id]: true }));
        }, 700 + index * 650),
      );

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: true,
        });
        if (!alive) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          await localVideoRef.current.play().catch(() => undefined);
        }
        setReady(true);
        pushNotification({
          type: "message",
          title: mode === "group" ? t("call.groupTitle") : t("call.title"),
          body: title,
          href: "/messages",
        });
      } catch {
        if (!alive) return;
        setError(t("call.noMedia"));
      }
    }

    void start();

    const tick = window.setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);

    return () => {
      alive = false;
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearInterval(tick);
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
    };
  }, [open, mode, title, people, t]);

  useEffect(() => {
    const stream = streamRef.current;
    if (!stream) return;
    for (const track of stream.getAudioTracks()) track.enabled = !muted;
    for (const track of stream.getVideoTracks()) track.enabled = !cameraOff;
  }, [muted, cameraOff]);

  if (!open) return null;

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const count = Object.values(joined).filter(Boolean).length;

  return (
    <div className="video-call" role="dialog" aria-modal="true" aria-label={t("call.title")}>
      <div className="video-call-top">
        <div>
          <div className="video-call-title">{title}</div>
          <div className="video-call-sub">
            {mode === "group" ? t("call.group") : t("call.personal")} · {mm}:{ss} · {count}{" "}
            {t("friends.countOnline")}
          </div>
        </div>
        <button type="button" className="video-call-leave ghost" onClick={onClose}>
          {t("call.collapse")}
        </button>
      </div>

      {error ? <div className="video-call-error">{error}</div> : null}

      <div
        className={`video-call-grid cols-${Math.min(4, Math.max(1, people.length))}`}
      >
        {people.map((p) => {
          const self = p.isSelf || p.id === currentUser.id;
          const isJoined = joined[p.id];
          const user = resolveUser(p.id);
          return (
            <div
              key={p.id}
              className={`video-tile${self ? " is-self" : ""}${!isJoined ? " is-waiting" : ""}`}
            >
              {self ? (
                <>
                  <video
                    ref={localVideoRef}
                    className="video-tile-media"
                    playsInline
                    muted
                    autoPlay
                    style={{ opacity: ready && !cameraOff ? 1 : 0 }}
                  />
                  {(!ready || cameraOff || error) && (
                    <div className="video-tile-fallback is-overlay">
                      <span>{user.avatar}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="video-tile-fallback">
                  <span>{user.avatar}</span>
                </div>
              )}
              <div className="video-tile-label">
                <span>{self ? t("call.self") : user.name}</span>
                {!isJoined ? <em>{t("call.connecting")}</em> : null}
                {self && muted ? <em>{t("call.micOff")}</em> : null}
                {self && cameraOff ? <em>{t("call.camOff")}</em> : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="video-call-controls">
        <button
          type="button"
          className={`video-call-btn${muted ? " is-off" : ""}`}
          onClick={() => setMuted((v) => !v)}
          aria-pressed={muted}
        >
          {t("call.mic")}
          <small>{muted ? t("call.off") : t("call.on")}</small>
        </button>
        <button
          type="button"
          className={`video-call-btn${cameraOff ? " is-off" : ""}`}
          onClick={() => setCameraOff((v) => !v)}
          aria-pressed={cameraOff}
        >
          {t("call.camera")}
          <small>{cameraOff ? t("call.off") : t("call.on")}</small>
        </button>
        <button type="button" className="video-call-leave" onClick={onClose}>
          {t("call.end")}
        </button>
      </div>
    </div>
  );
}
