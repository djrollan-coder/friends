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

export async function uploadFile(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);
  return api<UploadResult>("/api/upload", { method: "POST", body: form });
}

export async function uploadDataUrl(dataUrl: string, filename = "upload"): Promise<UploadResult> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const extension = (blob.type.split("/")[1] ?? "bin").replace(/[^a-z0-9]/g, "");
  const file = new File([blob], `${filename}.${extension}`, { type: blob.type });
  return uploadFile(file);
}
