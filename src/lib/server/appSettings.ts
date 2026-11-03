import { getDb, type Row } from "./db";

export type AppSettings = {
  registration: boolean;
  premoderation: boolean;
  commentsClosed: boolean;
};

export function getSetting(key: string, fallback = "") {
  const row = getDb()
    .prepare("SELECT value FROM app_settings WHERE key = ?")
    .get(key) as Row | undefined;
  return row ? String(row.value) : fallback;
}

export function setSetting(key: string, value: string) {
  getDb()
    .prepare(
      "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .run(key, value);
}

export function getAppSettings(): AppSettings {
  return {
    registration: getSetting("registration", "1") !== "0",
    premoderation: getSetting("premoderation", "0") !== "0",
    commentsClosed: getSetting("comments_closed", "0") !== "0",
  };
}

export function updateAppSettings(patch: Partial<AppSettings>) {
  if (patch.registration !== undefined) setSetting("registration", patch.registration ? "1" : "0");
  if (patch.premoderation !== undefined) setSetting("premoderation", patch.premoderation ? "1" : "0");
  if (patch.commentsClosed !== undefined) setSetting("comments_closed", patch.commentsClosed ? "1" : "0");
  return getAppSettings();
}
