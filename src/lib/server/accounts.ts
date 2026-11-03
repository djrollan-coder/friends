import { createUser, findUserByEmail, toAuthUser, verifyPassword, type UserRow } from "./auth";
import { getSetting } from "./appSettings";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function registerAccount(input: {
  name?: string;
  email?: string;
  password?: string;
}): { user: ReturnType<typeof toAuthUser>; row: UserRow } {
  const name = input.name?.trim() ?? "";
  const email = input.email?.trim().toLowerCase() ?? "";
  const password = input.password ?? "";
  if (!EMAIL_RE.test(email)) throw new Error("invalid_email");
  if (getSetting("registration", "1") === "0") throw new Error("registration_closed");
  if (password.length < 6) throw new Error("weak_password");
  if (name.length < 2) throw new Error("weak_name");
  if (findUserByEmail(email)) throw new Error("exists");
  const row = createUser({ name, email, password, method: "email" });
  return { user: toAuthUser(row), row };
}

export function loginAccount(input: { email?: string; password?: string }) {
  const email = input.email?.trim().toLowerCase() ?? "";
  const password = input.password ?? "";
  if (!EMAIL_RE.test(email)) throw new Error("invalid_email");
  if (getSetting("registration", "1") === "0") throw new Error("registration_closed");
  const row = findUserByEmail(email);
  if (!row || !verifyPassword(password, row.password_hash)) {
    throw new Error("invalid_credentials");
  }
  if (Number(row.banned) !== 0) throw new Error("banned");
  return { user: toAuthUser(row), row };
}
