import { getSessionUser } from "@/lib/sessionUser";

export const PROFILE_MEDIA_KEY = "friends.profile.media";

export type ProfileMedia = {
  photo: string;
  cover: string;
};

const fallbackCover = "/profile/cover.jpg";

function keyFor(userId?: string) {
  const id = userId ?? getSessionUser().id;
  return `${PROFILE_MEDIA_KEY}.${id}`;
}

export function defaultProfileMedia(userId?: string): ProfileMedia {
  const me = userId ? { id: userId, photo: undefined as string | undefined } : getSessionUser();
  const authPhoto =
    !userId || userId === getSessionUser().id ? getSessionUser().photo : undefined;
  return {
    photo: authPhoto || "/profile/avatar.jpg",
    cover: fallbackCover,
  };
}

export function loadProfileMedia(userId?: string): ProfileMedia {
  const defaults = defaultProfileMedia(userId);
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<ProfileMedia>;
    return {
      photo: parsed.photo || defaults.photo,
      cover: parsed.cover || defaults.cover,
    };
  } catch {
    return defaults;
  }
}

export function saveProfileMedia(next: ProfileMedia, userId?: string) {
  localStorage.setItem(keyFor(userId), JSON.stringify(next));
}

export function clearProfileMedia(userId?: string) {
  localStorage.removeItem(keyFor(userId));
}

/** Compress image file to a data URL so it fits in localStorage for the prototype. */
export function fileToDataUrl(
  file: File,
  opts: { maxWidth: number; maxHeight: number; quality?: number },
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Выберите изображение"));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Не удалось открыть изображение"));
      img.onload = () => {
        const scale = Math.min(
          1,
          opts.maxWidth / img.width,
          opts.maxHeight / img.height,
        );
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas unsupported"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", opts.quality ?? 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
