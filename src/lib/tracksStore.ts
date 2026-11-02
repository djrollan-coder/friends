export const TRACKS_META_KEY = "friends.tracks.v1";
const DB_NAME = "friends-audio-v1";
const DB_STORE = "blobs";

export type Track = {
  id: string;
  title: string;
  artist: string;
  duration: string;
  cover: string;
  fileName: string;
  createdAt: number;
};

const urlCache = new Map<string, string>();

function coverFromName(name: string) {
  const base = name.replace(/\.[^.]+$/, "").trim() || "TR";
  return base
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function titleFromFile(file: File) {
  return file.name.replace(/\.[^.]+$/, "").trim() || file.name;
}

function formatDuration(totalSec: number) {
  if (!Number.isFinite(totalSec) || totalSec < 0) return "0:00";
  const total = Math.round(totalSec);
  const m = Math.floor(total / 60);
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function probeDuration(file: File) {
  return new Promise<string>((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    const done = (value: string) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    audio.onloadedmetadata = () => done(formatDuration(audio.duration));
    audio.onerror = () => done("0:00");
    window.setTimeout(() => done("0:00"), 4000);
    audio.src = url;
  });
}

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("idb_open"));
  });
}

async function idbPut(id: string, blob: Blob) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("idb_put"));
  });
  db.close();
}

async function idbGet(id: string) {
  const db = await openDb();
  const blob = await new Promise<Blob | undefined>((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const req = tx.objectStore(DB_STORE).get(id);
    req.onsuccess = () => resolve(req.result as Blob | undefined);
    req.onerror = () => reject(req.error ?? new Error("idb_get"));
  });
  db.close();
  return blob;
}

async function idbDelete(id: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("idb_del"));
  });
  db.close();
}

export function loadTracks(): Track[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TRACKS_META_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Track[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTracks(next: Track[]) {
  localStorage.setItem(TRACKS_META_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("friends-tracks-changed"));
}

export async function getTrackObjectUrl(id: string) {
  const cached = urlCache.get(id);
  if (cached) return cached;
  const blob = await idbGet(id);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(id, url);
  return url;
}

export function revokeTrackUrl(id: string) {
  const url = urlCache.get(id);
  if (!url) return;
  URL.revokeObjectURL(url);
  urlCache.delete(id);
}

export async function addTracksFromFiles(files: FileList | File[]) {
  const list = Array.from(files).filter((f) => f.type.startsWith("audio/"));
  if (!list.length) return loadTracks();

  const added: Track[] = [];
  for (const file of list) {
    const id = `tr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const duration = await probeDuration(file);
    await idbPut(id, file);
    added.push({
      id,
      title: titleFromFile(file),
      artist: file.type.replace("audio/", "").toUpperCase() || "Local",
      duration,
      cover: coverFromName(file.name),
      fileName: file.name,
      createdAt: Date.now(),
    });
  }

  const next = [...added, ...loadTracks()];
  saveTracks(next);
  return next;
}

export async function removeTrack(id: string) {
  revokeTrackUrl(id);
  try {
    await idbDelete(id);
  } catch {
    /* ignore */
  }
  const next = loadTracks().filter((t) => t.id !== id);
  saveTracks(next);
  return next;
}

export function formatPlaybackTime(sec: number) {
  return formatDuration(sec);
}
