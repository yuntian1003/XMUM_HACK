import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb } from "../../backend/db";

type Row = Record<string, unknown>;

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function main() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database unavailable");
  }

  const [fuelResult, cfsrResult] = await Promise.all([
    db.execute(sql`
      SELECT date, ron95, ron97, diesel
      FROM fuel_prices
      ORDER BY date DESC
      LIMIT 1
    `),
    db.execute(sql`
      SELECT computed_at, cfsr, score_confidence, score_coverage, components
      FROM cfsr_snapshots
      ORDER BY computed_at DESC
      LIMIT 1
    `),
  ]);

  const fuelRows = Array.isArray(fuelResult)
    ? (Array.isArray(fuelResult[0]) ? fuelResult[0] : fuelResult)
    : ((fuelResult as { rows?: unknown[] }).rows ?? []);
  const cfsrRows = Array.isArray(cfsrResult)
    ? (Array.isArray(cfsrResult[0]) ? cfsrResult[0] : cfsrResult)
    : ((cfsrResult as { rows?: unknown[] }).rows ?? []);

  const fuel = (fuelRows as Row[])[0] ?? null;
  const cfsr = (cfsrRows as Row[])[0] ?? null;

  if (!fuel) {
    throw new Error("No fuel_prices rows found to seed macro_indicators");
  }
  if (!cfsr) {
    throw new Error("No cfsr_snapshots rows found to seed manual_baselines");
  }

  const fuelDate = toDate(fuel.date) ?? new Date();
  const fuelDateSql = fuelDate.toISOString().slice(0, 10);
  const ron95 = toNumber(fuel.ron95);
  const ron97 = toNumber(fuel.ron97);
  const diesel = toNumber(fuel.diesel);

  const macroRows: Array<{ id: string; sourceId: string; date: string; indicatorType: string; baseCurrency: string | null; targetCurrency: string | null; coicopCode: string | null; value: number }> = [];
  if (ron95 !== null) {
    macroRows.push({ id: `fuel_prices_fuel_ron95_${fuelDateSql}`, sourceId: "fuel_prices", date: fuelDateSql, indicatorType: "fuel_ron95", baseCurrency: "MYR", targetCurrency: "L", coicopCode: null, value: ron95 });
  }
  if (ron97 !== null) {
    macroRows.push({ id: `fuel_prices_fuel_ron97_${fuelDateSql}`, sourceId: "fuel_prices", date: fuelDateSql, indicatorType: "fuel_ron97", baseCurrency: "MYR", targetCurrency: "L", coicopCode: null, value: ron97 });
  }
  if (diesel !== null) {
    macroRows.push({ id: `fuel_prices_fuel_diesel_${fuelDateSql}`, sourceId: "fuel_prices", date: fuelDateSql, indicatorType: "fuel_diesel", baseCurrency: "MYR", targetCurrency: "L", coicopCode: null, value: diesel });
  }

  const cfsrDate = toDate(cfsr.computed_at) ?? new Date();
  const reviewedAt = cfsrDate.toISOString().slice(0, 19).replace("T", " ");
  const cfsrValue = toNumber(cfsr.cfsr);
  const confidence = toNumber(cfsr.score_confidence);
  const coverage = toNumber(cfsr.score_coverage);
  const components = (() => {
    const raw = cfsr.components;
    if (!raw) return null;
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    if (typeof raw === "object") return raw as Record<string, unknown>;
    return null;
  })();

  const manualRows: Array<{ key: string; value: number; reviewedAt: string }> = [];
  if (cfsrValue !== null) manualRows.push({ key: "baseline_cfsr", value: cfsrValue, reviewedAt });
  if (confidence !== null) manualRows.push({ key: "baseline_confidence", value: confidence, reviewedAt });
  if (coverage !== null) manualRows.push({ key: "baseline_coverage", value: coverage, reviewedAt });

  if (components) {
    const componentMap: Array<[string, unknown]> = [
      ["baseline_n1_import_dependency", components.n1ImportDependency],
      ["baseline_n2_supply_chain_health", components.n2SupplyChainHealth],
      ["baseline_n3_fertilizer_availability", components.n3FertilizerAvailability],
      ["baseline_n4_geopolitical_risk", components.n4GeopoliticalRisk],
      ["baseline_n5_price_volatility", components.n5PriceVolatility],
    ];

    for (const [key, value] of componentMap) {
      const numeric = toNumber(value);
      if (numeric !== null) {
        manualRows.push({ key, value: numeric, reviewedAt });
      }
    }
  }

  for (const row of macroRows) {
    await db.execute(sql`
      INSERT INTO macro_indicators (id, source_id, date, indicator_type, base_currency, target_currency, coicop_code, value)
      VALUES (${row.id}, ${row.sourceId}, ${row.date}, ${row.indicatorType}, ${row.baseCurrency}, ${row.targetCurrency}, ${row.coicopCode}, ${row.value})
      ON DUPLICATE KEY UPDATE
        base_currency = VALUES(base_currency),
        target_currency = VALUES(target_currency),
        coicop_code = VALUES(coicop_code),
        value = VALUES(value)
    `);
  }

  for (const row of manualRows) {
    await db.execute(sql`
      INSERT INTO manual_baselines (\`key\`, value, reviewed_at)
      VALUES (${row.key}, ${row.value}, ${row.reviewedAt})
      ON DUPLICATE KEY UPDATE
        value = VALUES(value),
        reviewed_at = VALUES(reviewed_at)
    `);
  }

  console.log(JSON.stringify({ seededMacroRows: macroRows.length, seededManualRows: manualRows.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
