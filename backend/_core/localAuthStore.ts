import fs from "node:fs";
import path from "node:path";
import { pbkdf2Sync, randomBytes } from "node:crypto";

type LocalAuthUser = {
  email: string;
  name: string;
  openId: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
};

type LocalAuthData = {
  users: LocalAuthUser[];
};

const DATA_DIR = path.resolve(import.meta.dirname, "..", "..", ".local-auth");
const DATA_FILE = path.resolve(DATA_DIR, "users.json");

function ensureStore(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    const initial: LocalAuthData = { users: [] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), "utf-8");
  }
}

function readStore(): LocalAuthData {
  ensureStore();
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw) as LocalAuthData;
    if (!Array.isArray(parsed.users)) {
      return { users: [] };
    }
    return parsed;
  } catch {
    return { users: [] };
  }
}

function writeStore(data: LocalAuthData): void {
  ensureStore();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function derivePasswordHash(password: string, salt: string): string {
  return pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
}

export function findLocalAuthUser(email: string): LocalAuthUser | null {
  const normalized = normalizeEmail(email);
  const data = readStore();
  return data.users.find(user => user.email === normalized) ?? null;
}

export function createLocalAuthUser(params: {
  email: string;
  password: string;
  name: string;
}): LocalAuthUser {
  const email = normalizeEmail(params.email);
  const existing = findLocalAuthUser(email);
  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  const salt = randomBytes(16).toString("hex");
  const passwordHash = derivePasswordHash(params.password, salt);
  const user: LocalAuthUser = {
    email,
    name: params.name.trim(),
    openId: `local:${email}`,
    salt,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  const data = readStore();
  data.users.push(user);
  writeStore(data);
  return user;
}

export function verifyLocalAuthUser(params: {
  email: string;
  password: string;
}): LocalAuthUser | null {
  const user = findLocalAuthUser(params.email);
  if (!user) {
    return null;
  }
  const hash = derivePasswordHash(params.password, user.salt);
  return hash === user.passwordHash ? user : null;
}

/** Returns public-safe info for all registered local-auth users. */
export function getAllLocalAuthUsers(): Array<{ openId: string; name: string; email: string }> {
  const data = readStore();
  return data.users.map(({ openId, name, email }) => ({ openId, name, email }));
}
