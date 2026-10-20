import { eq, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "mysql2/promise";
import {
  users, scans, newsItems, riskScores, fxSnapshots,
  type InsertUser, type InsertScan, type Scan,
} from "./drizzle/schema";
import { ENV } from './_core/env';
import {
  getFallbackWorldBankPriceDashboard,
  getFallbackWorldBankCommodityDashboard,
} from "./integrations/foodmonitor/fallbackData";

let _db: any = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = createPool({
        uri: process.env.DATABASE_URL,
        ssl: {
          minVersion: "TLSv1.2",
          rejectUnauthorized: true,
        },
      });
      _db = drizzle(pool as any);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ── User helpers ──────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }

}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ── Tier 1: Scan helpers ──────────────────────────────────────────────────────

export async function insertScan(scan: InsertScan): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(scans).values(scan);
}

export async function getScanByLocalId(userId: number, localId: string): Promise<Scan | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(scans)
    .where(and(eq(scans.userId, userId), eq(scans.localId, localId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getScansByUser(userId: number, limit = 100): Promise<Scan[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scans).where(eq(scans.userId, userId)).orderBy(desc(scans.scannedAt)).limit(limit);
}

export async function getScanStats(userId: number) {
  const db = await getDb();
  if (!db) return { total: 0, byDisease: {} as Record<string, number>, bySeverity: {} as Record<string, number> };
  const rows = await db.select().from(scans).where(eq(scans.userId, userId));
  const byDisease: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  for (const row of rows) {
    const dk = row.diseaseKey ?? "unknown";
    const sv = row.severity ?? "unknown";
    byDisease[dk] = (byDisease[dk] ?? 0) + 1;
    bySeverity[sv] = (bySeverity[sv] ?? 0) + 1;
  }
  return { total: rows.length, byDisease, bySeverity };
}

export type DashboardNewsRecord = {
  id: string | number;
  headline: string;
  summary: string | null;
  source: string | null;
  url: string | null;
  category: string;
  impactScore: number | null;
  sentimentScore: number | null;
  severity: string | null;
  sentimentSide: string | null;
  affectedCountries: unknown;
  affectedCommodities: unknown;
  publishedAt: Date | string;
};

export type DashboardRiskRecord = {
  score: number;
  band: "LOW" | "MODERATE" | "HIGH";
  date: string;
  country: string | null;
  source: "cfsr_snapshots" | "risk_scores" | "risk_snapshots" | "derived_scans" | "derived_news";
  snapshotAt?: string | null;
  confidence?: number | null;
  coverage?: number | null;
  profileData?: unknown;
  components?: {
    n1?: number | null;
    n2?: number | null;
    n3?: number | null;
    n4?: number | null;
    n5?: number | null;
  };
};

export type DashboardRiskDashboard = {
  current: DashboardRiskRecord | null;
  history: DashboardRiskRecord[];
  source: DashboardRiskRecord["source"] | null;
};

export type DashboardFuzzyStateRecord = {
  fertilizerPressureState: string | null;
  priceTrendState: string | null;
  compoundState: string | null;
  score: number | null;
  confidence: number | null;
  coverage: number | null;
  snapshotAt: string | null;
};

export type DashboardFuzzyStateDashboard = {
  current: DashboardFuzzyStateRecord | null;
  history: DashboardFuzzyStateRecord[];
  source: "fuzzy_states" | null;
};

export type DashboardAiAnalysisRecord = {
  id: string;
  title: string;
  summary: string | null;
  recommendation: string | null;
  riskLevel: string | null;
  confidence: number | null;
  commodity: string | null;
  model: string | null;
  generatedAt: string | null;
};

export type DashboardAiAnalysisDashboard = {
  current: DashboardAiAnalysisRecord | null;
  history: DashboardAiAnalysisRecord[];
  source: "ai_analyses" | null;
};

export type DashboardFxRate = {
  currency: string;
  date: string;
  rate: number;
  buyingRate: number | null;
  middleRate: number | null;
  sellingRate: number | null;
  previousRate: number | null;
  changePct: number | null;
  history: Array<{
    date: string;
    buyingRate: number;
    middleRate: number | null;
    sellingRate: number | null;
  }>;
};

export type DashboardFxDashboard = {
  rates: DashboardFxRate[];
  lastUpdated: string | null;
  source: "live_bnm_api" | null;
};

export type DashboardFuelPoint = {
  date: string;
  ron95: number | null;
  ron97: number | null;
  diesel: number | null;
  ron95Budi95: number | null;
  dieselEastMsia: number | null;
};

export type DashboardFuelDashboard = {
  latest: DashboardFuelPoint | null;
  previous: DashboardFuelPoint | null;
  history: DashboardFuelPoint[];
  changePct: {
    ron95: number | null;
    ron97: number | null;
    diesel: number | null;
  };
  source: "fuel_prices" | null;
};

export type DashboardWorldBankPricePoint = {
  date: string;
  priceUsd: number;
};

export type DashboardWorldBankPriceSeries = {
  commodityCode: string;
  commodityLabel: string | null;
  category: string | null;
  subcategory: string | null;
  unit: string | null;
  sourceUrl: string | null;
  workbookUpdatedAt: string | null;
  latestPriceUsd: number;
  previousPriceUsd: number | null;
  latestDate: string;
  changePct: number | null;
  history: DashboardWorldBankPricePoint[];
};

export type DashboardWorldBankPriceDashboard = {
  series: DashboardWorldBankPriceSeries[];
  lastUpdated: string | null;
  source: "worldbank_prices" | "commodity_prices" | null;
};

export type DashboardWorldBankCommodity = {
  commodityCode: string;
  label: string;
  category: string | null;
  unit: string | null;
};

export type DashboardWorldBankCommodityDashboard = {
  commodities: DashboardWorldBankCommodity[];
  source: "worldbank_commodities" | "commodity_prices" | null;
};

export type DashboardPriceCatcherObservation = {
  date: string;
  itemCode: string;
  itemName: string;
  unit: string | null;
  category: string | null;
  premiseCode: string;
  premise: string;
  premiseType: string | null;
  state: string | null;
  district: string | null;
  price: number;
};

export type DashboardPriceCatcherItem = {
  itemCode: string;
  itemName: string;
  unit: string | null;
  category: string | null;
  latestDate: string;
  latestPrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  observations: number;
  stateCount: number;
  districtCount: number;
  cheapestState: string | null;
  cheapestDistrict: string | null;
  priciestState: string | null;
  priciestDistrict: string | null;
  stateSpreadPct: number | null;
};

export type DashboardPriceCatcherState = {
  state: string;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  observations: number;
  itemCount: number;
  cheapestItem: string | null;
  priciestItem: string | null;
};

export type DashboardPriceCatcherDashboard = {
  month: string | null;
  source: "pricecatcher_prices" | "live_pricecatcher_api" | null;
  lastUpdated: string | null;
  observations: DashboardPriceCatcherObservation[];
  items: DashboardPriceCatcherItem[];
  states: DashboardPriceCatcherState[];
};

type PriceCatcherItemLookup = {
  itemCode: string;
  itemName: string;
  unit: string | null;
  category: string | null;
};

type PriceCatcherPremiseLookup = {
  premiseCode: string;
  premise: string | null;
  address: string | null;
  premiseType: string | null;
  state: string | null;
  district: string | null;
};


export type DashboardMacroIndicatorPoint = {
  date: string;
  type: string;
  value: number;
  baseCurrency: string | null;
  targetCurrency: string | null;
};

export type DashboardMacroIndicatorDashboard = {
  current: DashboardMacroIndicatorPoint | null;
  history: DashboardMacroIndicatorPoint[];
  source: "macro_indicators" | "fx_rates" | "fuel_prices" | null;
};

export type DashboardManualBaselinePoint = {
  key: string;
  value: number;
  reviewedAt: string | null;
};

export type DashboardManualBaselineDashboard = {
  current: DashboardManualBaselinePoint[];
  source: "manual_baselines" | "cfsr_snapshots" | null;
};

type PriceCatcherRawObservation = {
  date: string;
  premiseCode: string;
  itemCode: string;
  price: number;
};
const PRICECATCHER_CACHE_TTL_MS = 30 * 60_000;
const priceCatcherMonthCache = new Map<string, { fetchedAt: number; rawRows: PriceCatcherRawObservation[] }>();
const priceCatcherLookupCache = new Map<string, { fetchedAt: number; rows: Map<string, PriceCatcherItemLookup | PriceCatcherPremiseLookup> }>();

function parseCsv(text: string, maxRows?: number): Array<Record<string, string>> {
  const cleaned = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let index = 0; index < cleaned.length; index += 1) {
    const char = cleaned[index];
    const next = cleaned[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        currentField += '"';
        index += 1;
        continue;
      }
      if (char === '"') {
        inQuotes = false;
        continue;
      }
      currentField += char;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if (char === '\n') {
      currentRow.push(currentField);
      if (currentRow.some((value) => value.trim() !== "")) rows.push(currentRow);
      if (maxRows && rows.length > maxRows) break;
      currentRow = [];
      currentField = "";
      continue;
    }

    if (char === '\r') continue;
    currentField += char;
  }

  currentRow.push(currentField);
  if (currentRow.some((value) => value.trim() !== "")) rows.push(currentRow);

  if (rows.length === 0) return [];
  const headers = rows.shift() ?? [];
  return rows.map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header.trim()] = (row[index] ?? "").trim();
    });
    return record;
  });
}

function normalizeCode(value: unknown): string {
  const raw = String(value ?? "").trim();
  return raw.replace(/\.0+$/, "");
}

function parseMonthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function minNumber(values: number[]): number {
  let result = Number.POSITIVE_INFINITY;
  for (const value of values) {
    if (value < result) result = value;
  }
  return result;
}

function maxNumber(values: number[]): number {
  let result = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (value > result) result = value;
  }
  return result;
}

async function fetchPriceCatcherLookup(url: string, cacheKey: "item" | "premise") {
  const cached = priceCatcherLookupCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < PRICECATCHER_CACHE_TTL_MS) {
    return cached.rows;
  }

  const res = await fetch(url, { headers: { Accept: "text/csv" } });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const rows = parseCsv(await res.text());
  const map = new Map<string, PriceCatcherItemLookup | PriceCatcherPremiseLookup>();

  for (const row of rows) {
    if (cacheKey === "item") {
      const itemCode = normalizeCode(row.item_code ?? row.itemCode ?? row.code);
      if (!itemCode) continue;
      map.set(itemCode, {
        itemCode,
        itemName: String(row.item_name ?? row.itemName ?? row.item ?? row.name ?? itemCode).trim(),
        unit: row.unit == null || String(row.unit).trim() === "" ? null : String(row.unit).trim(),
        category: row.item_category == null
          ? (row.category == null || String(row.category).trim() === "" ? null : String(row.category).trim())
          : String(row.item_category).trim(),
      });
    } else {
      const premiseCode = normalizeCode(row.premise_code ?? row.premiseCode ?? row.code);
      if (!premiseCode) continue;
      map.set(premiseCode, {
        premiseCode,
        premise: row.premise == null || String(row.premise).trim() === "" ? null : String(row.premise).trim(),
        address: row.address == null || String(row.address).trim() === "" ? null : String(row.address).trim(),
        premiseType: row.premise_type == null || String(row.premise_type).trim() === "" ? null : String(row.premise_type).trim(),
        state: row.state == null || String(row.state).trim() === "" ? null : String(row.state).trim(),
        district: row.district == null || String(row.district).trim() === "" ? null : String(row.district).trim(),
      });
    }
  }

  priceCatcherLookupCache.set(cacheKey, { fetchedAt: Date.now(), rows: map });
  return map;
}

async function fetchPriceCatcherMonth(monthKey: string, maxRows = 0): Promise<PriceCatcherRawObservation[]> {
  const shouldUseCache = maxRows > 0;
  const cached = shouldUseCache ? priceCatcherMonthCache.get(monthKey) : undefined;
  if (cached && Date.now() - cached.fetchedAt < PRICECATCHER_CACHE_TTL_MS) {
    return cached.rawRows.slice(0, maxRows);
  }

  const url = `https://storage.data.gov.my/pricecatcher/pricecatcher_${monthKey}.csv`;
  const res = await fetch(url, { headers: { Accept: "text/csv" } });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);

  const rows = parseCsv(await res.text(), maxRows > 0 ? maxRows + 1 : undefined)
    .map((row) => ({
      date: String(row.date ?? "").trim(),
      premiseCode: normalizeCode(row.premise_code ?? row.premiseCode),
      itemCode: normalizeCode(row.item_code ?? row.itemCode),
      price: Number(row.price ?? NaN),
    }))
    .filter((row) => row.date && row.premiseCode && row.itemCode && Number.isFinite(row.price));

  if (shouldUseCache) {
    priceCatcherMonthCache.set(monthKey, { fetchedAt: Date.now(), rawRows: rows });
  }
  return maxRows > 0 ? rows.slice(0, maxRows) : rows;
}

function buildPriceCatcherMonthSequence(months: number): string[] {
  const result: string[] = [];
  const current = new Date();
  current.setUTCDate(1);
  current.setUTCHours(0, 0, 0, 0);

  for (let offset = 0; offset < months; offset += 1) {
    const monthDate = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - offset, 1));
    result.push(parseMonthKey(monthDate));
  }

  return result;
}

function normalizeRiskBand(value: unknown): "LOW" | "MODERATE" | "HIGH" {
  const band = String(value ?? "").toLowerCase();
  if (band === "low") return "LOW";
  if (band === "moderate" || band === "medium") return "MODERATE";
  return "HIGH";
}

function getRecordValue(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined) return row[key];
  }
  return undefined;
}

function getNumberValue(row: Record<string, unknown>, keys: string[]): number | null {
  const raw = getRecordValue(row, keys);
  if (raw === undefined || raw === null || raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function getStringValue(row: Record<string, unknown>, keys: string[]): string | null {
  const raw = getRecordValue(row, keys);
  if (raw === undefined || raw === null) return null;
  const value = String(raw).trim();
  return value.length > 0 ? value : null;
}

function getDateValue(row: Record<string, unknown>, keys: string[]): Date | null {
  const raw = getRecordValue(row, keys);
  if (raw === undefined || raw === null) return null;
  const date = new Date(String(raw));
  return Number.isNaN(date.getTime()) ? null : date;
}

function mapRiskScoreRow(row: any): DashboardRiskRecord {
  const normalizedRow = row as Record<string, unknown>;
  const snapshotAt = getDateValue(normalizedRow, ["snapshotAt", "snapshot_at", "computedAt", "computed_at"]);
  return {
    score: Number(row.scrsScore ?? row.cfsr ?? 0),
    band: normalizeRiskBand(row.riskLevel ?? row.band),
    date: (snapshotAt ?? new Date()).toLocaleDateString("en-GB"),
    country: row.country == null ? null : String(row.country),
    source: row.cfsr !== undefined ? "risk_snapshots" : "risk_scores",
    snapshotAt: snapshotAt ? snapshotAt.toISOString() : null,
    confidence: getNumberValue(normalizedRow, ["confidence"]),
    coverage: getNumberValue(normalizedRow, ["coverage"]),
    profileData: row.profileData,
    components: row.cfsr !== undefined
      ? {
          n1: row.n1ImportDep ?? null,
          n2: row.n2SupplyChain ?? null,
          n3: row.n3Fertilizer ?? null,
          n4: row.n4Geopolitical ?? null,
          n5: row.n5PriceVol ?? null,
        }
      : undefined,
  };
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function calculateScanRisk(scans: Scan[]) {
  const total = scans.length;
  if (total === 0) return null;

  const diseased = scans.filter((scan) => scan.severity && scan.severity !== "healthy").length;
  const severe = scans.filter((scan) => scan.severity === "severe").length;
  const score = clampScore(100 - (diseased / total) * 75 - (severe / total) * 50);

  return {
    score,
    band: score >= 70 ? ("LOW" as const) : score >= 40 ? ("MODERATE" as const) : ("HIGH" as const),
  };
}

function buildScanRiskHistory(scanRows: Scan[], limit: number): DashboardRiskRecord[] {
  const byDay = new Map<string, Scan[]>();

  for (const scan of scanRows) {
    const date = new Date(scan.scannedAt);
    if (Number.isNaN(date.getTime())) continue;
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    const key = day.toISOString();
    const bucket = byDay.get(key) ?? [];
    bucket.push(scan);
    byDay.set(key, bucket);
  }

  return Array.from(byDay.entries())
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .slice(-limit)
    .map(([dayKey, items]) => {
      const risk = calculateScanRisk(items);
      return {
        score: risk?.score ?? 0,
        band: risk?.band ?? "HIGH",
        date: new Date(dayKey).toLocaleDateString("en-GB"),
        country: null,
        source: "derived_scans" as const,
        components: {
          n1: items.filter((scan) => scan.severity === "mild").length,
          n2: items.filter((scan) => scan.severity === "moderate").length,
          n3: items.filter((scan) => scan.severity === "severe").length,
          n4: items.filter((scan) => scan.severity === "healthy").length,
          n5: items.length,
        },
      };
    });
}

function calculateNewsRisk(newsRows: DashboardNewsRecord[]) {
  const scored = newsRows.filter((row) => row.impactScore !== null && row.impactScore !== undefined);
  if (scored.length === 0) return null;

  const averageImpact = scored.reduce((sum, row) => sum + Number(row.impactScore ?? 0), 0) / scored.length;
  const score = clampScore(averageImpact * 10);

  return {
    score,
    band: score >= 70 ? ("LOW" as const) : score >= 40 ? ("MODERATE" as const) : ("HIGH" as const),
  };
}

function buildNewsRiskHistory(newsRows: DashboardNewsRecord[], limit: number): DashboardRiskRecord[] {
  const byDay = new Map<string, DashboardNewsRecord[]>();

  for (const news of newsRows) {
    const date = new Date(news.publishedAt);
    if (Number.isNaN(date.getTime())) continue;
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    const key = day.toISOString();
    const bucket = byDay.get(key) ?? [];
    bucket.push(news);
    byDay.set(key, bucket);
  }

  return Array.from(byDay.entries())
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .slice(-limit)
    .map(([dayKey, items]) => {
      const risk = calculateNewsRisk(items);
      return {
        score: risk?.score ?? 0,
        band: risk?.band ?? "HIGH",
        date: new Date(dayKey).toLocaleDateString("en-GB"),
        country: null,
        source: "derived_news" as const,
        components: {
          n1: items.filter((item) => (item.impactScore ?? 0) >= 8).length,
          n2: items.filter((item) => (item.impactScore ?? 0) >= 6 && (item.impactScore ?? 0) < 8).length,
          n3: items.filter((item) => (item.impactScore ?? 0) >= 4 && (item.impactScore ?? 0) < 6).length,
          n4: items.filter((item) => (item.impactScore ?? 0) < 4).length,
          n5: items.length,
        },
      };
    });
}

export async function getRiskDashboard(limit = 30): Promise<DashboardRiskDashboard> {
  const db = await getDb();
  if (!db) return { current: null, history: [], source: null };

  try {
    const cfsrResult = await db.execute(sql`SELECT * FROM cfsr_snapshots ORDER BY computed_at DESC LIMIT ${limit}`);
    const cfsrRows = Array.isArray(cfsrResult)
      ? (Array.isArray(cfsrResult[0]) ? cfsrResult[0] : cfsrResult)
      : ((cfsrResult as { rows?: unknown[] }).rows ?? []);

    const history = (cfsrRows as Array<Record<string, unknown>>)
      .map((row) => {
        const computedAtDate = getDateValue(row, ["computed_at", "computedAt", "snapshot_at", "snapshotAt"]);
        const score = getNumberValue(row, ["cfsr", "score"]);
        const riskBand = getStringValue(row, ["risk_band", "riskBand", "band"]);
        const scoreConfidence = getNumberValue(row, ["score_confidence", "scoreConfidence"]);
        const scoreCoverage = getNumberValue(row, ["score_coverage", "scoreCoverage"]);
        
        // Extract components from JSON
        let n1 = 0, n2 = 0, n3 = 0, n4 = 0, n5 = 0;
        const rawComponents = getRecordValue(row, ["components"]);
        if (rawComponents != null) {
          try {
            const comp = typeof rawComponents === "string" ? JSON.parse(rawComponents) : rawComponents;
            if (comp && typeof comp === "object") {
              n1 = typeof comp.n1ImportDependency === "number" ? comp.n1ImportDependency : 0;
              n2 = typeof comp.n2SupplyChainHealth === "number" ? comp.n2SupplyChainHealth : 0;
              n3 = typeof comp.n3FertilizerAvailability === "number" ? comp.n3FertilizerAvailability : 0;
              n4 = typeof comp.n4GeopoliticalRisk === "number" ? comp.n4GeopoliticalRisk : 0;
              n5 = typeof comp.n5PriceVolatility === "number" ? comp.n5PriceVolatility : 0;
            }
          } catch {
            // Fall back to zeros
          }
        }
        
        return {
          score: score ?? 0,
          band: normalizeRiskBand(riskBand),
          date: (computedAtDate ?? new Date()).toLocaleDateString("en-GB"),
          country: null,
          source: "cfsr_snapshots" as const,
          snapshotAt: computedAtDate ? computedAtDate.toISOString() : null,
          confidence: scoreConfidence ?? null,
          coverage: scoreCoverage ?? null,
          components: {
            n1,
            n2,
            n3,
            n4,
            n5,
          },
        };
      });

    if (history.length > 0) {
      return {
        current: history[0] ?? null,
        history,
        source: "cfsr_snapshots",
      };
    }
  } catch (error) {
    console.warn("[Database] cfsr_snapshots query unavailable:", error);
  }

  try {
    const rows = await db
      .select()
      .from(riskScores)
      .orderBy(desc(riskScores.computedAt))
      .limit(limit);

    if (rows.length > 0) {
      const history = rows.map(mapRiskScoreRow);
      return {
        current: history[0] ?? null,
        history,
        source: "risk_scores",
      };
    }
  } catch (error) {
    console.warn("[Database] risk_scores query unavailable:", error);
  }

  try {
    const compatResult = await db.execute(sql`
      SELECT
        cfsr,
        band,
        n1ImportDep,
        n2SupplyChain,
        n3Fertilizer,
        n4Geopolitical,
        n5PriceVol,
        snapshotAt
      FROM risk_snapshots
      ORDER BY snapshotAt DESC
      LIMIT ${limit}
    `);

    const compatRows = Array.isArray(compatResult)
      ? (Array.isArray(compatResult[0]) ? compatResult[0] : compatResult)
      : ((compatResult as { rows?: unknown[] }).rows ?? []);

    const history = (compatRows as Array<Record<string, unknown>>).map((row) => ({
      score: Number(row.cfsr ?? 0),
      band: normalizeRiskBand(row.band),
      date: new Date(String(row.snapshotAt ?? new Date())).toLocaleDateString("en-GB"),
      country: null,
      source: "risk_snapshots" as const,
      components: {
        n1: row.n1ImportDep == null ? null : Number(row.n1ImportDep),
        n2: row.n2SupplyChain == null ? null : Number(row.n2SupplyChain),
        n3: row.n3Fertilizer == null ? null : Number(row.n3Fertilizer),
        n4: row.n4Geopolitical == null ? null : Number(row.n4Geopolitical),
        n5: row.n5PriceVol == null ? null : Number(row.n5PriceVol),
      },
    }));

    if (history.length > 0) {
      return {
        current: history[0] ?? null,
        history,
        source: "risk_snapshots",
      };
    }
  } catch (error) {
    console.warn("[Database] risk_snapshots compatibility query unavailable:", error);
  }

  return { current: null, history: [], source: null };
}

export async function getFuzzyStateDashboard(limit = 30): Promise<DashboardFuzzyStateDashboard> {
  const db = await getDb();
  if (!db) return { current: null, history: [], source: null };

  const safeLimit = Math.max(1, Math.min(100, limit));

  try {
    const result = await db.execute(sql`
      SELECT *
      FROM fuzzy_states
      ORDER BY computed_at DESC
      LIMIT ${safeLimit}
    `);

    const rows = Array.isArray(result)
      ? (Array.isArray(result[0]) ? result[0] : result)
      : ((result as { rows?: unknown[] }).rows ?? []);

    const history = (rows as Array<Record<string, unknown>>)
      .map((row) => {
        const snapshotAtDate = getDateValue(row, ["snapshotAt", "snapshot_at", "computedAt", "computed_at", "createdAt", "created_at"]);

        const fertilizerPressureState = getStringValue(row, ["fertilizerPressureState", "fertilizer_pressure_state", "fertilizerState", "fertilizer_state", "fertilizer"]);
        const priceTrendState = getStringValue(row, ["priceTrendState", "price_trend_state", "priceState", "price_state", "price_trend"]);
        const compoundState = getStringValue(row, ["compoundState", "compound_state", "state", "fuzzyState", "fuzzy_state", "compound"]);

        let score = getNumberValue(row, ["score", "fuzzyScore", "fuzzy_score", "riskScore", "risk_score"]);
        let confidence = getNumberValue(row, ["confidence", "scoreConfidence", "score_confidence"]);
        let coverage = getNumberValue(row, ["coverage", "scoreCoverage", "score_coverage"]);

        const rawMembership = getRecordValue(row, ["membership_scores", "membershipScores"]);
        if (rawMembership != null) {
          try {
            const membership = typeof rawMembership === "string" ? JSON.parse(rawMembership) : rawMembership;
            if (membership && typeof membership === "object") {
              const dataQuality = (membership as Record<string, unknown>).dataQuality;
              if (dataQuality && typeof dataQuality === "object") {
                const dq = dataQuality as Record<string, unknown>;
                if (score == null && typeof dq.score === "number") score = dq.score;
                if (confidence == null && typeof dq.confidence === "number") confidence = dq.confidence;
                if (coverage == null && typeof dq.coverage === "number") coverage = dq.coverage;
              }
            }
          } catch {
            // Keep direct-column values if JSON parse fails.
          }
        }

        return {
          fertilizerPressureState,
          priceTrendState,
          compoundState,
          score,
          confidence,
          coverage,
          snapshotAt: snapshotAtDate ? snapshotAtDate.toISOString() : null,
        } satisfies DashboardFuzzyStateRecord;
      })
      .sort((a, b) => {
        const aTime = a.snapshotAt ? new Date(a.snapshotAt).getTime() : 0;
        const bTime = b.snapshotAt ? new Date(b.snapshotAt).getTime() : 0;
        return bTime - aTime;
      });

    if (history.length > 0) {
      return {
        current: history[0] ?? null,
        history,
        source: "fuzzy_states",
      };
    }
  } catch (error) {
    console.warn("[Database] fuzzy_states query unavailable:", error);
  }

  return { current: null, history: [], source: null };
}

export async function getAiAnalysisDashboard(limit = 30): Promise<DashboardAiAnalysisDashboard> {
  const db = await getDb();
  if (!db) return { current: null, history: [], source: null };

  const safeLimit = Math.max(1, Math.min(100, limit));

  try {
    const result = await db.execute(sql`
      SELECT *
      FROM ai_analyses
      ORDER BY generated_at DESC
      LIMIT ${safeLimit}
    `);

    const rows = Array.isArray(result)
      ? (Array.isArray(result[0]) ? result[0] : result)
      : ((result as { rows?: unknown[] }).rows ?? []);

    const history = (rows as Array<Record<string, unknown>>)
      .map((row) => {
        const generatedAtDate = getDateValue(row, ["generated_at", "generatedAt"]);
        const type = getStringValue(row, ["type"]);
        
        // Extract from structured_output JSON
        let summary: string | null = null;
        let recommendation: string | null = null;
        let riskLevel: string | null = null;
        let confidence: number | null = null;
        let commodity: string | null = null;
        let model: string | null = null;

        const rawStructured = getRecordValue(row, ["structured_output", "structuredOutput"]);
        if (rawStructured != null) {
          try {
            const structured = typeof rawStructured === "string" ? JSON.parse(rawStructured) : rawStructured;
            if (structured && typeof structured === "object") {
              summary = String(structured.summary || "").trim() || null;
              
              // Get first monitoring priority as recommendation
              const priorities = (structured.monitoringPriorities as Array<Record<string, unknown>>) ?? [];
              if (priorities.length > 0) {
                recommendation = String(priorities[0].reason || "").trim() || null;
              }
              
              // Get first commodity from priceStressPoints
              const pricePoints = (structured.priceStressPoints as Array<Record<string, unknown>>) ?? [];
              if (pricePoints.length > 0) {
                commodity = String(pricePoints[0].commodity || "").trim() || null;
              }
            }
          } catch {
            // Fall through to defaults
          }
        }

        // Extract from data_context JSON
        const rawContext = getRecordValue(row, ["data_context", "dataContext"]);
        if (rawContext != null) {
          try {
            const context = typeof rawContext === "string" ? JSON.parse(rawContext) : rawContext;
            if (context && typeof context === "object") {
              if (riskLevel === null) {
                const cfsr = context.cfsrAtGeneration;
                if (typeof cfsr === "number") {
                  if (cfsr >= 70) riskLevel = "LOW";
                  else if (cfsr >= 40) riskLevel = "MODERATE";
                  else riskLevel = "HIGH";
                }
              }
              
              if (confidence === null) {
                const cfsrConfidence = context.cfsrConfidenceAtGeneration;
                if (typeof cfsrConfidence === "number") {
                  confidence = cfsrConfidence;
                }
              }
              
              if (model === null && context.llmModel) {
                model = String(context.llmModel).trim() || null;
              }
            }
          } catch {
            // Fall through to defaults
          }
        }

        // Fallback values
        if (!summary) summary = type ? `${type} analysis` : "AI Analysis";
        if (!recommendation) recommendation = "Monitor conditions";
        if (!riskLevel) riskLevel = "MODERATE";
        if (!commodity) commodity = "General";

        return {
          id: String(getRecordValue(row, ["id"]) ?? generatedAtDate?.toISOString() ?? Math.random().toString(36).slice(2)),
          title: type ?? "analysis",
          summary,
          recommendation,
          riskLevel,
          confidence: confidence ?? null,
          commodity,
          model: model ?? "Gemini",
          generatedAt: generatedAtDate ? generatedAtDate.toISOString() : null,
        } satisfies DashboardAiAnalysisRecord;
      });

    if (history.length > 0) {
      return {
        current: history[0] ?? null,
        history,
        source: "ai_analyses",
      };
    }
  } catch (error) {
    console.warn("[Database] ai_analyses query unavailable:", error);
  }

  return { current: null, history: [], source: null };
}

export async function getFxDashboard(days = 14): Promise<DashboardFxDashboard> {
  const db = await getDb();
  if (!db) return { rates: [], lastUpdated: null, source: null };

  const safeDays = Math.max(2, Math.min(3650, days));

  try {
    const BNM_URL = "https://api.bnm.gov.my/public/exchange-rate?quote=MYR";
    const res = await fetch(BNM_URL, {
      headers: { Accept: "application/vnd.BNM.API.v1+json" },
    });

    if (res.ok) {
      const json = await res.json() as {
        data?: Array<{
          currency_code?: string;
          rate?: {
            buying_rate?: number;
            middle_rate?: number;
            selling_rate?: number;
            buying?: number;
            middle?: number;
            selling?: number;
          };
        }>;
      };
      const today = new Date().toLocaleDateString("en-GB");
      const latestRows = (json.data ?? [])
        .map((row) => {
          const currency = String(row.currency_code ?? "").toUpperCase();
          const buyingRate = Number(row.rate?.buying_rate ?? row.rate?.buying ?? NaN);
          const middleRate = Number(row.rate?.middle_rate ?? row.rate?.middle ?? NaN);
          const sellingRate = Number(row.rate?.selling_rate ?? row.rate?.selling ?? NaN);
          const canonicalRate = Number.isFinite(buyingRate)
            ? buyingRate
            : (Number.isFinite(middleRate) ? middleRate : NaN);

          return {
            currency,
            rate: canonicalRate,
            buyingRate: Number.isFinite(buyingRate) ? buyingRate : null,
            middleRate: Number.isFinite(middleRate) ? middleRate : null,
            sellingRate: Number.isFinite(sellingRate) ? sellingRate : null,
          };
        })
        .filter((row) => Number.isFinite(row.rate))
        .sort((a, b) => a.currency.localeCompare(b.currency));

      if (latestRows.length > 0) {
        try {
          await db.execute(sql`DELETE FROM fx_snapshots WHERE DATE(observedAt) = CURDATE()`);
          await db.insert(fxSnapshots).values(
            latestRows.map((row) => ({
              currency: row.currency,
              rate: row.rate,
              buyingRate: row.buyingRate ?? row.rate,
              middleRate: row.middleRate,
              sellingRate: row.sellingRate,
              observedAt: new Date(),
              source: "live_bnm_api",
            }))
          );
        } catch (persistError) {
          console.warn("[Database] Failed to persist FX snapshots:", persistError);
        }

        // Backfill real history whenever requested range extends beyond current snapshot coverage.
        try {
          const toDate = new Date();
          const fromDate = new Date(toDate);
          fromDate.setDate(fromDate.getDate() - (safeDays - 1));

          const oldestSnapshotResult = await db.execute(sql`
            SELECT MIN(DATE(observedAt)) AS oldestDay
            FROM fx_snapshots
          `);
          const oldestSnapshotRows = Array.isArray(oldestSnapshotResult)
            ? (Array.isArray(oldestSnapshotResult[0]) ? oldestSnapshotResult[0] : oldestSnapshotResult)
            : ((oldestSnapshotResult as { rows?: unknown[] }).rows ?? []);
          const oldestSnapshotRaw = (oldestSnapshotRows as Array<Record<string, unknown>>)[0]?.oldestDay;
          const oldestSnapshotDate = oldestSnapshotRaw ? new Date(String(oldestSnapshotRaw)) : null;
          const needsBackfill = !oldestSnapshotDate || Number.isNaN(oldestSnapshotDate.getTime()) || oldestSnapshotDate > fromDate;

          if (needsBackfill) {
            const seedLimit = Math.min(safeDays * 64, 25000);
            await db.execute(sql`
              INSERT INTO fx_snapshots (currency, rate, buyingRate, middleRate, sellingRate, observedAt, source, createdAt)
              SELECT
                fr.currency,
                fr.rate,
                fr.rate AS buyingRate,
                NULL AS middleRate,
                NULL AS sellingRate,
                fr.date AS observedAt,
                'history_seed' AS source,
                NOW() AS createdAt
              FROM fx_rates fr
              WHERE fr.date >= ${fromDate}
                AND fr.date < CURDATE()
                AND NOT EXISTS (
                  SELECT 1
                  FROM fx_snapshots s
                  WHERE s.currency = fr.currency
                    AND DATE(s.observedAt) = DATE(fr.date)
                )
              ORDER BY fr.date DESC
              LIMIT ${seedLimit}
            `);

            const oldestAfterSeedResult = await db.execute(sql`
              SELECT MIN(DATE(observedAt)) AS oldestDay
              FROM fx_snapshots
            `);
            const oldestAfterSeedRows = Array.isArray(oldestAfterSeedResult)
              ? (Array.isArray(oldestAfterSeedResult[0]) ? oldestAfterSeedResult[0] : oldestAfterSeedResult)
              : ((oldestAfterSeedResult as { rows?: unknown[] }).rows ?? []);
            const oldestAfterSeedRaw = (oldestAfterSeedRows as Array<Record<string, unknown>>)[0]?.oldestDay;
            const oldestAfterSeedDate = oldestAfterSeedRaw ? new Date(String(oldestAfterSeedRaw)) : null;
            const stillNeedsBackfill = !oldestAfterSeedDate || Number.isNaN(oldestAfterSeedDate.getTime()) || oldestAfterSeedDate > fromDate;

            // If local tables still do not cover the requested window, backfill from real historical FX API.
            if (stillNeedsBackfill) {
              const from = fromDate.toISOString().slice(0, 10);
              const to = toDate.toISOString().slice(0, 10);

              const histRes = await fetch(`https://api.frankfurter.app/${from}..${to}?from=MYR`);
              if (histRes.ok) {
                const histJson = await histRes.json() as {
                  rates?: Record<string, Record<string, number>>;
                };

                const existingResult = await db.execute(sql`
                  SELECT currency, DATE(observedAt) AS day
                  FROM fx_snapshots
                  WHERE observedAt >= ${fromDate}
                `);
                const existingRows = Array.isArray(existingResult)
                  ? (Array.isArray(existingResult[0]) ? existingResult[0] : existingResult)
                  : ((existingResult as { rows?: unknown[] }).rows ?? []);
                const existingKeys = new Set(
                  (existingRows as Array<Record<string, unknown>>).map((row) => `${String(row.currency ?? "").toUpperCase()}|${String(row.day ?? "")}`)
                );

                const desiredCurrencies = new Set(latestRows.map((row) => row.currency));
                const inserts: Array<{
                  currency: string;
                  rate: number;
                  buyingRate: number;
                  middleRate: number | null;
                  sellingRate: number | null;
                  observedAt: Date;
                  source: string;
                }> = [];

                for (const [date, perMyr] of Object.entries(histJson.rates ?? {})) {
                  for (const currency of Array.from(desiredCurrencies)) {
                    const perMyrRate = Number((perMyr as Record<string, unknown>)[currency] ?? NaN);
                    if (!Number.isFinite(perMyrRate) || perMyrRate <= 0) continue;
                    const convertedMyrPerUnit = 1 / perMyrRate;
                    const key = `${currency}|${date}`;
                    if (existingKeys.has(key)) continue;
                    inserts.push({
                      currency,
                      rate: convertedMyrPerUnit,
                      buyingRate: convertedMyrPerUnit,
                      middleRate: null,
                      sellingRate: null,
                      observedAt: new Date(`${date}T12:00:00.000Z`),
                      source: "history_frankfurter_api",
                    });
                    existingKeys.add(key);
                  }
                }

                if (inserts.length > 0) {
                  const batchSize = 500;
                  for (let i = 0; i < inserts.length; i += batchSize) {
                    await db.insert(fxSnapshots).values(inserts.slice(i, i + batchSize));
                  }
                }
              }
            }
          }
        } catch (seedError) {
          console.warn("[Database] FX history seed from fx_rates unavailable:", seedError);
        }

        const snapshotResult = await db.execute(sql`
          SELECT currency, rate, buyingRate, middleRate, sellingRate, observedAt
          FROM fx_snapshots
          ORDER BY currency ASC, observedAt DESC
          LIMIT ${safeDays * 64}
        `);

        const snapshotRows = Array.isArray(snapshotResult)
          ? (Array.isArray(snapshotResult[0]) ? snapshotResult[0] : snapshotResult)
          : ((snapshotResult as { rows?: unknown[] }).rows ?? []);

        const historyByCurrency = new Map<string, Array<{
          date: string;
          buyingRate: number;
          middleRate: number | null;
          sellingRate: number | null;
        }>>();
        for (const raw of snapshotRows as Array<Record<string, unknown>>) {
          const currency = String(raw.currency ?? "").toUpperCase().trim();
          const buyingRate = Number(raw.buyingRate ?? raw.rate ?? NaN);
          if (!currency || Number.isNaN(buyingRate)) continue;
          const middleRate = raw.middleRate == null ? null : Number(raw.middleRate);
          const sellingRate = raw.sellingRate == null ? null : Number(raw.sellingRate);
          const rawDate = raw.observedAt == null ? null : String(raw.observedAt);
          const parsed = rawDate ? new Date(rawDate) : new Date();
          const dateLabel = Number.isNaN(parsed.getTime())
            ? String(rawDate ?? "Unknown")
            : parsed.toLocaleDateString("en-GB");

          const bucket = historyByCurrency.get(currency) ?? [];
          if (!bucket.some((entry) => entry.date === dateLabel)) {
            bucket.push({ date: dateLabel, buyingRate, middleRate, sellingRate });
          }
          historyByCurrency.set(currency, bucket);
        }

        const rates: DashboardFxRate[] = latestRows
          .map((row) => {
            const historyRaw = historyByCurrency.get(row.currency) ?? [];
            const history = historyRaw.slice(0, safeDays);
            const previous = history[1] ?? null;
            const previousBuying = previous?.buyingRate ?? null;
            const changePct = previousBuying !== null && previousBuying !== 0
              ? (((row.buyingRate ?? row.rate) - previousBuying) / previousBuying) * 100
              : null;

            return {
              currency: row.currency,
              date: today,
              rate: row.rate,
              buyingRate: row.buyingRate,
              middleRate: row.middleRate,
              sellingRate: row.sellingRate,
              previousRate: previousBuying,
              changePct,
              history: history.length > 0
                ? history
                : [{
                    date: today,
                    buyingRate: row.buyingRate ?? row.rate,
                    middleRate: row.middleRate,
                    sellingRate: row.sellingRate,
                  }],
            };
          })
          .sort((a, b) => a.currency.localeCompare(b.currency));

        return {
          rates,
          lastUpdated: today,
          source: "live_bnm_api",
        };
      }
    }
  } catch (error) {
    console.warn("[Database] live BNM FX fetch unavailable:", error);
  }

  return { rates: [], lastUpdated: null, source: null };
}

export async function getFuelDashboard(days = 30): Promise<DashboardFuelDashboard> {
  const db = await getDb();
  if (!db) {
    return {
      latest: null,
      previous: null,
      history: [],
      changePct: { ron95: null, ron97: null, diesel: null },
      source: null,
    };
  }

  const safeDays = Math.max(2, Math.min(90, days));

  try {
    const result = await db.execute(sql`
      SELECT
        date,
        ron95,
        ron97,
        diesel,
        ron95_budi95 AS ron95Budi95,
        diesel_eastmsia AS dieselEastMsia
      FROM fuel_prices
      ORDER BY date DESC
      LIMIT ${safeDays}
    `);

    const rows = Array.isArray(result)
      ? (Array.isArray(result[0]) ? result[0] : result)
      : ((result as { rows?: unknown[] }).rows ?? []);

    const history: DashboardFuelPoint[] = (rows as Array<Record<string, unknown>>).map((row) => {
      const parsedDate = row.date == null ? new Date() : new Date(String(row.date));
      return {
        date: Number.isNaN(parsedDate.getTime())
          ? String(row.date ?? "Unknown")
          : parsedDate.toLocaleDateString("en-GB"),
        ron95: row.ron95 == null ? null : Number(row.ron95),
        ron97: row.ron97 == null ? null : Number(row.ron97),
        diesel: row.diesel == null ? null : Number(row.diesel),
        ron95Budi95: row.ron95Budi95 == null ? null : Number(row.ron95Budi95),
        dieselEastMsia: row.dieselEastMsia == null ? null : Number(row.dieselEastMsia),
      };
    });

    const latest = history[0] ?? null;
    const previous = history[1] ?? null;

    const calcPct = (current: number | null, prev: number | null) => {
      if (current === null || prev === null || prev === 0) return null;
      return ((current - prev) / prev) * 100;
    };

    return {
      latest,
      previous,
      history,
      changePct: {
        ron95: calcPct(latest?.ron95 ?? null, previous?.ron95 ?? null),
        ron97: calcPct(latest?.ron97 ?? null, previous?.ron97 ?? null),
        diesel: calcPct(latest?.diesel ?? null, previous?.diesel ?? null),
      },
      source: latest ? "fuel_prices" : null,
    };
  } catch (error) {
    console.warn("[Database] fuel_prices query unavailable:", error);
    return {
      latest: null,
      previous: null,
      history: [],
      changePct: { ron95: null, ron97: null, diesel: null },
      source: null,
    };
  }
}

export async function getWorldBankPriceDashboard(months = 24): Promise<DashboardWorldBankPriceDashboard> {
  const db = await getDb();
  if (!db) {
    return getFallbackWorldBankPriceDashboard(months);
  }

  const safeMonths = Math.max(3, Math.min(60, months));
  const commodityLookup = await getWorldBankCommodityDashboard(2000);
  const commodityMap = new Map(
    commodityLookup.commodities.map((item) => [item.commodityCode.toUpperCase(), item.label] as const)
  );

  const toDashboard = (rows: Array<Record<string, unknown>>, source: "worldbank_prices" | "commodity_prices") => {
    const grouped = new Map<string, DashboardWorldBankPricePoint[]>();
    const labels = new Map<string, string>();
    const metadata = new Map<string, {
      category: string | null;
      subcategory: string | null;
      unit: string | null;
      sourceUrl: string | null;
      workbookUpdatedAt: string | null;
    }>();
    const optionalString = (value: unknown) => {
      if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
      if (value == null) return null;
      const normalized = String(value).trim();
      return normalized || null;
    };

    for (const row of rows) {
      const commodityCode = String(row.commodityCode ?? "").trim().toUpperCase();
      const priceUsd = Number(row.priceUsd ?? NaN);
      if (!commodityCode || Number.isNaN(priceUsd)) continue;

      const commodityLabel = String(row.commodityLabel ?? "").trim();
      if (commodityLabel) labels.set(commodityCode, commodityLabel);
      if (!metadata.has(commodityCode)) {
        metadata.set(commodityCode, {
          category: optionalString(row.category),
          subcategory: optionalString(row.subcategory),
          unit: optionalString(row.unit),
          sourceUrl: optionalString(row.sourceUrl),
          workbookUpdatedAt: optionalString(row.workbookUpdatedAt),
        });
      }

      const rawDate = row.date == null ? null : String(row.date);
      const parsed = rawDate ? new Date(rawDate) : new Date();
      const dateLabel = Number.isNaN(parsed.getTime())
        ? String(rawDate ?? "Unknown")
        : parsed.toLocaleDateString("en-GB", { month: "short", year: "numeric" });

      const bucket = grouped.get(commodityCode) ?? [];
      bucket.push({ date: dateLabel, priceUsd });
      grouped.set(commodityCode, bucket);
    }

    const series: DashboardWorldBankPriceSeries[] = Array.from(grouped.entries())
      .map(([commodityCode, historyRaw]) => {
        const history = historyRaw.slice(0, safeMonths);
        const latest = history[0];
        const previous = history[1] ?? null;
        const changePct = previous && previous.priceUsd !== 0
          ? ((latest.priceUsd - previous.priceUsd) / previous.priceUsd) * 100
          : null;
        const meta = metadata.get(commodityCode);

        return {
          commodityCode,
          commodityLabel: labels.get(commodityCode) ?? commodityMap.get(commodityCode) ?? null,
          category: meta?.category ?? null,
          subcategory: meta?.subcategory ?? null,
          unit: meta?.unit ?? null,
          sourceUrl: meta?.sourceUrl ?? null,
          workbookUpdatedAt: meta?.workbookUpdatedAt ?? null,
          latestPriceUsd: latest.priceUsd,
          previousPriceUsd: previous?.priceUsd ?? null,
          latestDate: latest.date,
          changePct,
          history,
        };
      })
      .filter((item) => Number.isFinite(item.latestPriceUsd))
      .sort((a, b) => a.commodityCode.localeCompare(b.commodityCode));

    const lastUpdated = series.length > 0
      ? series.map((item) => item.latestDate).sort((a, b) => b.localeCompare(a))[0]
      : null;

    return {
      series,
      lastUpdated,
      source,
    };
  };

  try {
    const result = await db.execute(sql`
      SELECT
        commodityCode,
        date,
        priceUsd,
        commodityLabel,
        category,
        subcategory,
        unit,
        sourceUrl,
        workbookUpdatedAt
      FROM (
        SELECT
          wp.commodity_code AS commodityCode,
          wp.date AS date,
          wp.price_usd AS priceUsd,
          wc.display_name AS commodityLabel,
          wc.category AS category,
          wc.subcategory AS subcategory,
          COALESCE(wp.unit, wc.unit) AS unit,
          wp.source_url AS sourceUrl,
          wp.workbook_updated_at AS workbookUpdatedAt,
          ROW_NUMBER() OVER (PARTITION BY wp.commodity_code ORDER BY wp.date DESC) AS rn
        FROM worldbank_prices wp
        LEFT JOIN worldbank_commodities wc ON wc.commodity_code = wp.commodity_code
        WHERE wp.price_usd IS NOT NULL
      ) ranked
      WHERE rn <= ${safeMonths}
      ORDER BY commodityCode ASC, date DESC
    `);

    const rows = Array.isArray(result)
      ? (Array.isArray(result[0]) ? result[0] : result)
      : ((result as { rows?: unknown[] }).rows ?? []);

    const dashboard = toDashboard(rows as Array<Record<string, unknown>>, "worldbank_prices");
    if (dashboard.series.length > 0) return dashboard;
  } catch (error) {
    console.warn("[Database] worldbank_prices query unavailable:", error);
  }

  try {
    const result = await db.execute(sql`
      SELECT
        commodityCode,
        date,
        priceUsd,
        commodityLabel,
        category,
        subcategory,
        unit,
        sourceUrl,
        workbookUpdatedAt
      FROM (
        SELECT
          commodity_id AS commodityCode,
          date,
          price_usd AS priceUsd,
          commodity_name AS commodityLabel,
          commodity_category AS category,
          NULL AS subcategory,
          unit_canonical AS unit,
          source_url AS sourceUrl,
          NULL AS workbookUpdatedAt,
          ROW_NUMBER() OVER (PARTITION BY commodity_id ORDER BY date DESC) AS rn
        FROM commodity_prices
        WHERE source_id = 'worldbank_rtfp'
          AND location_level = 'global'
          AND series_type = 'benchmark'
          AND price_usd IS NOT NULL
      ) ranked
      WHERE rn <= ${safeMonths}
      ORDER BY commodityCode ASC, date DESC
    `);

    const rows = Array.isArray(result)
      ? (Array.isArray(result[0]) ? result[0] : result)
      : ((result as { rows?: unknown[] }).rows ?? []);

    const dashboard = toDashboard(rows as Array<Record<string, unknown>>, "commodity_prices");
    if (dashboard.series.length > 0) return dashboard;
  } catch (error) {
    console.warn("[Database] commodity_prices worldbank benchmark query unavailable:", error);
  }

  return getFallbackWorldBankPriceDashboard(months);
}

export async function getWorldBankCommodityDashboard(limit = 500): Promise<DashboardWorldBankCommodityDashboard> {
  const db = await getDb();
  if (!db) {
    return getFallbackWorldBankCommodityDashboard(limit);
  }

  const safeLimit = Math.max(1, Math.min(5000, limit));

  const mapCommodities = (rows: Array<Record<string, unknown>>) => {
    const commodities = rows
      .map((row) => {
        const commodityCode = String(row.commodityCode ?? "").trim().toUpperCase();
        const label = String(row.label ?? commodityCode).trim();
        const category = row.category == null ? null : String(row.category).trim();
        const unit = row.unit == null ? null : String(row.unit).trim();
        if (!commodityCode || !label) return null;
        return {
          commodityCode,
          label,
          category,
          unit,
        };
      })
      .filter((item): item is DashboardWorldBankCommodity => item !== null)
      .sort((a, b) => a.commodityCode.localeCompare(b.commodityCode));

    return commodities;
  };

  try {
    const result = await db.execute(sql`
      SELECT
        commodity_code AS commodityCode,
        display_name AS label,
        category,
        unit
      FROM worldbank_commodities
      ORDER BY commodity_code ASC
      LIMIT ${safeLimit}
    `);

    const rows = Array.isArray(result)
      ? (Array.isArray(result[0]) ? result[0] : result)
      : ((result as { rows?: unknown[] }).rows ?? []);

    const commodities = mapCommodities(rows as Array<Record<string, unknown>>);
    if (commodities.length > 0) {
      return { commodities, source: "worldbank_commodities" };
    }
  } catch (error) {
    console.warn("[Database] worldbank_commodities query unavailable:", error);
  }

  try {
    const result = await db.execute(sql`
      SELECT
        commodity_id AS commodityCode,
        MAX(COALESCE(commodity_name, commodity_id)) AS label,
        MAX(commodity_category) AS category,
        MAX(unit_canonical) AS unit
      FROM commodity_prices
      WHERE source_id = 'worldbank_rtfp'
      GROUP BY commodity_id
      ORDER BY commodity_id ASC
      LIMIT ${safeLimit}
    `);

    const rows = Array.isArray(result)
      ? (Array.isArray(result[0]) ? result[0] : result)
      : ((result as { rows?: unknown[] }).rows ?? []);

    const commodities = mapCommodities(rows as Array<Record<string, unknown>>);
    if (commodities.length > 0) {
      return { commodities, source: "commodity_prices" };
    }
  } catch (error) {
    console.warn("[Database] commodity_prices commodity lookup query unavailable:", error);
  }

  return getFallbackWorldBankCommodityDashboard(limit);
}

export async function getPriceCatcherDashboard(months = 2, limit = 250): Promise<DashboardPriceCatcherDashboard> {
  const safeMonths = months <= 0 ? null : Math.max(1, Math.min(120, months));
  const safeLimit = limit <= 0 ? 250000 : Math.max(25, Math.min(250000, limit));
  const maxRawRows = safeLimit;
  const monthKeys = buildPriceCatcherMonthSequence(safeMonths ?? 120);

  const db = await getDb();
  if (db) {
    try {
      const result = safeMonths === null
        ? await db.execute(sql`
            SELECT
              date,
              price,
              item,
              unit,
              item_category AS category,
              premise,
              premise_type AS premiseType,
              state,
              district
            FROM pricecatcher_prices
            ORDER BY date DESC
            LIMIT ${safeLimit}
          `)
        : await db.execute(sql`
            SELECT
              date,
              price,
              item,
              unit,
              item_category AS category,
              premise,
              premise_type AS premiseType,
              state,
              district
            FROM pricecatcher_prices
            WHERE date >= DATE_SUB(CURDATE(), INTERVAL ${safeMonths} MONTH)
            ORDER BY date DESC
            LIMIT ${safeLimit}
          `);

      const rows = Array.isArray(result)
        ? (Array.isArray(result[0]) ? result[0] : result)
        : ((result as { rows?: unknown[] }).rows ?? []);

      const observations = (rows as Array<Record<string, unknown>>)
        .map((row) => {
          const date = getDateValue(row, ["date"]);
          const itemName = getStringValue(row, ["item"]) ?? "Unknown";
          const premise = getStringValue(row, ["premise"]) ?? "Unknown";
          const itemCode = itemName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "unknown";
          const premiseCode = premise.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "unknown";
          const price = getNumberValue(row, ["price"]);

          if (price === null) return null;

          return {
            date: date ? date.toISOString().slice(0, 10) : "Unknown",
            itemCode,
            itemName,
            unit: getStringValue(row, ["unit"]),
            category: getStringValue(row, ["category", "item_category"]),
            premiseCode,
            premise,
            premiseType: getStringValue(row, ["premiseType", "premise_type"]),
            state: getStringValue(row, ["state"]),
            district: getStringValue(row, ["district"]),
            price,
          } satisfies DashboardPriceCatcherObservation;
        })
        .filter((row): row is DashboardPriceCatcherObservation => row !== null)
        .sort((a, b) => b.date.localeCompare(a.date) || a.itemName.localeCompare(b.itemName) || a.premise.localeCompare(b.premise));

      if (observations.length > 0) {
        const groupedByItem = new Map<string, DashboardPriceCatcherObservation[]>();
        const groupedByState = new Map<string, DashboardPriceCatcherObservation[]>();

        for (const observation of observations) {
          const itemBucket = groupedByItem.get(observation.itemCode) ?? [];
          itemBucket.push(observation);
          groupedByItem.set(observation.itemCode, itemBucket);

          const stateBucket = groupedByState.get(observation.state ?? "Unknown") ?? [];
          stateBucket.push(observation);
          groupedByState.set(observation.state ?? "Unknown", stateBucket);
        }

        const items = Array.from(groupedByItem.entries())
          .map(([itemCode, rowsForItem]) => {
            const byDate = new Map<string, number[]>();
            const stateBuckets = new Map<string, number[]>();
            const districtBuckets = new Map<string, number[]>();

            for (const row of rowsForItem) {
              byDate.set(row.date, [...(byDate.get(row.date) ?? []), row.price]);
              stateBuckets.set(row.state ?? "Unknown", [...(stateBuckets.get(row.state ?? "Unknown") ?? []), row.price]);
              districtBuckets.set(row.district ?? "Unknown", [...(districtBuckets.get(row.district ?? "Unknown") ?? []), row.price]);
            }

            const latestDate = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a))[0] ?? rowsForItem[0]?.date ?? "";
            const latestPrice = median(byDate.get(latestDate) ?? rowsForItem.map((row) => row.price));
            const allPrices = rowsForItem.map((row) => row.price);
            const stateSummaries = Array.from(stateBuckets.entries())
              .map(([name, values]) => ({ name, value: median(values) }))
              .filter((entry) => Number.isFinite(entry.value));
            const districtSummaries = Array.from(districtBuckets.entries())
              .map(([name, values]) => ({ name, value: median(values) }))
              .filter((entry) => Number.isFinite(entry.value));
            const cheapestStateEntry = [...stateSummaries].sort((a, b) => a.value - b.value)[0] ?? null;
            const priciestStateEntry = [...stateSummaries].sort((a, b) => b.value - a.value)[0] ?? null;
            const cheapestDistrictEntry = [...districtSummaries].sort((a, b) => a.value - b.value)[0] ?? null;
            const priciestDistrictEntry = [...districtSummaries].sort((a, b) => b.value - a.value)[0] ?? null;

            const representative = rowsForItem[0];
            return {
              itemCode,
              itemName: representative?.itemName ?? itemCode,
              unit: representative?.unit ?? null,
              category: representative?.category ?? null,
              latestDate,
              latestPrice,
              medianPrice: median(allPrices),
              minPrice: minNumber(allPrices),
              maxPrice: maxNumber(allPrices),
              observations: rowsForItem.length,
              stateCount: new Set(rowsForItem.map((row) => row.state ?? "Unknown")).size,
              districtCount: new Set(rowsForItem.map((row) => row.district ?? "Unknown")).size,
              cheapestState: cheapestStateEntry?.name ?? null,
              cheapestDistrict: cheapestDistrictEntry?.name ?? null,
              priciestState: priciestStateEntry?.name ?? null,
              priciestDistrict: priciestDistrictEntry?.name ?? null,
              stateSpreadPct: cheapestStateEntry && priciestStateEntry && cheapestStateEntry.value > 0
                ? ((priciestStateEntry.value - cheapestStateEntry.value) / cheapestStateEntry.value) * 100
                : null,
            } satisfies DashboardPriceCatcherItem;
          })
          .sort((a, b) => b.latestDate.localeCompare(a.latestDate) || b.observations - a.observations || a.itemCode.localeCompare(b.itemCode));

        const states = Array.from(groupedByState.entries())
          .map(([state, rowsForState]) => {
            const itemBuckets = new Map<string, number[]>();
            for (const row of rowsForState) {
              itemBuckets.set(row.itemCode, [...(itemBuckets.get(row.itemCode) ?? []), row.price]);
            }
            const itemMedians = Array.from(itemBuckets.entries())
              .map(([itemCode, values]) => ({ itemCode, value: median(values) }))
              .filter((entry) => Number.isFinite(entry.value));
            const cheapestItemEntry = [...itemMedians].sort((a, b) => a.value - b.value)[0] ?? null;
            const priciestItemEntry = [...itemMedians].sort((a, b) => b.value - a.value)[0] ?? null;

            return {
              state,
              medianPrice: median(rowsForState.map((row) => row.price)),
              minPrice: minNumber(rowsForState.map((row) => row.price)),
              maxPrice: maxNumber(rowsForState.map((row) => row.price)),
              observations: rowsForState.length,
              itemCount: new Set(rowsForState.map((row) => row.itemCode)).size,
              cheapestItem: cheapestItemEntry?.itemCode ?? null,
              priciestItem: priciestItemEntry?.itemCode ?? null,
            } satisfies DashboardPriceCatcherState;
          })
          .filter((entry) => entry.state !== "Unknown")
          .sort((a, b) => b.observations - a.observations || a.state.localeCompare(b.state));

        // Fill in missing categories in observations from the aggregated items
        const categoryMap = new Map<string, string | null>();
        for (const item of items) {
          categoryMap.set(item.itemCode, item.category);
        }

        const enrichedObservations = observations.map((obs) => ({
          ...obs,
          category: obs.category ?? categoryMap.get(obs.itemCode) ?? null,
        }));

        return {
          month: safeMonths === null ? "all" : monthKeys.join(","),
          source: "pricecatcher_prices",
          lastUpdated: enrichedObservations[0]?.date ?? null,
          observations: enrichedObservations,
          items,
          states,
        };
      }
    } catch (error) {
      console.warn("[Database] pricecatcher_prices table query unavailable:", error);
    }
  }

  try {
    const [itemLookup, premiseLookup] = await Promise.all([
      fetchPriceCatcherLookup("https://storage.data.gov.my/pricecatcher/lookup_item.csv", "item"),
      fetchPriceCatcherLookup("https://storage.data.gov.my/pricecatcher/lookup_premise.csv", "premise"),
    ]);

    const monthRows: PriceCatcherRawObservation[] = [];
    for (const monthKey of monthKeys) {
      const remaining = maxRawRows - monthRows.length;
      if (remaining <= 0) break;
      const rows = await fetchPriceCatcherMonth(monthKey, remaining);
      monthRows.push(...rows);
    }

    const itemLookupMap = itemLookup as Map<string, PriceCatcherItemLookup>;
    const premiseLookupMap = premiseLookup as Map<string, PriceCatcherPremiseLookup>;
    const sortedRows = monthRows
      .sort((a, b) => b.date.localeCompare(a.date) || a.itemCode.localeCompare(b.itemCode) || a.premiseCode.localeCompare(b.premiseCode));
    const selectedRows = sortedRows;

    const toObservation = (row: { date: string; itemCode: string; premiseCode: string; price: number }) => {
        const item = itemLookupMap.get(row.itemCode) ?? { itemCode: row.itemCode, itemName: row.itemCode, unit: null, category: null };
        const premise = premiseLookupMap.get(row.premiseCode) ?? { premiseCode: row.premiseCode, premise: row.premiseCode, address: null, premiseType: null, state: null, district: null };
        return {
          date: row.date,
          itemCode: item.itemCode,
          itemName: item.itemName,
          unit: item.unit,
          category: item.category,
          premiseCode: premise.premiseCode,
          premise: premise.premise ?? premise.premiseCode,
          premiseType: premise.premiseType,
          state: premise.state,
          district: premise.district,
          price: row.price,
        } satisfies DashboardPriceCatcherObservation;
      };

    const observations = selectedRows
      .map(toObservation)
      .sort((a, b) => b.date.localeCompare(a.date) || a.itemName.localeCompare(b.itemName) || a.premise.localeCompare(b.premise));

    const groupedByItem = new Map<string, DashboardPriceCatcherObservation[]>();
    const groupedByState = new Map<string, DashboardPriceCatcherObservation[]>();

    for (const observation of observations) {
      const itemBucket = groupedByItem.get(observation.itemCode) ?? [];
      itemBucket.push(observation);
      groupedByItem.set(observation.itemCode, itemBucket);

      const stateBucket = groupedByState.get(observation.state ?? "Unknown") ?? [];
      stateBucket.push(observation);
      groupedByState.set(observation.state ?? "Unknown", stateBucket);
    }

    const items = Array.from(groupedByItem.entries())
      .map(([itemCode, rows]) => {
        const sourceItem = itemLookupMap.get(itemCode) ?? { itemCode, itemName: itemCode, unit: null, category: null };
        const byDate = new Map<string, number[]>();
        const stateBuckets = new Map<string, number[]>();
        const districtBuckets = new Map<string, number[]>();

        for (const row of rows) {
          byDate.set(row.date, [...(byDate.get(row.date) ?? []), row.price]);
          stateBuckets.set(row.state ?? "Unknown", [...(stateBuckets.get(row.state ?? "Unknown") ?? []), row.price]);
          districtBuckets.set(row.district ?? "Unknown", [...(districtBuckets.get(row.district ?? "Unknown") ?? []), row.price]);
        }

        const latestDate = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a))[0] ?? rows[0]?.date ?? "";
        const latestPrice = median(byDate.get(latestDate) ?? rows.map((row) => row.price));
        const allPrices = rows.map((row) => row.price);
        const stateSummaries = Array.from(stateBuckets.entries())
          .map(([name, values]) => ({ name, value: median(values) }))
          .filter((entry) => Number.isFinite(entry.value));
        const districtSummaries = Array.from(districtBuckets.entries())
          .map(([name, values]) => ({ name, value: median(values) }))
          .filter((entry) => Number.isFinite(entry.value));
        const cheapestStateEntry = [...stateSummaries].sort((a, b) => a.value - b.value)[0] ?? null;
        const priciestStateEntry = [...stateSummaries].sort((a, b) => b.value - a.value)[0] ?? null;
        const cheapestDistrictEntry = [...districtSummaries].sort((a, b) => a.value - b.value)[0] ?? null;
        const priciestDistrictEntry = [...districtSummaries].sort((a, b) => b.value - a.value)[0] ?? null;

        return {
          itemCode,
          itemName: sourceItem.itemName,
          unit: sourceItem.unit,
          category: sourceItem.category,
          latestDate,
          latestPrice,
          medianPrice: median(allPrices),
          minPrice: minNumber(allPrices),
          maxPrice: maxNumber(allPrices),
          observations: rows.length,
          stateCount: new Set(rows.map((row) => row.state ?? "Unknown")).size,
          districtCount: new Set(rows.map((row) => row.district ?? "Unknown")).size,
          cheapestState: cheapestStateEntry?.name ?? null,
          cheapestDistrict: cheapestDistrictEntry?.name ?? null,
          priciestState: priciestStateEntry?.name ?? null,
          priciestDistrict: priciestDistrictEntry?.name ?? null,
          stateSpreadPct: cheapestStateEntry && priciestStateEntry && cheapestStateEntry.value > 0
            ? ((priciestStateEntry.value - cheapestStateEntry.value) / cheapestStateEntry.value) * 100
            : null,
        } satisfies DashboardPriceCatcherItem;
      })
      .sort((a, b) => b.latestDate.localeCompare(a.latestDate) || b.observations - a.observations || a.itemCode.localeCompare(b.itemCode));

    const states = Array.from(groupedByState.entries())
      .map(([state, rows]) => {
        const itemBuckets = new Map<string, number[]>();
        for (const row of rows) {
          itemBuckets.set(row.itemCode, [...(itemBuckets.get(row.itemCode) ?? []), row.price]);
        }
        const itemMedians = Array.from(itemBuckets.entries())
          .map(([itemCode, values]) => ({ itemCode, value: median(values) }))
          .filter((entry) => Number.isFinite(entry.value));
        const cheapestItemEntry = [...itemMedians].sort((a, b) => a.value - b.value)[0] ?? null;
        const priciestItemEntry = [...itemMedians].sort((a, b) => b.value - a.value)[0] ?? null;

        return {
          state,
          medianPrice: median(rows.map((row) => row.price)),
          minPrice: minNumber(rows.map((row) => row.price)),
          maxPrice: maxNumber(rows.map((row) => row.price)),
          observations: rows.length,
          itemCount: new Set(rows.map((row) => row.itemCode)).size,
          cheapestItem: cheapestItemEntry?.itemCode ?? null,
          priciestItem: priciestItemEntry?.itemCode ?? null,
        } satisfies DashboardPriceCatcherState;
      })
      .filter((entry) => entry.state !== "Unknown")
      .sort((a, b) => b.observations - a.observations || a.state.localeCompare(b.state));

    // Fill in missing categories in observations from the aggregated items
    const categoryMap = new Map<string, string | null>();
    for (const item of items) {
      categoryMap.set(item.itemCode, item.category);
    }

    const enrichedObservations = observations.map((obs) => ({
      ...obs,
      category: obs.category ?? categoryMap.get(obs.itemCode) ?? null,
    }));

    return {
      month: safeMonths === null ? "all" : monthKeys.join(","),
      source: "live_pricecatcher_api",
      lastUpdated: enrichedObservations[0]?.date ?? null,
      observations: enrichedObservations,
      items,
      states,
    };
  } catch (error) {
    console.warn("[Database] pricecatcher_prices query unavailable:", error);
    return { month: null, source: null, lastUpdated: null, observations: [], items: [], states: [] };
  }
}

export async function getLatestNewsItems(limit = 200): Promise<DashboardNewsRecord[]> {
  const db = await getDb();
  if (!db) return [];

  const records: DashboardNewsRecord[] = [];

  // Primary schema in this repository.
  try {
    const rows = await db
      .select()
      .from(newsItems)
      .orderBy(desc(newsItems.publishedAt))
      .limit(limit);

    records.push(
      ...rows.map((row: any) => ({
        id: row.id,
        headline: row.headline,
        summary: row.summary ?? null,
        source: row.source ?? null,
        url: row.url ?? null,
        category: row.category,
        impactScore: row.impactScore ?? null,
        sentimentScore: null,
        severity: null,
        sentimentSide: null,
        affectedCountries: row.affectedCountries ?? [],
        affectedCommodities: row.affectedCommodities ?? [],
        publishedAt: row.publishedAt,
      }))
    );
  } catch (error) {
    console.warn("[Database] news_items query unavailable:", error);
  }

  // Compatibility schema from foodmonitor-temp pipeline.
  try {
    const compatResult = await db.execute(sql`
      SELECT
        na.id AS id,
        na.title AS headline,
        COALESCE(aa.implication, na.description) AS summary,
        na.source AS source,
        na.url AS url,
        COALESCE(aa.event_type, 'other') AS category,
        aa.insight_score AS impactScore,
        aa.sentiment_score AS sentimentScore,
        aa.severity AS severity,
        aa.sentiment_side AS sentimentSide,
        JSON_ARRAY() AS affectedCountries,
        CASE
          WHEN aa.primary_commodity IS NULL OR aa.primary_commodity = '' THEN JSON_ARRAY()
          ELSE JSON_ARRAY(aa.primary_commodity)
        END AS affectedCommodities,
        na.published_at AS publishedAt
      FROM news_articles na
      LEFT JOIN article_analyses aa ON aa.article_id = na.id
      ORDER BY na.published_at DESC
      LIMIT ${limit}
    `);

    const compatRows = Array.isArray(compatResult)
      ? (Array.isArray(compatResult[0]) ? compatResult[0] : compatResult)
      : ((compatResult as { rows?: unknown[] }).rows ?? []);

    const compatMapped = (compatRows as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id ?? ""),
      headline: String(row.headline ?? "Untitled"),
      summary: row.summary == null ? null : String(row.summary),
      source: row.source == null ? null : String(row.source),
      url: row.url == null ? null : String(row.url),
      category: row.category == null ? "other" : String(row.category),
      impactScore: row.impactScore == null ? null : Number(row.impactScore),
      sentimentScore: row.sentimentScore == null ? null : Number(row.sentimentScore),
      severity: row.severity == null ? null : String(row.severity),
      sentimentSide: row.sentimentSide == null ? null : String(row.sentimentSide),
      affectedCountries: row.affectedCountries ?? [],
      affectedCommodities: row.affectedCommodities ?? [],
      publishedAt: row.publishedAt == null ? new Date().toISOString() : (row.publishedAt as string),
    }));

    records.push(...compatMapped);
  } catch (error) {
    console.warn("[Database] news_articles compatibility query unavailable:", error);
  }

  return records
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, limit);
}

export async function getMacroIndicatorsDashboard(limit = 30): Promise<DashboardMacroIndicatorDashboard> {
  const db = await getDb();
  if (!db) return { current: null, history: [], source: null };

  const safeLimit = Math.max(1, Math.min(100, limit));

  try {
    const result = await db.execute(sql`
      SELECT * FROM macro_indicators ORDER BY date DESC LIMIT ${safeLimit}
    `);

    const rows = Array.isArray(result)
      ? (Array.isArray(result[0]) ? result[0] : result)
      : ((result as { rows?: unknown[] }).rows ?? []);

    const history = (rows as Array<Record<string, unknown>>)
      .map((row) => {
        const date = getDateValue(row, ["date"]);
        const type = getStringValue(row, ["indicator_type", "type"]);
        const value = getNumberValue(row, ["value"]);
        const baseCurrency = getStringValue(row, ["base_currency", "baseCurrency"]);
        const targetCurrency = getStringValue(row, ["target_currency", "targetCurrency"]);

        return {
          date: date ? date.toLocaleDateString("en-GB") : "Unknown",
          type: type ?? "Unknown",
          value: value ?? 0,
          baseCurrency: baseCurrency ?? null,
          targetCurrency: targetCurrency ?? null,
        } satisfies DashboardMacroIndicatorPoint;
      });

    if (history.length > 0) {
      return { current: history[0] ?? null, history, source: "macro_indicators" };
    }
  } catch (error) {
    console.warn("[Database] macro_indicators query unavailable:", error);
  }

  // Fallback to real FX rates when macro_indicators is not populated yet.
  try {
    const fxResult = await db.execute(sql`
      SELECT
        fr.currency AS currency,
        fr.date AS date,
        fr.rate AS value
      FROM fx_rates fr
      WHERE fr.date = (SELECT MAX(date) FROM fx_rates)
      ORDER BY fr.currency ASC
      LIMIT ${safeLimit}
    `);

    const fxRows = Array.isArray(fxResult)
      ? (Array.isArray(fxResult[0]) ? fxResult[0] : fxResult)
      : ((fxResult as { rows?: unknown[] }).rows ?? []);

    const history: DashboardMacroIndicatorPoint[] = [];
    for (const row of fxRows as Array<Record<string, unknown>>) {
      const date = getDateValue(row, ["date"]);
      const currency = getStringValue(row, ["currency"]);
      const value = getNumberValue(row, ["value"]);
      if (!currency || value === null) continue;

      history.push({
        date: date ? date.toLocaleDateString("en-GB") : "Unknown",
        type: `fx_${currency.toLowerCase()}_myr`,
        value,
        baseCurrency: currency,
        targetCurrency: "MYR",
      });
    }

    if (history.length > 0) {
      return { current: history[0] ?? null, history, source: "fx_rates" };
    }
  } catch (error) {
    console.warn("[Database] fx_rates fallback for macro indicators unavailable:", error);
  }

  // Fallback to latest fuel prices as macro stress proxies.
  try {
    const fuelResult = await db.execute(sql`
      SELECT date, ron95, ron97, diesel
      FROM fuel_prices
      ORDER BY date DESC
      LIMIT 1
    `);

    const fuelRows = Array.isArray(fuelResult)
      ? (Array.isArray(fuelResult[0]) ? fuelResult[0] : fuelResult)
      : ((fuelResult as { rows?: unknown[] }).rows ?? []);

    const row = (fuelRows as Array<Record<string, unknown>>)[0] ?? null;
    if (row) {
      const date = getDateValue(row, ["date"]);
      const indicators: DashboardMacroIndicatorPoint[] = [];

      const ron95 = getNumberValue(row, ["ron95"]);
      const ron97 = getNumberValue(row, ["ron97"]);
      const diesel = getNumberValue(row, ["diesel"]);

      const dateLabel = date ? date.toLocaleDateString("en-GB") : "Unknown";
      if (ron95 !== null) indicators.push({ date: dateLabel, type: "fuel_ron95", value: ron95, baseCurrency: "MYR", targetCurrency: "L" });
      if (ron97 !== null) indicators.push({ date: dateLabel, type: "fuel_ron97", value: ron97, baseCurrency: "MYR", targetCurrency: "L" });
      if (diesel !== null) indicators.push({ date: dateLabel, type: "fuel_diesel", value: diesel, baseCurrency: "MYR", targetCurrency: "L" });

      if (indicators.length > 0) {
        return { current: indicators[0] ?? null, history: indicators, source: "fuel_prices" };
      }
    }
  } catch (error) {
    console.warn("[Database] fuel_prices fallback for macro indicators unavailable:", error);
  }

  return { current: null, history: [], source: null };
}

export async function getManualBaselinesDashboard(limit = 50): Promise<DashboardManualBaselineDashboard> {
  const db = await getDb();
  if (!db) return { current: [], source: null };

  const safeLimit = Math.max(1, Math.min(200, limit));

  try {
    const result = await db.execute(sql`
      SELECT
        \`key\` AS baselineKey,
        value,
        reviewed_at AS reviewedAt
      FROM manual_baselines
      ORDER BY reviewed_at DESC, \`key\` ASC
      LIMIT ${safeLimit}
    `);

    const rows = Array.isArray(result)
      ? (Array.isArray(result[0]) ? result[0] : result)
      : ((result as { rows?: unknown[] }).rows ?? []);

    const current = (rows as Array<Record<string, unknown>>)
      .map((row) => {
        const key = getStringValue(row, ["baselineKey", "key"]);
        const value = getNumberValue(row, ["value"]);
        const reviewed = getDateValue(row, ["reviewedAt", "reviewed_at"]);
        if (!key || value === null) return null;

        return {
          key,
          value,
          reviewedAt: reviewed ? reviewed.toISOString() : null,
        } satisfies DashboardManualBaselinePoint;
      })
      .filter((row): row is DashboardManualBaselinePoint => row !== null);

    if (current.length > 0) {
      return { current, source: "manual_baselines" };
    }
  } catch (error) {
    console.warn("[Database] manual_baselines query unavailable:", error);
  }

  // Fallback to latest real CFSR snapshot-derived constants.
  try {
    const result = await db.execute(sql`
      SELECT
        computed_at,
        cfsr,
        score_confidence,
        score_coverage,
        components
      FROM cfsr_snapshots
      ORDER BY computed_at DESC
      LIMIT 1
    `);

    const rows = Array.isArray(result)
      ? (Array.isArray(result[0]) ? result[0] : result)
      : ((result as { rows?: unknown[] }).rows ?? []);

    const latest = (rows as Array<Record<string, unknown>>)[0] ?? null;
    if (latest) {
      const reviewed = getDateValue(latest, ["computed_at", "computedAt"]);
      const points: DashboardManualBaselinePoint[] = [];

      const cfsr = getNumberValue(latest, ["cfsr"]);
      const confidence = getNumberValue(latest, ["score_confidence", "scoreConfidence"]);
      const coverage = getNumberValue(latest, ["score_coverage", "scoreCoverage"]);

      if (cfsr !== null) points.push({ key: "baseline_cfsr", value: cfsr, reviewedAt: reviewed ? reviewed.toISOString() : null });
      if (confidence !== null) points.push({ key: "baseline_confidence", value: confidence, reviewedAt: reviewed ? reviewed.toISOString() : null });
      if (coverage !== null) points.push({ key: "baseline_coverage", value: coverage, reviewedAt: reviewed ? reviewed.toISOString() : null });

      const rawComponents = getRecordValue(latest, ["components"]);
      if (rawComponents != null) {
        try {
          const components = typeof rawComponents === "string" ? JSON.parse(rawComponents) : rawComponents;
          if (components && typeof components === "object") {
            const c = components as Record<string, unknown>;
            const map: Array<[string, unknown]> = [
              ["baseline_n1_import_dependency", c.n1ImportDependency],
              ["baseline_n2_supply_chain_health", c.n2SupplyChainHealth],
              ["baseline_n3_fertilizer_availability", c.n3FertilizerAvailability],
              ["baseline_n4_geopolitical_risk", c.n4GeopoliticalRisk],
              ["baseline_n5_price_volatility", c.n5PriceVolatility],
            ];
            for (const [key, value] of map) {
              const numeric = typeof value === "number" ? value : Number(value);
              if (Number.isFinite(numeric)) {
                points.push({ key, value: numeric, reviewedAt: reviewed ? reviewed.toISOString() : null });
              }
            }
          }
        } catch {
          // Ignore malformed component payloads.
        }
      }

      if (points.length > 0) {
        return { current: points.slice(0, safeLimit), source: "cfsr_snapshots" };
      }
    }
  } catch (error) {
    console.warn("[Database] cfsr_snapshots fallback for manual baselines unavailable:", error);
  }

  return { current: [], source: null };
}


