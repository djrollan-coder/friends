export class ApiError extends Error {
  status: number;
  code: string;
  constructor(code: string, status: number) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type") && typeof init.body === "string") {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(path, {
    credentials: "same-origin",
    cache: "no-store",
    ...init,
    headers,
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new ApiError(
      typeof data.error === "string" ? data.error : `http_${response.status}`,
      response.status,
    );
  }
  return data as T;
}

export type UploadResult = {
  url: string;
  name: string;
  size: number;
  type: string;
};

/** Convert a data URL to a Blob without fetch() (more reliable in WKWebView). */
export function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) throw new ApiError("invalid_image", 400);
  const meta = dataUrl.slice(0, comma);
  const b64 = dataUrl.slice(comma + 1);
  const mime = /data:([^;]+)/.exec(meta)?.[1] || "image/jpeg";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function uploadFile(file: Blob, filename = "upload.jpg"): Promise<UploadResult> {
  const form = new FormData();
  // Prefer Blob+filename — `new File()` is unreliable in older WKWebView.
  form.append("file", file, filename);
  return api<UploadResult>("/api/upload", { method: "POST", body: form });
}

export async function uploadDataUrl(dataUrl: string, filename = "upload"): Promise<UploadResult> {
  const blob = dataUrlToBlob(dataUrl);
  const mime = (blob.type || "image/jpeg").toLowerCase();
  if (!mime.startsWith("image/")) {
    throw new ApiError("unsupported_type", 415);
  }
  const extension = (mime.split("/")[1] ?? "jpg").replace(/[^a-z0-9]/g, "") || "jpg";
  return uploadFile(blob, `${filename}.${extension}`);
}
