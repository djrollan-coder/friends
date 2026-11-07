import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(254)
  .email();

export const passwordSchema = z
  .string()
  .min(8, "weak_password")
  .max(128, "weak_password");

export const nameSchema = z.string().trim().min(2, "weak_name").max(80, "weak_name");

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const registerBodySchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const emailStartBodySchema = z.object({
  email: emailSchema,
  name: z.string().trim().max(80).optional(),
  mode: z.enum(["login", "register"]).optional(),
});

export const emailVerifyBodySchema = z
  .object({
    email: emailSchema,
    code: z.string().trim().min(4).max(12).optional(),
    token: z.string().trim().min(16).max(512).optional(),
  })
  .refine((v) => Boolean(v.code || v.token), { message: "invalid_body" });

export const reportBodySchema = z.object({
  targetType: z.enum(["post", "user"]).default("post"),
  targetId: z.string().trim().min(1).max(64),
  reason: z.string().trim().max(300).optional().default(""),
});

export const postBodySchema = z.object({
  text: z.string().trim().max(8000).optional().default(""),
  groupId: z.string().trim().max(64).nullable().optional(),
  image: z.string().trim().max(500).nullable().optional(),
  video: z.string().trim().max(500).nullable().optional(),
  attachment: z
    .object({
      name: z.string().trim().max(200).optional(),
      size: z.union([z.string(), z.number()]).optional(),
      url: z.string().trim().max(500).optional(),
      type: z.string().trim().max(120).optional(),
    })
    .nullable()
    .optional(),
  repostOf: z.string().trim().max(64).nullable().optional(),
});

export const messageBodySchema = z.object({
  text: z.string().trim().min(1).max(4000),
  silent: z.boolean().optional(),
});

export const profileBodySchema = z
  .object({
    name: nameSchema.optional(),
    status: z.string().trim().max(140).optional(),
    about: z.string().trim().max(2000).optional(),
    city: z.string().trim().max(80).optional(),
    birthday: z.string().trim().max(32).optional(),
    relationship: z.string().trim().max(80).optional(),
    photoUrl: z.string().trim().max(500).nullable().optional(),
    coverUrl: z.string().trim().max(500).nullable().optional(),
    privacyWall: z.enum(["public", "friends", "private"]).optional(),
  })
  .strict();

export function parseBody<T>(schema: z.ZodType<T>, raw: unknown): T {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    const code = issue?.message;
    if (code && /^[a-z_]+$/.test(code)) throw new Error(code);
    throw new Error("invalid_body");
  }
  return result.data;
}
