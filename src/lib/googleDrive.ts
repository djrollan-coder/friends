export const DRIVE_META_KEY = "friends.drive.meta.v1";
export const DRIVE_FILE_NAME = "friends-circle-backup.json";
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

const SYNC_KEYS = [
  "friends.auth",
  "friends.accounts.v1",
  "friends.profile.bio",
  "friends.profile.media",
  "friends.feed.v1",
  "friends.bookmarks.v1",
  "friends.chats.v1",
  "friends.social.friends.v1",
  "friends.groups.v1",
  "friends.videos.v1",
  "friends.playlists.v1",
  "friends.tracks.v1",
  "friends.notifications.v1",
  "friends.circle.v1",
  "friends.invites.v1",
  "friends.interests",
  "friends.locale",
  "friends.scheduled.messages.v1",
] as const;

export type DriveMeta = {
  connected: boolean;
  email?: string;
  fileId?: string;
  lastSyncAt?: string;
};

export type DriveBackup = {
  version: 1;
  exportedAt: string;
  data: Record<string, string>;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token?: string; error?: string }) => void;
            error_callback?: (err: { type?: string; message?: string }) => void;
          }) => { requestAccessToken: (opts?: { prompt?: string }) => void };
          revoke: (token: string, done: () => void) => void;
        };
      };
    };
  }
}

export function getGoogleClientId() {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";
}

export function loadDriveMeta(): DriveMeta {
  if (typeof window === "undefined") return { connected: false };
  try {
    const raw = localStorage.getItem(DRIVE_META_KEY);
    if (!raw) return { connected: false };
    const parsed = JSON.parse(raw) as DriveMeta;
    return { ...parsed, connected: !!parsed.connected };
  } catch {
    return { connected: false };
  }
}

export function saveDriveMeta(meta: DriveMeta) {
  localStorage.setItem(DRIVE_META_KEY, JSON.stringify(meta));
}

function getSessionToken() {
  return sessionStorage.getItem("friends.drive.token") ?? "";
}

function setSessionToken(token: string) {
  sessionStorage.setItem("friends.drive.token", token);
}

function clearSessionToken() {
  sessionStorage.removeItem("friends.drive.token");
}

export function collectLocalBackup(): DriveBackup {
  const data: Record<string, string> = {};
  for (const key of SYNC_KEYS) {
    const value = localStorage.getItem(key);
    if (value != null) data[key] = value;
  }
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function applyLocalBackup(backup: DriveBackup) {
  if (!backup?.data || typeof backup.data !== "object") {
    throw new Error("invalid_backup");
  }
  for (const [key, value] of Object.entries(backup.data)) {
    if (typeof value === "string" && key.startsWith("friends.")) {
      localStorage.setItem(key, value);
    }
  }
}

export function loadGisScript() {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("ssr"));
      return;
    }
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-friends-gis="1"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("gis_load")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.dataset.friendsGis = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("gis_load"));
    document.head.appendChild(script);
  });
}

export async function requestDriveToken(opts?: { prompt?: string }) {
  const clientId = getGoogleClientId();
  if (!clientId) throw new Error("missing_client_id");
  await loadGisScript();
  if (!window.google?.accounts?.oauth2) throw new Error("gis_unavailable");

  return new Promise<string>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (resp) => {
        if (resp.error || !resp.access_token) {
          reject(new Error(resp.error || "token_error"));
          return;
        }
        setSessionToken(resp.access_token);
        resolve(resp.access_token);
      },
      error_callback: (err) => reject(new Error(err.message || err.type || "token_error")),
    });
    client.requestAccessToken({ prompt: opts?.prompt });
  });
}

async function driveFetch(path: string, init?: RequestInit) {
  let token = getSessionToken();
  if (!token) token = await requestDriveToken();
  const res = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 401) {
    clearSessionToken();
    token = await requestDriveToken({ prompt: "consent" });
    const retry = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    });
    return retry;
  }
  return res;
}

export async function fetchGoogleEmail(accessToken?: string) {
  const token = accessToken || getSessionToken() || (await requestDriveToken());
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("userinfo_failed");
  const data = (await res.json()) as { email?: string };
  return data.email ?? "";
}

async function findBackupFileId(): Promise<string | undefined> {
  const meta = loadDriveMeta();
  if (meta.fileId) return meta.fileId;
  const q = encodeURIComponent(
    `name='${DRIVE_FILE_NAME}' and trashed=false`,
  );
  const res = await driveFetch(
    `files?q=${q}&spaces=drive&fields=files(id,name)&pageSize=1`,
  );
  if (!res.ok) throw new Error("list_failed");
  const data = (await res.json()) as { files?: { id: string }[] };
  return data.files?.[0]?.id;
}

export async function uploadBackupToDrive() {
  const backup = collectLocalBackup();
  const body = JSON.stringify(backup, null, 2);
  let fileId = await findBackupFileId();

  if (!fileId) {
    const metadata = {
      name: DRIVE_FILE_NAME,
      mimeType: "application/json",
    };
    const form = new FormData();
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" }),
    );
    form.append("file", new Blob([body], { type: "application/json" }));

    let token = getSessionToken();
    if (!token) token = await requestDriveToken();
    const res = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      },
    );
    if (!res.ok) throw new Error("upload_create_failed");
    const created = (await res.json()) as { id: string };
    fileId = created.id;
  } else {
    let token = getSessionToken();
    if (!token) token = await requestDriveToken();
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body,
      },
    );
    if (!res.ok) throw new Error("upload_update_failed");
  }

  const next: DriveMeta = {
    ...loadDriveMeta(),
    connected: true,
    fileId,
    lastSyncAt: new Date().toISOString(),
  };
  saveDriveMeta(next);
  return next;
}

export async function downloadBackupFromDrive() {
  const fileId = await findBackupFileId();
  if (!fileId) throw new Error("no_backup");
  const res = await driveFetch(`files/${fileId}?alt=media`);
  if (!res.ok) throw new Error("download_failed");
  const backup = (await res.json()) as DriveBackup;
  applyLocalBackup(backup);
  const next: DriveMeta = {
    ...loadDriveMeta(),
    connected: true,
    fileId,
    lastSyncAt: new Date().toISOString(),
  };
  saveDriveMeta(next);
  return next;
}

export async function connectGoogleDrive() {
  const token = await requestDriveToken({ prompt: "consent" });
  const email = await fetchGoogleEmail(token);
  const meta: DriveMeta = {
    ...loadDriveMeta(),
    connected: true,
    email,
  };
  saveDriveMeta(meta);
  await uploadBackupToDrive();
  return loadDriveMeta();
}

export function disconnectGoogleDrive() {
  const token = getSessionToken();
  if (token && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(token, () => undefined);
  }
  clearSessionToken();
  saveDriveMeta({ connected: false });
}
