import type {
  DashboardAiAnalysisDashboard,
  DashboardAiAnalysisRecord,
  DashboardFuzzyStateDashboard,
  DashboardFuzzyStateRecord,
  DashboardNewsRecord,
  DashboardRiskDashboard,
  DashboardRiskRecord,
} from "../../db";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getString(row: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value;
    if (value instanceof Date) return value.toISOString();
  }
  return null;
}

function getNumber(row: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) return numeric;
    }
  }
  return null;
}

function getDate(row: Record<string, unknown>, keys: string[]): Date | null {
  for (const key of keys) {
    const value = row[key];
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  }
  return null;
}

function normalizeBand(value: unknown): DashboardRiskRecord["band"] {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "LOW" || normalized === "MODERATE" || normalized === "HIGH") {
    return normalized;
  }
  if (normalized === "CRITICAL") return "HIGH";
  return "MODERATE";
}

function parseJsonRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === "string" && value.trim()) {
    try {
      return asRecord(JSON.parse(value));
    } catch {
      return null;
    }
  }
  return null;
}

export function mapFoodMonitorCfsrRecord(value: unknown): DashboardRiskRecord | null {
  const row = asRecord(value);
  if (!row) return null;

  const computedAt = getDate(row, ["computedAt", "computed_at", "snapshotAt", "snapshot_at", "createdAt"]);
  const components = parseJsonRecord(row.components);

  return {
    score: getNumber(row, ["cfsr", "score"]) ?? 0,
    band: normalizeBand(row.riskBand ?? row.risk_band ?? row.band),
    date: (computedAt ?? new Date()).toLocaleDateString("en-GB"),
    country: null,
    source: "cfsr_snapshots",
    snapshotAt: computedAt ? computedAt.toISOString() : null,
    confidence: getNumber(row, ["scoreConfidence", "score_confidence", "confidence"]),
    coverage: getNumber(row, ["scoreCoverage", "score_coverage", "coverage"]),
    components: {
      n1: getNumber(row, ["n1ImportDependency", "n1ImportDep"]) ?? getNumber(components ?? {}, ["n1ImportDependency"]),
      n2: getNumber(row, ["n2SupplyChainHealth", "n2SupplyChain"]) ?? getNumber(components ?? {}, ["n2SupplyChainHealth"]),
      n3: getNumber(row, ["n3FertilizerAvailability", "n3Fertilizer"]) ?? getNumber(components ?? {}, ["n3FertilizerAvailability"]),
      n4: getNumber(row, ["n4GeopoliticalRisk", "n4Geopolitical"]) ?? getNumber(components ?? {}, ["n4GeopoliticalRisk"]),
      n5: getNumber(row, ["n5PriceVolatility", "n5PriceVol"]) ?? getNumber(components ?? {}, ["n5PriceVolatility"]),
    },
  };
}

export function mapFoodMonitorRiskDashboard(currentValue: unknown, historyValue: unknown): DashboardRiskDashboard | null {
  const current = mapFoodMonitorCfsrRecord(currentValue);
  const historyRows = asRecord(historyValue)?.data;
  const history = Array.isArray(historyRows)
    ? historyRows.map(mapFoodMonitorCfsrRecord).filter((row): row is DashboardRiskRecord => row !== null)
    : [];

  const mergedHistory = history.length > 0 ? history : current ? [current] : [];
  if (!current && mergedHistory.length === 0) return null;

  return {
    current: current ?? mergedHistory[0] ?? null,
    history: mergedHistory,
    source: "cfsr_snapshots",
  };
}

export function mapFoodMonitorFuzzyDashboard(value: unknown): DashboardFuzzyStateDashboard | null {
  const row = asRecord(value);
  if (!row) return null;

  const computedAt = getDate(row, ["computedAt", "computed_at", "snapshotAt", "snapshot_at", "createdAt"]);
  const current: DashboardFuzzyStateRecord = {
    fertilizerPressureState: getString(row, ["fertilizerPressureState", "fertilizer_pressure_state", "fertilizerState"]),
    priceTrendState: getString(row, ["priceTrendState", "price_trend_state", "priceState"]),
    compoundState: getString(row, ["compoundState", "compound_state", "state", "fuzzyState"]),
    score: getNumber(row, ["score", "fuzzyScore", "fuzzy_score", "riskScore"]),
    confidence: getNumber(row, ["confidence", "scoreConfidence", "score_confidence"]),
    coverage: getNumber(row, ["coverage", "scoreCoverage", "score_coverage"]),
    snapshotAt: computedAt ? computedAt.toISOString() : null,
  };

  return { current, history: [current], source: "fuzzy_states" };
}

export function mapFoodMonitorNewsList(value: unknown, limit: number): DashboardNewsRecord[] | null {
  const rows = asRecord(value)?.data;
  if (!Array.isArray(rows)) return null;

  return rows
    .map((value) => {
      const row = asRecord(value);
      if (!row) return null;
      const primaryCommodity = getString(row, ["primaryCommodity", "primary_commodity"]);
      const record: DashboardNewsRecord = {
        id: getString(row, ["id"]) ?? getNumber(row, ["id"]) ?? crypto.randomUUID(),
        headline: getString(row, ["title", "headline"]) ?? "Untitled",
        summary: getString(row, ["implication", "summary", "description"]),
        source: getString(row, ["source", "sourceId", "source_id"]),
        url: getString(row, ["url"]),
        category: getString(row, ["eventType", "event_type", "category"]) ?? "other",
        impactScore: getNumber(row, ["insightScore", "insight_score", "impactScore", "impact_score"]),
        sentimentScore: getNumber(row, ["sentimentScore", "sentiment_score"]),
        severity: getString(row, ["severity"]),
        sentimentSide: getString(row, ["sentimentSide", "sentiment_side"]),
        affectedCountries: [],
        affectedCommodities: primaryCommodity ? [primaryCommodity] : [],
        publishedAt: getString(row, ["publishedAt", "published_at"]) ?? new Date().toISOString(),
      };
      return record;
    })
    .filter((row): row is DashboardNewsRecord => row !== null)
    .slice(0, limit);
}

export function mapFoodMonitorAiDashboard(value: unknown): DashboardAiAnalysisDashboard | null {
  const row = asRecord(value);
  if (!row) return null;

  const content = getString(row, ["content", "summary", "answer"]);
  if (!content) return null;

  const generatedAt = getDate(row, ["generatedAt", "generated_at"]);
  const type = getString(row, ["type"]) ?? "cfsr_analysis";
  const current: DashboardAiAnalysisRecord = {
    id: getString(row, ["id"]) ?? `${type}-${generatedAt?.toISOString() ?? Date.now()}`,
    title: type.replace(/_/g, " "),
    summary: content,
    recommendation: getString(row, ["recommendation"]),
    riskLevel: getString(row, ["riskLevel", "risk_level"]),
    confidence: getNumber(row, ["confidence", "analysisConfidence", "analysis_confidence"]),
    commodity: getString(row, ["commodity", "primaryCommodity", "primary_commodity"]),
    model: getString(row, ["model", "modelName", "model_name"]),
    generatedAt: generatedAt ? generatedAt.toISOString() : null,
  };

  return { current, history: [current], source: "ai_analyses" };
}
