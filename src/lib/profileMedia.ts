import { currentUser } from "@/data/mock";

export const PROFILE_MEDIA_KEY = "friends.profile.media";

export type ProfileMedia = {
  photo: string;
  cover: string;
};

const defaults: ProfileMedia = {
  photo: currentUser.photo ?? "/profile/avatar.jpg",
  cover: currentUser.cover ?? "/profile/cover.jpg",
};

export function loadProfileMedia(): ProfileMedia {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(PROFILE_MEDIA_KEY);
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

export function saveProfileMedia(next: ProfileMedia) {
  localStorage.setItem(PROFILE_MEDIA_KEY, JSON.stringify(next));
}

export function clearProfileMedia() {
  localStorage.removeItem(PROFILE_MEDIA_KEY);
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
      img.onerror = () => reject(new Error("Некорректное изображение"));
      img.onload = () => {
        const scale = Math.min(
          1,
          opts.maxWidth / img.width,
          opts.maxHeight / img.height,
        );
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas недоступен"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", opts.quality ?? 0.84));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
