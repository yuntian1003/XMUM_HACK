import dotenv from "dotenv";
import path from "node:path";

// Preload environment variables before the rest of the backend modules import `ENV`.
// This is required because ESM imports are evaluated before `index.ts` top-level code runs.
const isBundledDist = path.basename(import.meta.dirname) === "dist";
const rootEnvPath = isBundledDist
  ? path.resolve(import.meta.dirname, "..", ".env")
  : path.resolve(import.meta.dirname, "..", "..", ".env");
const backendEnvPath = isBundledDist
  ? path.resolve(import.meta.dirname, "..", "backend", ".env")
  : path.resolve(import.meta.dirname, "..", ".env");

dotenv.config({ path: rootEnvPath });
dotenv.config({ path: backendEnvPath });

