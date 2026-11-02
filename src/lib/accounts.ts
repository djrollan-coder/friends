export const ACCOUNTS_KEY = "friends.accounts.v1";

export type LocalAccount = {
  id: string;
  name: string;
  email: string;
  password: string;
  avatar: string;
};

export function loadAccounts(): LocalAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalAccount[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAccounts(next: LocalAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(next));
}

export function registerAccount(input: {
  name: string;
  email: string;
  password: string;
}): LocalAccount | { error: string } {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const password = input.password;
  if (!email.includes("@")) return { error: "invalid_email" };
  if (password.length < 4) return { error: "weak_password" };
  if (name.length < 2) return { error: "weak_name" };
  const accounts = loadAccounts();
  if (accounts.some((a) => a.email === email)) return { error: "exists" };
  const account: LocalAccount = {
    id: `u_${Date.now()}`,
    name,
    email,
    password,
    avatar: name
      .split(/\s+/)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
  };
  saveAccounts([account, ...accounts]);
  return account;
}

export function findAccount(email: string, password: string) {
  return loadAccounts().find(
    (a) => a.email === email.trim().toLowerCase() && a.password === password,
  );
}
