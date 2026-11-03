import fs from "node:fs/promises";
import path from "node:path";
import { uploadDir } from "@/lib/server/db";

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
};

type Params = { params: Promise<{ name: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { name } = await params;
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
    return new Response("not_found", { status: 404 });
  }
  const filePath = path.join(uploadDir(), name);
  try {
    const data = await fs.readFile(filePath);
    const type = TYPES[path.extname(name).toLowerCase()] ?? "application/octet-stream";
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": type,
        "Content-Length": String(data.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": "inline",
      },
    });
  } catch {
    return new Response("not_found", { status: 404 });
  }
}
