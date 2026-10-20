import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  date,
  varchar,
  float,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

// ── Tier 1: Users & Scans ─────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const scans = mysqlTable("scans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  localId: varchar("localId", { length: 64 }).notNull(),
  imageUrl: text("imageUrl"),
  diseaseName: varchar("diseaseName", { length: 128 }),
  diseaseKey: varchar("diseaseKey", { length: 64 }),
  confidence: float("confidence"),
  severity: mysqlEnum("severity", ["healthy", "mild", "moderate", "severe"]),
  cropVariety: varchar("cropVariety", { length: 128 }),
  fieldId: varchar("fieldId", { length: 128 }),
  latitude: float("latitude"),
  longitude: float("longitude"),
  notes: text("notes"),
  synced: boolean("synced").default(true).notNull(),
  scannedAt: timestamp("scannedAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Scan = typeof scans.$inferSelect;
export type InsertScan = typeof scans.$inferInsert;

// ── Tier 2: Soil Readings & Fertiliser Plans ──────────────────────────────────

export const soilReadings = mysqlTable("soil_readings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fieldId: varchar("fieldId", { length: 128 }).notNull(),
  plotLabel: varchar("plotLabel", { length: 64 }),
  nitrogen: float("nitrogen").notNull(),   // mg/kg
  phosphorus: float("phosphorus").notNull(), // mg/kg
  potassium: float("potassium").notNull(),  // mg/kg
  ph: float("ph").notNull(),               // 0–14
  organicMatter: float("organicMatter"),   // %
  moisture: float("moisture"),             // %
  temperature: float("temperature"),       // °C
  cropVariety: varchar("cropVariety", { length: 128 }),
  growthStage: varchar("growthStage", { length: 64 }),
  latitude: float("latitude"),
  longitude: float("longitude"),
  notes: text("notes"),
  recordedAt: timestamp("recordedAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SoilReading = typeof soilReadings.$inferSelect;
export type InsertSoilReading = typeof soilReadings.$inferInsert;

export const fertiliserPlans = mysqlTable("fertiliser_plans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fieldId: varchar("fieldId", { length: 128 }).notNull(),
  soilReadingId: int("soilReadingId"),
  status: mysqlEnum("status", ["pending", "active", "completed"]).default("active").notNull(),
  // JSON: { summary, deficiencies[], plotMap[], applicationSchedule[], warnings[] }
  planData: json("planData").notNull(),
  totalAreaHa: float("totalAreaHa"),
  estimatedCostMyr: float("estimatedCostMyr"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FertiliserPlan = typeof fertiliserPlans.$inferSelect;
export type InsertFertiliserPlan = typeof fertiliserPlans.$inferInsert;

// ── Tier 3: News Items, Risk Scores, Market Data ──────────────────────────────

export const newsItems = mysqlTable("news_items", {
  id: int("id").autoincrement().primaryKey(),
  headline: text("headline").notNull(),
  summary: text("summary"),
  source: varchar("source", { length: 128 }),
  url: text("url"),
  category: mysqlEnum("category", ["conflict", "weather", "supply_chain", "price", "policy", "other"]).default("other").notNull(),
  sentiment: mysqlEnum("sentiment", ["positive", "neutral", "negative"]).default("neutral").notNull(),
  sentimentScore: float("sentimentScore"),  // -1.0 to 1.0
  impactScore: float("impactScore"),        // 0 to 10
  affectedCountries: json("affectedCountries"), // string[]
  affectedCommodities: json("affectedCommodities"), // string[]
  publishedAt: timestamp("publishedAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type NewsItem = typeof newsItems.$inferSelect;
export type InsertNewsItem = typeof newsItems.$inferInsert;

export const riskScores = mysqlTable("risk_scores", {
  id: int("id").autoincrement().primaryKey(),
  country: varchar("country", { length: 64 }).notNull(),
  countryCode: varchar("countryCode", { length: 4 }),
  scrsScore: float("scrsScore").notNull(),           // 0–100 (higher = more risk)
  newsSentimentScore: float("newsSentimentScore"),   // component 1
  shippingDisruptionScore: float("shippingDisruptionScore"), // component 2
  weatherAnomalyScore: float("weatherAnomalyScore"), // component 3
  priceMomentumScore: float("priceMomentumScore"),   // component 4
  riskLevel: mysqlEnum("riskLevel", ["low", "moderate", "high", "critical"]).default("low").notNull(),
  // JSON: { produceMore[], produceLess[], alerts[], recommendations[] }
  profileData: json("profileData"),
  computedAt: timestamp("computedAt").defaultNow().notNull(),
});

export type RiskScore = typeof riskScores.$inferSelect;
export type InsertRiskScore = typeof riskScores.$inferInsert;

export const fxSnapshots = mysqlTable("fx_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  currency: varchar("currency", { length: 8 }).notNull(),
  rate: float("rate").notNull(),
  buyingRate: float("buyingRate").notNull(),
  middleRate: float("middleRate"),
  sellingRate: float("sellingRate"),
  observedAt: timestamp("observedAt").notNull(),
  source: varchar("source", { length: 64 }).default("live_bnm_api").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FxSnapshot = typeof fxSnapshots.$inferSelect;
export type InsertFxSnapshot = typeof fxSnapshots.$inferInsert;

export const cfsrSnapshots = mysqlTable("cfsr_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  cfsr: float("cfsr").notNull(),
  riskBand: varchar("risk_band", { length: 32 }),
  band: varchar("band", { length: 32 }),
  components: json("components"),
  componentMeta: json("component_meta"),
  scoreConfidence: float("score_confidence"),
  scoreCoverage: float("score_coverage"),
  delta: float("delta"),
  dataSourcesSummary: text("data_sources_summary"),
  computedAt: timestamp("computed_at"),
  n1ImportDep: float("n1ImportDep"),
  n2SupplyChain: float("n2SupplyChain"),
  n3Fertilizer: float("n3Fertilizer"),
  n4Geopolitical: float("n4Geopolitical"),
  n5PriceVol: float("n5PriceVol"),
  confidence: float("confidence"),
  coverage: float("coverage"),
  snapshotAt: timestamp("snapshotAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CfsrSnapshot = typeof cfsrSnapshots.$inferSelect;
export type InsertCfsrSnapshot = typeof cfsrSnapshots.$inferInsert;

export const ingestLog = mysqlTable("ingest_log", {
  id: int("id").autoincrement().primaryKey(),
  job: varchar("job", { length: 128 }).notNull(),
  success: boolean("success").default(false).notNull(),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  durationMs: int("duration_ms"),
  rowsWritten: int("rows_written"),
  error: text("error"),
  isFallback: boolean("is_fallback").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type IngestLog = typeof ingestLog.$inferSelect;
export type InsertIngestLog = typeof ingestLog.$inferInsert;

export const fuzzyStates = mysqlTable("fuzzy_states", {
  id: int("id").autoincrement().primaryKey(),
  fertilizerPressureState: varchar("fertilizer_pressure_state", { length: 64 }),
  priceTrendState: varchar("price_trend_state", { length: 64 }),
  compoundState: varchar("compound_state", { length: 64 }),
  score: float("score"),
  confidence: float("confidence"),
  coverage: float("coverage"),
  membershipScores: json("membership_scores"),
  computedAt: timestamp("computed_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type FuzzyState = typeof fuzzyStates.$inferSelect;
export type InsertFuzzyState = typeof fuzzyStates.$inferInsert;

export const aiAnalyses = mysqlTable("ai_analyses", {
  id: varchar("id", { length: 128 }).primaryKey(),
  type: varchar("type", { length: 128 }).notNull(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  content: text("content").notNull(),
  structuredOutput: json("structured_output"),
  promptHash: varchar("prompt_hash", { length: 128 }),
  dataContext: json("data_context"),
  model: varchar("model", { length: 128 }),
  confidence: float("confidence"),
  commodity: varchar("commodity", { length: 128 }),
});

export type AiAnalysis = typeof aiAnalyses.$inferSelect;
export type InsertAiAnalysis = typeof aiAnalyses.$inferInsert;

export const commodityPrices = mysqlTable("commodity_prices", {
  id: varchar("id", { length: 128 }).primaryKey(),
  sourceId: varchar("source_id", { length: 64 }).notNull(),
  seriesType: varchar("series_type", { length: 64 }),
  commodityId: varchar("commodity_id", { length: 128 }),
  commodityName: varchar("commodity_name", { length: 255 }),
  commodityCategory: varchar("commodity_category", { length: 128 }),
  locationLevel: varchar("location_level", { length: 64 }),
  locationName: varchar("location_name", { length: 128 }),
  date: date("date"),
  priceMyr: float("price_myr"),
  priceUsd: float("price_usd"),
  unitCanonical: varchar("unit_canonical", { length: 64 }),
  sourceUrl: text("source_url"),
  ingestedAt: timestamp("ingested_at").defaultNow().notNull(),
});

export type CommodityPrice = typeof commodityPrices.$inferSelect;
export type InsertCommodityPrice = typeof commodityPrices.$inferInsert;

export const pricecatcherPrices = mysqlTable("pricecatcher_prices", {
  id: int("id").autoincrement().primaryKey(),
  date: date("date").notNull(),
  price: float("price"),
  item: varchar("item", { length: 255 }),
  unit: varchar("unit", { length: 64 }),
  itemCategory: varchar("item_category", { length: 128 }),
  premise: varchar("premise", { length: 255 }),
  premiseType: varchar("premise_type", { length: 128 }),
  state: varchar("state", { length: 128 }),
  district: varchar("district", { length: 128 }),
  ingestedAt: timestamp("ingested_at").defaultNow().notNull(),
});

export type PricecatcherPrice = typeof pricecatcherPrices.$inferSelect;
export type InsertPricecatcherPrice = typeof pricecatcherPrices.$inferInsert;

export const worldbankCommodities = mysqlTable("worldbank_commodities", {
  commodityCode: varchar("commodity_code", { length: 64 }).primaryKey(),
  sourceHeader: varchar("source_header", { length: 255 }),
  displayName: varchar("display_name", { length: 255 }),
  category: varchar("category", { length: 128 }),
  subcategory: varchar("subcategory", { length: 128 }),
  unit: varchar("unit", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type WorldbankCommodity = typeof worldbankCommodities.$inferSelect;
export type InsertWorldbankCommodity = typeof worldbankCommodities.$inferInsert;

export const worldbankPrices = mysqlTable("worldbank_prices", {
  id: int("id").autoincrement().primaryKey(),
  date: date("date").notNull(),
  monthCode: varchar("month_code", { length: 16 }),
  commodityCode: varchar("commodity_code", { length: 64 }).notNull(),
  priceUsd: float("price_usd"),
  unit: varchar("unit", { length: 64 }),
  sourceUrl: text("source_url"),
  workbookUpdatedAt: timestamp("workbook_updated_at"),
  ingestedAt: timestamp("ingested_at").defaultNow().notNull(),
});

export type WorldbankPrice = typeof worldbankPrices.$inferSelect;
export type InsertWorldbankPrice = typeof worldbankPrices.$inferInsert;

export const newsArticles = mysqlTable("news_articles", {
  id: varchar("id", { length: 128 }).primaryKey(),
  sourceId: varchar("source_id", { length: 128 }),
  source: varchar("source", { length: 128 }),
  url: text("url").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  publishedAt: timestamp("published_at").notNull(),
  ingestedAt: timestamp("ingested_at").defaultNow().notNull(),
});

export type NewsArticle = typeof newsArticles.$inferSelect;
export type InsertNewsArticle = typeof newsArticles.$inferInsert;

export const articleAnalyses = mysqlTable("article_analyses", {
  id: int("id").autoincrement().primaryKey(),
  articleId: varchar("article_id", { length: 128 }).notNull(),
  sentimentScore: float("sentiment_score"),
  insightScore: float("insight_score"),
  severity: varchar("severity", { length: 32 }),
  isAlert: boolean("is_alert").default(false),
  primaryCommodity: varchar("primary_commodity", { length: 128 }),
  implication: text("implication"),
  sentimentSide: varchar("sentiment_side", { length: 32 }),
  matchedKeywords: json("matched_keywords"),
  matchedKeywordScore: float("matched_keyword_score"),
  matchDetails: json("match_details"),
  usedBroadFallback: boolean("used_broad_fallback"),
  foodSecurityRelevance: float("food_security_relevance"),
  eventType: varchar("event_type", { length: 128 }),
  sourceAuthority: float("source_authority"),
  analysisConfidence: float("analysis_confidence"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ArticleAnalysis = typeof articleAnalyses.$inferSelect;
export type InsertArticleAnalysis = typeof articleAnalyses.$inferInsert;

export const fuelPrices = mysqlTable("fuel_prices", {
  id: int("id").autoincrement().primaryKey(),
  date: date("date").notNull(),
  ron95: float("ron95"),
  ron97: float("ron97"),
  diesel: float("diesel"),
  ron95Budi95: float("ron95_budi95"),
  dieselEastMsia: float("diesel_east_msia"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type FuelPrice = typeof fuelPrices.$inferSelect;
export type InsertFuelPrice = typeof fuelPrices.$inferInsert;

export const fxRates = mysqlTable("fx_rates", {
  id: int("id").autoincrement().primaryKey(),
  currency: varchar("currency", { length: 8 }).notNull(),
  date: date("date").notNull(),
  rate: float("rate").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type FxRate = typeof fxRates.$inferSelect;
export type InsertFxRate = typeof fxRates.$inferInsert;

export const macroIndicators = mysqlTable("macro_indicators", {
  id: int("id").autoincrement().primaryKey(),
  date: date("date").notNull(),
  indicatorType: varchar("indicator_type", { length: 128 }),
  type: varchar("type", { length: 128 }),
  value: float("value"),
  baseCurrency: varchar("base_currency", { length: 16 }),
  targetCurrency: varchar("target_currency", { length: 16 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type MacroIndicator = typeof macroIndicators.$inferSelect;
export type InsertMacroIndicator = typeof macroIndicators.$inferInsert;

export const manualBaselines = mysqlTable("manual_baselines", {
  id: int("id").autoincrement().primaryKey(),
  baselineKey: varchar("key", { length: 128 }).notNull(),
  value: float("value").notNull(),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ManualBaseline = typeof manualBaselines.$inferSelect;
export type InsertManualBaseline = typeof manualBaselines.$inferInsert;
