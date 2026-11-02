"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/I18nProvider";
import {
  connectGoogleDrive,
  disconnectGoogleDrive,
  downloadBackupFromDrive,
  getGoogleClientId,
  loadDriveMeta,
  uploadBackupToDrive,
  type DriveMeta,
} from "@/lib/googleDrive";

export function GoogleDrivePanel() {
  const t = useT();
  const [meta, setMeta] = useState<DriveMeta>({ connected: false });
  const [busy, setBusy] = useState<"connect" | "upload" | "download" | null>(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const clientId = getGoogleClientId();

  useEffect(() => {
    setMeta(loadDriveMeta());
  }, []);

  async function run(
    kind: "connect" | "upload" | "download",
    action: () => Promise<DriveMeta | void>,
  ) {
    setBusy(kind);
    setError("");
    setOk("");
    try {
      const next = await action();
      if (next) setMeta(next);
      else setMeta(loadDriveMeta());
      setOk(
        kind === "download"
          ? t("drive.restored")
          : kind === "connect"
            ? t("drive.connectedOk")
            : t("drive.savedOk"),
      );
      if (kind === "download") {
        window.setTimeout(() => window.location.reload(), 700);
      }
    } catch (e) {
      const code = e instanceof Error ? e.message : "error";
      if (code === "missing_client_id") setError(t("drive.missingClient"));
      else if (code === "no_backup") setError(t("drive.noBackup"));
      else if (code === "popup_closed" || code.includes("popup")) setError(t("drive.cancelled"));
      else setError(t("drive.error"));
    } finally {
      setBusy(null);
    }
  }

  const lastSync = meta.lastSyncAt
    ? new Date(meta.lastSyncAt).toLocaleString()
    : t("drive.never");

  return (
    <section className="vk-card settings-panel">
      <h2 className="settings-panel-title">{t("drive.title")}</h2>
      <p className="settings-panel-desc">{t("drive.desc")}</p>

      {!clientId ? (
        <div className="drive-setup">
          <p>{t("drive.setupHint")}</p>
          <code className="drive-env">NEXT_PUBLIC_GOOGLE_CLIENT_ID=…</code>
        </div>
      ) : null}

      <div className="drive-status">
        <div>
          <strong>{meta.connected ? t("drive.statusOn") : t("drive.statusOff")}</strong>
          {meta.email ? <span className="drive-email">{meta.email}</span> : null}
        </div>
        <span className="drive-sync">{t("drive.lastSync", { when: lastSync })}</span>
      </div>

      <div className="drive-actions">
        {!meta.connected ? (
          <button
            type="button"
            className="vk-btn"
            disabled={!clientId || busy !== null}
            onClick={() => void run("connect", connectGoogleDrive)}
          >
            {busy === "connect" ? t("common.loading") : t("drive.connect")}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="vk-btn"
              disabled={busy !== null}
              onClick={() => void run("upload", uploadBackupToDrive)}
            >
              {busy === "upload" ? t("common.loading") : t("drive.upload")}
            </button>
            <button
              type="button"
              className="drive-secondary"
              disabled={busy !== null}
              onClick={() => void run("download", downloadBackupFromDrive)}
            >
              {busy === "download" ? t("common.loading") : t("drive.download")}
            </button>
            <button
              type="button"
              className="drive-secondary"
              disabled={busy !== null}
              onClick={() => {
                disconnectGoogleDrive();
                setMeta({ connected: false });
                setOk(t("drive.disconnected"));
                setError("");
              }}
            >
              {t("drive.disconnect")}
            </button>
          </>
        )}
      </div>

      {error ? <div className="drive-error">{error}</div> : null}
      {ok ? <div className="drive-ok">{ok}</div> : null}

      <ul className="drive-points">
        <li>{t("drive.point1")}</li>
        <li>{t("drive.point2")}</li>
        <li>{t("drive.point3")}</li>
      </ul>
    </section>
  );
}
