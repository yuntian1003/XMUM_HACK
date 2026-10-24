import { pbkdf2Sync, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { localAuthUsers, type LocalAuthUserRow } from "../drizzle/schema";

export type LocalAuthUser = {
  email: string;
  name: string;
  openId: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
};

// Seed fallback users in case DB has not been seeded yet or for offline dev
const DEFAULT_SEEDED_USERS: LocalAuthUser[] = [
  {
    email: "yuntian1003@gmail.com",
    name: "Tang Yun Tian",
    openId: "local:yuntian1003@gmail.com",
    salt: "524be8e50b8591f34365e9f44ab313a8",
    passwordHash:
      "f2e8addf91e7842e918dfb34715ed44b03df57331e72e49641ee6a15a992de44aac9c61324924973745b512c42795ae5b78cb876b479e8ecbb9624457055a42f",
    createdAt: "2026-10-22T07:06:17.179Z",
  },
  {
    email: "cheongwx05@gmail.com",
    name: "Wen Xuan Cheong",
    openId: "local:cheongwx05@gmail.com",
    salt: "6cf2ce6f190819a6bae95763a2c6984b",
    passwordHash:
      "8115eead7395c0cc4d03b41e01730f3bb0c76ccb6873d03d73b560c840a3eab4528420d14484a146ebeaf860574f2773bf02366a822da81a0280170861f8b6a0",
    createdAt: "2026-10-22T16:09:32.463Z",
  },
];

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function derivePasswordHash(password: string, salt: string): string {
  return pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
}

function rowToUser(row: LocalAuthUserRow): LocalAuthUser {
  return {
    email: row.email,
    name: row.name,
    openId: row.openId,
    salt: row.salt,
    passwordHash: row.passwordHash,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
  };
}

export async function findLocalAuthUser(email: string): Promise<LocalAuthUser | null> {
  const normalized = normalizeEmail(email);
  const db = await getDb();
  if (db) {
    try {
      const rows = await db
        .select()
        .from(localAuthUsers)
        .where(eq(localAuthUsers.email, normalized))
        .limit(1);
      if (rows.length > 0) {
        return rowToUser(rows[0]);
      }
    } catch (err) {
      console.warn("[LocalAuth] DB lookup failed, falling back to seeded accounts:", err);
    }
  }

  // Fallback to seeded accounts if DB is unavailable or lookup errored
  return DEFAULT_SEEDED_USERS.find((u) => u.email.toLowerCase() === normalized) ?? null;
}

export async function createLocalAuthUser(params: {
  email: string;
  password: string;
  name: string;
}): Promise<LocalAuthUser> {
  const email = normalizeEmail(params.email);
  const existing = await findLocalAuthUser(email);
  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  const salt = randomBytes(16).toString("hex");
  const passwordHash = derivePasswordHash(params.password, salt);
  const openId = `local:${email}`;
  const trimmedName = params.name.trim();

  const db = await getDb();
  if (!db) {
    throw new Error("Database is not connected. Cannot register new user.");
  }

  const [inserted] = await db
    .insert(localAuthUsers)
    .values({
      email,
      name: trimmedName,
      openId,
      salt,
      passwordHash,
    })
    .returning();

  if (inserted) {
    return rowToUser(inserted);
  }

  return {
    email,
    name: trimmedName,
    openId,
    salt,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
}

export async function verifyLocalAuthUser(params: {
  email: string;
  password: string;
}): Promise<LocalAuthUser | null> {
  const user = await findLocalAuthUser(params.email);
  if (!user) {
    return null;
  }
  const hash = derivePasswordHash(params.password, user.salt);
  return hash === user.passwordHash ? user : null;
}

/** Returns public-safe info for all registered local-auth users. */
export async function getAllLocalAuthUsers(): Promise<Array<{ openId: string; name: string; email: string }>> {
  const db = await getDb();
  if (db) {
    try {
      const rows = await db
        .select({
          openId: localAuthUsers.openId,
          name: localAuthUsers.name,
          email: localAuthUsers.email,
        })
        .from(localAuthUsers);
      if (rows.length > 0) {
        return rows;
      }
    } catch (err) {
      console.warn("[LocalAuth] Failed to load users from DB:", err);
    }
  }

  return DEFAULT_SEEDED_USERS.map(({ openId, name, email }) => ({ openId, name, email }));
}
