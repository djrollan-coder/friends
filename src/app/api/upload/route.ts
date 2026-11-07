import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/lib/server/auth";
import { uploadDir } from "@/lib/server/db";
import { bumpRateLimit, clientIp, rateLimitResponse } from "@/lib/server/rateLimit";

const MAX_BYTES = 25 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "audio/mpeg": ".mp3",
  "audio/ogg": ".ogg",
  "audio/wav": ".wav",
  "audio/mp4": ".m4a",
};

export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    bumpRateLimit(`upload:user:${me.id}`, 40, 60 * 60 * 1000);
    bumpRateLimit(`upload:ip:${clientIp(request)}`, 80, 60 * 60 * 1000);
  } catch {
    return rateLimitResponse();
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }
  if (file.size <= 0) {
    return NextResponse.json({ error: "empty_file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }

  const mime = (file.type || "").toLowerCase();
  const extension = EXTENSIONS[mime];
  if (!extension) {
    return NextResponse.json({ error: "unsupported_type" }, { status: 415 });
  }

  const name = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(uploadDir(), name), buffer);

  return NextResponse.json({
    url: `/api/media/${name}`,
    name,
    size: file.size,
    type: mime,
  });
}
