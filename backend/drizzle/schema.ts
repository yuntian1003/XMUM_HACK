import {
  serial,
  text,
  timestamp,
  date,
  varchar,
  real,
  doublePrecision,
  boolean,
  jsonb,
  pgTable,
  integer,
} from "drizzle-orm/pg-core";

// ── Auth Users (Supabase Persistent Auth) ─────────────────────────────────────

export const localAuthUsers = pgTable("local_auth_users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: text("name").notNull(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  salt: varchar("salt", { length: 64 }).notNull(),
  passwordHash: varchar("password_hash", { length: 256 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type LocalAuthUserRow = typeof localAuthUsers.$inferSelect;
export type InsertLocalAuthUserRow = typeof localAuthUsers.$inferInsert;

// ── Tier 1: Users & Scans ─────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: text("role").$type<"user" | "admin">().default("user").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const scans = pgTable("scans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  localId: varchar("local_id", { length: 64 }).notNull(),
  imageUrl: text("image_url"),
  diseaseName: varchar("disease_name", { length: 128 }),
  diseaseKey: varchar("disease_key", { length: 64 }),
  confidence: doublePrecision("confidence"),
  severity: text("severity").$type<"healthy" | "mild" | "moderate" | "severe">(),
  cropVariety: varchar("crop_variety", { length: 128 }),
  fieldId: varchar("field_id", { length: 128 }),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  notes: text("notes"),
  synced: boolean("synced").default(true).notNull(),
  scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Scan = typeof scans.$inferSelect;
export type InsertScan = typeof scans.$inferInsert;

// ── Tier 2: Soil Readings & Fertiliser Plans ──────────────────────────────────

export const soilReadings = pgTable("soil_readings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  fieldId: varchar("field_id", { length: 128 }).notNull(),
  plotLabel: varchar("plot_label", { length: 64 }),
  nitrogen: doublePrecision("nitrogen").notNull(),   // mg/kg
  phosphorus: doublePrecision("phosphorus").notNull(), // mg/kg
  potassium: doublePrecision("potassium").notNull(),  // mg/kg
  ph: doublePrecision("ph").notNull(),               // 0–14
  organicMatter: doublePrecision("organic_matter"),   // %
  moisture: doublePrecision("moisture"),             // %
  temperature: doublePrecision("temperature"),       // °C
  cropVariety: varchar("crop_variety", { length: 128 }),
  growthStage: varchar("growth_stage", { length: 64 }),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  notes: text("notes"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type SoilReading = typeof soilReadings.$inferSelect;
export type InsertSoilReading = typeof soilReadings.$inferInsert;

export const fertiliserPlans = pgTable("fertiliser_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  fieldId: varchar("field_id", { length: 128 }).notNull(),
  soilReadingId: integer("soil_reading_id"),
  status: text("status").$type<"pending" | "active" | "completed">().default("active").notNull(),
  planData: jsonb("plan_data").notNull(),
  totalAreaHa: doublePrecision("total_area_ha"),
  estimatedCostMyr: doublePrecision("estimated_cost_myr"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type FertiliserPlan = typeof fertiliserPlans.$inferSelect;
export type InsertFertiliserPlan = typeof fertiliserPlans.$inferInsert;

// ── Tier 3: News Items, Risk Scores, Market Data ──────────────────────────────

export const newsItems = pgTable("news_items", {
  id: serial("id").primaryKey(),
  headline: text("headline").notNull(),
  summary: text("summary"),
  source: varchar("source", { length: 128 }),
  url: text("url"),
  category: text("category").$type<"conflict" | "weather" | "supply_chain" | "price" | "policy" | "other">().default("other").notNull(),
  sentiment: text("sentiment").$type<"positive" | "neutral" | "negative">().default("neutral").notNull(),
  sentimentScore: doublePrecision("sentiment_score"),  // -1.0 to 1.0
  impactScore: doublePrecision("impact_score"),        // 0 to 10
  affectedCountries: jsonb("affected_countries"), // string[]
  affectedCommodities: jsonb("affected_commodities"), // string[]
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type NewsItem = typeof newsItems.$inferSelect;
export type InsertNewsItem = typeof newsItems.$inferInsert;

export const riskScores = pgTable("risk_scores", {
  id: serial("id").primaryKey(),
  country: varchar("country", { length: 64 }).notNull(),
  countryCode: varchar("country_code", { length: 4 }),
  scrsScore: doublePrecision("scrs_score").notNull(),           // 0–100 (higher = more risk)
  newsSentimentScore: doublePrecision("news_sentiment_score"),   // component 1
  shippingDisruptionScore: doublePrecision("shipping_disruption_score"), // component 2
  weatherAnomalyScore: doublePrecision("weather_anomaly_score"), // component 3
  priceMomentumScore: doublePrecision("price_momentum_score"),   // component 4
  riskLevel: text("risk_level").$type<"low" | "moderate" | "high" | "critical">().default("low").notNull(),
  profileData: jsonb("profile_data"),
  computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow().notNull(),
});

export type RiskScore = typeof riskScores.$inferSelect;
export type InsertRiskScore = typeof riskScores.$inferInsert;

export const fxSnapshots = pgTable("fx_snapshots", {
  id: serial("id").primaryKey(),
  currency: varchar("currency", { length: 8 }).notNull(),
  rate: doublePrecision("rate").notNull(),
  buyingRate: doublePrecision("buying_rate").notNull(),
  middleRate: doublePrecision("middle_rate"),
  sellingRate: doublePrecision("selling_rate"),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  source: varchar("source", { length: 64 }).default("live_bnm_api").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type FxSnapshot = typeof fxSnapshots.$inferSelect;
export type InsertFxSnapshot = typeof fxSnapshots.$inferInsert;

export const cfsrSnapshots = pgTable("cfsr_snapshots", {
  id: serial("id").primaryKey(),
  cfsr: doublePrecision("cfsr").notNull(),
  riskBand: varchar("risk_band", { length: 32 }),
  band: varchar("band", { length: 32 }),
  components: jsonb("components"),
  componentMeta: jsonb("component_meta"),
  scoreConfidence: doublePrecision("score_confidence"),
  scoreCoverage: doublePrecision("score_coverage"),
  delta: doublePrecision("delta"),
  dataSourcesSummary: text("data_sources_summary"),
  computedAt: timestamp("computed_at", { withTimezone: true }),
  n1ImportDep: doublePrecision("n1_import_dep"),
  n2SupplyChain: doublePrecision("n2_supply_chain"),
  n3Fertilizer: doublePrecision("n3_fertilizer"),
  n4Geopolitical: doublePrecision("n4_geopolitical"),
  n5PriceVol: doublePrecision("n5_price_vol"),
  confidence: doublePrecision("confidence"),
  coverage: doublePrecision("coverage"),
  snapshotAt: timestamp("snapshot_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CfsrSnapshot = typeof cfsrSnapshots.$inferSelect;
export type InsertCfsrSnapshot = typeof cfsrSnapshots.$inferInsert;

export const ingestLog = pgTable("ingest_log", {
  id: serial("id").primaryKey(),
  job: varchar("job", { length: 128 }).notNull(),
  success: boolean("success").default(false).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  durationMs: integer("duration_ms"),
  rowsWritten: integer("rows_written"),
  error: text("error"),
  isFallback: boolean("is_fallback").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type IngestLog = typeof ingestLog.$inferSelect;
export type InsertIngestLog = typeof ingestLog.$inferInsert;

export const fuzzyStates = pgTable("fuzzy_states", {
  id: serial("id").primaryKey(),
  fertilizerPressureState: varchar("fertilizer_pressure_state", { length: 64 }),
  priceTrendState: varchar("price_trend_state", { length: 64 }),
  compoundState: varchar("compound_state", { length: 64 }),
  score: doublePrecision("score"),
  confidence: doublePrecision("confidence"),
  coverage: doublePrecision("coverage"),
  membershipScores: jsonb("membership_scores"),
  computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type FuzzyState = typeof fuzzyStates.$inferSelect;
export type InsertFuzzyState = typeof fuzzyStates.$inferInsert;

export const aiAnalyses = pgTable("ai_analyses", {
  id: varchar("id", { length: 128 }).primaryKey(),
  type: varchar("type", { length: 128 }).notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
  content: text("content").notNull(),
  structuredOutput: jsonb("structured_output"),
  promptHash: varchar("prompt_hash", { length: 128 }),
  dataContext: jsonb("data_context"),
  model: varchar("model", { length: 128 }),
  confidence: doublePrecision("confidence"),
  commodity: varchar("commodity", { length: 128 }),
});

export type AiAnalysis = typeof aiAnalyses.$inferSelect;
export type InsertAiAnalysis = typeof aiAnalyses.$inferInsert;

export const commodityPrices = pgTable("commodity_prices", {
  id: varchar("id", { length: 128 }).primaryKey(),
  sourceId: varchar("source_id", { length: 64 }).notNull(),
  seriesType: varchar("series_type", { length: 64 }),
  commodityId: varchar("commodity_id", { length: 128 }),
  commodityName: varchar("commodity_name", { length: 255 }),
  commodityCategory: varchar("commodity_category", { length: 128 }),
  locationLevel: varchar("location_level", { length: 64 }),
  locationName: varchar("location_name", { length: 128 }),
  date: date("date"),
  priceMyr: doublePrecision("price_myr"),
  priceUsd: doublePrecision("price_usd"),
  unitCanonical: varchar("unit_canonical", { length: 64 }),
  sourceUrl: text("source_url"),
  ingestedAt: timestamp("ingested_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CommodityPrice = typeof commodityPrices.$inferSelect;
export type InsertCommodityPrice = typeof commodityPrices.$inferInsert;

export const pricecatcherPrices = pgTable("pricecatcher_prices", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  price: doublePrecision("price"),
  item: varchar("item", { length: 255 }),
  unit: varchar("unit", { length: 64 }),
  itemCategory: varchar("item_category", { length: 128 }),
  premise: varchar("premise", { length: 255 }),
  premiseType: varchar("premise_type", { length: 128 }),
  state: varchar("state", { length: 128 }),
  district: varchar("district", { length: 128 }),
  ingestedAt: timestamp("ingested_at", { withTimezone: true }).defaultNow().notNull(),
});

export type PricecatcherPrice = typeof pricecatcherPrices.$inferSelect;
export type InsertPricecatcherPrice = typeof pricecatcherPrices.$inferInsert;

export const worldbankCommodities = pgTable("worldbank_commodities", {
  commodityCode: varchar("commodity_code", { length: 64 }).primaryKey(),
  sourceHeader: varchar("source_header", { length: 255 }),
  displayName: varchar("display_name", { length: 255 }),
  category: varchar("category", { length: 128 }),
  subcategory: varchar("subcategory", { length: 128 }),
  unit: varchar("unit", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type WorldbankCommodity = typeof worldbankCommodities.$inferSelect;
export type InsertWorldbankCommodity = typeof worldbankCommodities.$inferInsert;

export const worldbankPrices = pgTable("worldbank_prices", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  monthCode: varchar("month_code", { length: 16 }),
  commodityCode: varchar("commodity_code", { length: 64 }).notNull(),
  priceUsd: doublePrecision("price_usd"),
  unit: varchar("unit", { length: 64 }),
  sourceUrl: text("source_url"),
  workbookUpdatedAt: timestamp("workbook_updated_at", { withTimezone: true }),
  ingestedAt: timestamp("ingested_at", { withTimezone: true }).defaultNow().notNull(),
});

export type WorldbankPrice = typeof worldbankPrices.$inferSelect;
export type InsertWorldbankPrice = typeof worldbankPrices.$inferInsert;

export const newsArticles = pgTable("news_articles", {
  id: varchar("id", { length: 128 }).primaryKey(),
  sourceId: varchar("source_id", { length: 128 }),
  source: varchar("source", { length: 128 }),
  url: text("url").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
  ingestedAt: timestamp("ingested_at", { withTimezone: true }).defaultNow().notNull(),
});

export type NewsArticle = typeof newsArticles.$inferSelect;
export type InsertNewsArticle = typeof newsArticles.$inferInsert;

export const articleAnalyses = pgTable("article_analyses", {
  id: serial("id").primaryKey(),
  articleId: varchar("article_id", { length: 128 }).notNull(),
  sentimentScore: doublePrecision("sentiment_score"),
  insightScore: doublePrecision("insight_score"),
  severity: varchar("severity", { length: 32 }),
  isAlert: boolean("is_alert").default(false),
  primaryCommodity: varchar("primary_commodity", { length: 128 }),
  implication: text("implication"),
  sentimentSide: varchar("sentiment_side", { length: 32 }),
  matchedKeywords: jsonb("matched_keywords"),
  matchedKeywordScore: doublePrecision("matched_keyword_score"),
  matchDetails: jsonb("match_details"),
  usedBroadFallback: boolean("used_broad_fallback"),
  foodSecurityRelevance: doublePrecision("food_security_relevance"),
  eventType: varchar("event_type", { length: 128 }),
  sourceAuthority: doublePrecision("source_authority"),
  analysisConfidence: doublePrecision("analysis_confidence"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ArticleAnalysis = typeof articleAnalyses.$inferSelect;
export type InsertArticleAnalysis = typeof articleAnalyses.$inferInsert;

export const fuelPrices = pgTable("fuel_prices", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  ron95: doublePrecision("ron95"),
  ron97: doublePrecision("ron97"),
  diesel: doublePrecision("diesel"),
  ron95Budi95: doublePrecision("ron95_budi95"),
  dieselEastMsia: doublePrecision("diesel_east_msia"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type FuelPrice = typeof fuelPrices.$inferSelect;
export type InsertFuelPrice = typeof fuelPrices.$inferInsert;

export const fxRates = pgTable("fx_rates", {
  id: serial("id").primaryKey(),
  currency: varchar("currency", { length: 8 }).notNull(),
  date: date("date").notNull(),
  rate: doublePrecision("rate").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type FxRate = typeof fxRates.$inferSelect;
export type InsertFxRate = typeof fxRates.$inferInsert;

export const macroIndicators = pgTable("macro_indicators", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  indicatorType: varchar("indicator_type", { length: 128 }),
  type: varchar("type", { length: 128 }),
  value: doublePrecision("value"),
  baseCurrency: varchar("base_currency", { length: 16 }),
  targetCurrency: varchar("target_currency", { length: 16 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type MacroIndicator = typeof macroIndicators.$inferSelect;
export type InsertMacroIndicator = typeof macroIndicators.$inferInsert;

export const manualBaselines = pgTable("manual_baselines", {
  id: serial("id").primaryKey(),
  baselineKey: varchar("baseline_key", { length: 128 }).notNull(),
  value: doublePrecision("value").notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ManualBaseline = typeof manualBaselines.$inferSelect;
export type InsertManualBaseline = typeof manualBaselines.$inferInsert;
