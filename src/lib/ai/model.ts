import { gateway } from "ai";

const MODEL_ID = process.env.FRIENDS_AI_MODEL?.trim() || "openai/gpt-4o-mini";

/** Default model via Vercel AI Gateway (OIDC on Vercel, AI_GATEWAY_API_KEY locally). */
export const FRIENDS_AI_MODEL = gateway(MODEL_ID);

export function aiConfigured() {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY?.trim() ||
      process.env.VERCEL_OIDC_TOKEN?.trim() ||
      process.env.VERCEL === "1",
  );
}
