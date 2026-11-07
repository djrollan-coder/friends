import { createUser, findUserByEmail, toAuthUser, verifyPassword, type UserRow } from "./auth";
import { getSetting } from "./appSettings";
import {
  emailSchema,
  nameSchema,
  parseBody,
  passwordSchema,
  loginBodySchema,
  registerBodySchema,
} from "./validation";

export function registerAccount(input: {
  name?: string;
  email?: string;
  password?: string;
}): { user: ReturnType<typeof toAuthUser>; row: UserRow } {
  const { name, email, password } = parseBody(registerBodySchema, {
    name: input.name,
    email: input.email,
    password: input.password,
  });
  if (getSetting("registration", "1") === "0") throw new Error("registration_closed");
  if (findUserByEmail(email)) throw new Error("exists");
  const row = createUser({ name, email, password, method: "email" });
  return { user: toAuthUser(row), row };
}

export function loginAccount(input: { email?: string; password?: string }) {
  const { email, password } = parseBody(loginBodySchema, input);
  // Extra belt: never compare plaintext columns — only scrypt hashes.
  emailSchema.parse(email);
  if (password.length < 1) throw new Error("invalid_credentials");
  const row = findUserByEmail(email);
  if (!row || !row.password_hash || !verifyPassword(password, row.password_hash)) {
    throw new Error("invalid_credentials");
  }
  if (Number(row.banned) !== 0) throw new Error("banned");
  return { user: toAuthUser(row), row };
}

/** Re-export for callers that need the same rules. */
export const authFieldSchemas = { emailSchema, nameSchema, passwordSchema };
