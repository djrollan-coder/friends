export type ProfileMedia = {
  photo: string;
  cover: string;
};

export const defaultProfileMedia: ProfileMedia = {
  photo: "/profile/avatar.jpg",
  cover: "/profile/cover.jpg",
};

/** Compress an image file to a data URL before it is uploaded. */
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
