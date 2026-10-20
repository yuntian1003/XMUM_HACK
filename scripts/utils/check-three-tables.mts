import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb } from "../../backend/db";

async function main() {
  const db = await getDb();
  if (!db) {
    console.log("DB unavailable");
    return;
  }

  const tables = ["fuzzy_states", "macro_indicators", "manual_baselines"] as const;
  for (const table of tables) {
    const result = await db.execute(sql.raw(`SELECT COUNT(*) AS c FROM ${table}`));
    const rows = Array.isArray(result)
      ? (Array.isArray(result[0]) ? result[0] : result)
      : ((result as { rows?: unknown[] }).rows ?? []);
    const row = (rows as Array<Record<string, unknown>>)[0] ?? {};
    console.log(`${table}:`, row);
  }

  const fuzzyResult = await db.execute(sql`SELECT * FROM fuzzy_states ORDER BY computed_at DESC LIMIT 1`);
  const fuzzyRows = Array.isArray(fuzzyResult)
    ? (Array.isArray(fuzzyResult[0]) ? fuzzyResult[0] : fuzzyResult)
    : ((fuzzyResult as { rows?: unknown[] }).rows ?? []);
  const latest = (fuzzyRows as Array<Record<string, unknown>>)[0] ?? null;
  console.log("latest fuzzy row keys:", latest ? Object.keys(latest) : []);
  console.log("latest fuzzy row:", latest);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
