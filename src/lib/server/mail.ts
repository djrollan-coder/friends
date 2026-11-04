import { Resend } from "resend";

export function emailSendingConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function fromAddress() {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    "Friends <onboarding@resend.dev>"
  );
}

export async function sendLoginEmail(input: {
  to: string;
  code: string;
  magicUrl: string;
  name?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const subject = "Код входа в Friends";
  const rawName = input.name?.trim() || "";
  const safeName = rawName
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  const greetingHtml = safeName ? `Привет, ${safeName}!` : "Привет!";
  const greetingText = rawName ? `Привет, ${rawName}!` : "Привет!";
  const text = [
    greetingText,
    "",
    `Код для входа в Friends: ${input.code}`,
    "Код действует 10 минут.",
    "",
    `Или открой ссылку: ${input.magicUrl}`,
    "",
    "Если это были не вы — просто проигнорируйте письмо.",
  ].join("\n");
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;line-height:1.5;color:#111">
      <p>${greetingHtml}</p>
      <p>Код для входа в <b>Friends</b>:</p>
      <p style="font-size:28px;letter-spacing:0.2em;font-weight:700">${input.code}</p>
      <p>Код действует 10 минут.</p>
      <p><a href="${input.magicUrl}" style="color:#c4784a">Открыть Friends и войти</a></p>
      <p style="color:#666;font-size:12px">Если это были не вы — просто проигнорируйте письмо.</p>
    </div>
  `;

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[friends-email-dev]", { to: input.to, code: input.code, magicUrl: input.magicUrl });
      return { id: "dev-log" };
    }
    throw new Error("email_not_configured");
  }

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from: fromAddress(),
    to: input.to,
    subject,
    text,
    html,
  });
  if (result.error) {
    console.error("resend send failed", result.error);
    throw new Error("email_send_failed");
  }
  return result.data;
}
