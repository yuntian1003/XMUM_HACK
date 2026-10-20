import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb } from "../../backend/db";

async function main() {
  const db = await getDb();
  if (!db) {
    console.log("DB unavailable");
    return;
  }

  const countResult = await db.execute(sql`SELECT COUNT(*) AS c FROM fx_rates`);
  const countRows = Array.isArray(countResult)
    ? (Array.isArray(countResult[0]) ? countResult[0] : countResult)
    : ((countResult as { rows?: unknown[] }).rows ?? []);
  console.log("fx_rates count:", (countRows as Array<Record<string, unknown>>)[0] ?? null);

  const latestResult = await db.execute(sql`SELECT * FROM fx_rates ORDER BY date DESC LIMIT 1`);
  const latestRows = Array.isArray(latestResult)
    ? (Array.isArray(latestResult[0]) ? latestResult[0] : latestResult)
    : ((latestResult as { rows?: unknown[] }).rows ?? []);
  console.log("latest fx row:", (latestRows as Array<Record<string, unknown>>)[0] ?? null);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
