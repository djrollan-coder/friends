export type ProfileMedia = {
  photo: string;
  cover: string;
};

export const defaultProfileMedia: ProfileMedia = {
  photo: "/profile/avatar.jpg",
  cover: "/profile/cover.jpg",
};

export type CompressKind = "photo" | "cover";

type ResizeOpts = {
  maxWidth: number;
  maxHeight: number;
  quality?: number;
  /** Soft cap for final JPEG bytes (base64 payload will be ~4/3 of this). */
  maxBytes?: number;
  /**
   * `fit` — keep aspect, shrink into box (avatar).
   * `contain` — letterbox into a fixed banner canvas so covers aren't zoom-cropped.
   */
  mode?: "fit" | "contain";
};

export const COVER_BANNER = { width: 1200, height: 420 } as const;

const PRESETS: Record<CompressKind, ResizeOpts> = {
  // Kept small — stored as JPEG data URLs in SQLite (Vercel FS is ephemeral).
  photo: { maxWidth: 480, maxHeight: 480, quality: 0.7, maxBytes: 140_000, mode: "fit" },
  // Final cover is usually produced by CoverAdjuster; this is a fallback letterbox.
  cover: {
    maxWidth: COVER_BANNER.width,
    maxHeight: COVER_BANNER.height,
    quality: 0.72,
    maxBytes: 260_000,
    mode: "contain",
  },
};

/** Mild shrink for the cover adjuster source (keeps aspect, no letterbox). */
const COVER_SOURCE_PRESET: ResizeOpts = {
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.82,
  maxBytes: 900_000,
  mode: "fit",
};

function dataUrlBytes(dataUrl: string) {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return dataUrl.length;
  const b64 = dataUrl.slice(comma + 1);
  return Math.floor((b64.length * 3) / 4);
}

function drawToJpeg(
  source: CanvasImageSource,
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
  quality: number,
  mode: "fit" | "contain" = "fit",
): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");

  if (mode === "contain") {
    // Always emit a banner-sized frame; fit the whole image inside it.
    const canvasW = Math.max(1, Math.round(maxWidth));
    const canvasH = Math.max(1, Math.round(maxHeight));
    canvas.width = canvasW;
    canvas.height = canvasH;
    ctx.fillStyle = "#1a1c1f";
    ctx.fillRect(0, 0, canvasW, canvasH);
    const scale = Math.min(canvasW / width, canvasH / height);
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const x = Math.round((canvasW - w) / 2);
    const y = Math.round((canvasH - h) / 2);
    ctx.drawImage(source, x, y, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  }

  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  canvas.width = w;
  canvas.height = h;
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

async function loadImageSource(file: Blob): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  release?: () => void;
}> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      /* fall through */
    }
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Не удалось открыть изображение"));
    image.src = dataUrl;
  });

  return {
    source: img,
    width: img.naturalWidth || img.width,
    height: img.naturalHeight || img.height,
  };
}

/** Compress Blob/File to a JPEG data URL under size/dimension caps. */
export async function fileToDataUrl(file: Blob, opts: ResizeOpts): Promise<string> {
  const mime = (file.type || "").toLowerCase();
  if (mime && !mime.startsWith("image/") && mime !== "application/octet-stream") {
    throw new Error("Выберите изображение");
  }

  const loaded = await loadImageSource(file);
  try {
    let maxWidth = opts.maxWidth;
    let maxHeight = opts.maxHeight;
    let quality = opts.quality ?? 0.82;
    const maxBytes = opts.maxBytes ?? 700_000;
    const mode = opts.mode ?? "fit";
    let best = drawToJpeg(
      loaded.source,
      loaded.width,
      loaded.height,
      maxWidth,
      maxHeight,
      quality,
      mode,
    );

    for (let i = 0; i < 8 && dataUrlBytes(best) > maxBytes; i += 1) {
      quality = Math.max(0.45, quality - 0.08);
      if (i >= 3) {
        maxWidth = Math.max(320, Math.round(maxWidth * 0.82));
        maxHeight = Math.max(180, Math.round(maxHeight * 0.82));
      }
      best = drawToJpeg(
        loaded.source,
        loaded.width,
        loaded.height,
        maxWidth,
        maxHeight,
        quality,
        mode,
      );
    }

    if (dataUrlBytes(best) > maxBytes * 1.35) {
      throw new Error("file_too_large");
    }
    return best;
  } finally {
    loaded.release?.();
  }
}

/** Decode a data URL without fetch() — WKWebView often rejects fetch(data:…). */
function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) throw new Error("invalid_image");
  const meta = dataUrl.slice(0, comma);
  const b64 = dataUrl.slice(comma + 1);
  const mime = /data:([^;]+)/.exec(meta)?.[1] || "image/jpeg";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Built-in profile compressor — use for avatar/cover picks and before upload. */
export async function compressProfileImage(
  input: Blob | string,
  kind: CompressKind,
): Promise<string> {
  const preset = PRESETS[kind];
  if (typeof input === "string") {
    if (!input.startsWith("data:")) return input;
    if (dataUrlBytes(input) <= (preset.maxBytes ?? 700_000)) return input;
    return fileToDataUrl(dataUrlToBlob(input), preset);
  }
  return fileToDataUrl(input, preset);
}

/** Prepare a cover source for the scale/pan adjuster (full frame, not letterboxed). */
export async function prepareCoverSource(input: Blob | string): Promise<string> {
  if (typeof input === "string") {
    if (!input.startsWith("data:")) return input;
    if (dataUrlBytes(input) <= (COVER_SOURCE_PRESET.maxBytes ?? 900_000)) return input;
    return fileToDataUrl(dataUrlToBlob(input), COVER_SOURCE_PRESET);
  }
  return fileToDataUrl(input, COVER_SOURCE_PRESET);
}

export type CoverTransform = {
  /** 1 = fill the banner; higher = zoom in. */
  zoom: number;
  /** Pan as fraction of overflow, -1..1 (0 = centered). */
  panX: number;
  panY: number;
};

/**
 * Render a cover banner from a source image using user zoom/pan.
 * zoom=1 fills the frame (CSS cover); pan moves within the overflow.
 */
export async function renderCoverTransform(
  source: string,
  transform: CoverTransform,
): Promise<string> {
  const blob = source.startsWith("data:")
    ? dataUrlToBlob(source)
    : await (await fetch(source)).blob();
  const loaded = await loadImageSource(blob);
  try {
    const { width: iw, height: ih } = loaded;
    const cw = COVER_BANNER.width;
    const ch = COVER_BANNER.height;
    const base = Math.max(cw / iw, ch / ih);
    const zoom = Math.min(4, Math.max(1, transform.zoom || 1));
    const scale = base * zoom;
    const dw = iw * scale;
    const dh = ih * scale;
    const maxPanX = Math.max(0, (dw - cw) / 2);
    const maxPanY = Math.max(0, (dh - ch) / 2);
    const panX = Math.max(-1, Math.min(1, transform.panX || 0));
    const panY = Math.max(-1, Math.min(1, transform.panY || 0));
    const x = (cw - dw) / 2 + panX * maxPanX;
    const y = (ch - dh) / 2 + panY * maxPanY;

    let quality = 0.74;
    let outW: number = cw;
    let outH: number = ch;
    let best = "";
    for (let i = 0; i < 6; i += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unsupported");
      ctx.fillStyle = "#1a1c1f";
      ctx.fillRect(0, 0, outW, outH);
      const sx = x * (outW / cw);
      const sy = y * (outH / ch);
      const sdw = dw * (outW / cw);
      const sdh = dh * (outH / ch);
      ctx.drawImage(loaded.source, sx, sy, sdw, sdh);
      best = canvas.toDataURL("image/jpeg", quality);
      if (dataUrlBytes(best) <= 260_000) return best;
      quality = Math.max(0.45, quality - 0.08);
      if (i >= 2) {
        outW = Math.max(640, Math.round(outW * 0.85));
        outH = Math.max(224, Math.round(outH * 0.85));
      }
    }
    return best;
  } finally {
    loaded.release?.();
  }
}

export function profileCompressOpts(kind: CompressKind): ResizeOpts {
  return PRESETS[kind];
}
