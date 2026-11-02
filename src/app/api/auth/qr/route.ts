import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { createQrSession } from "@/lib/qr-sessions";

export async function POST(request: Request) {
  const session = createQrSession();
  const origin = new URL(request.url).origin;
  const payload = `${origin}/login/qr/${session.token}`;
  const qrDataUrl = await QRCode.toDataURL(payload, {
    margin: 1,
    width: 280,
    color: {
      dark: "#111111",
      light: "#ffffff",
    },
  });

  return NextResponse.json({
    token: session.token,
    status: session.status,
    confirmUrl: payload,
    qrDataUrl,
  });
}
