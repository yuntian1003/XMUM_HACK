import { Fragment, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  Building2,
  Database,
  Newspaper,
  Search,
  ShieldCheck,
  Table2,
  Truck,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import DashboardAssistantChat from "@/components/dashboard/DashboardAssistantChat";
import StructuredAiPanel from "@/components/dashboard/StructuredAiPanel";
import { trpc } from "@/lib/trpc";
import {
  clamp,
  dashboardShell,
  formatDateTime,
  normalizeRiskBand,
  riskBadgeClass,
  stateBadgeClass,
  toRelativeTime,
  type RiskBand,
} from "@/lib/dashboardStyle";

type GovTab = "overview" | "prices" | "supply" | "news" | "ai";

type ComponentKey =
  | "n1ImportDependency"
  | "n2SupplyChainHealth"
  | "n3FertilizerAvailability"
  | "n4GeopoliticalRisk"
  | "n5PriceVolatility";

type CfsrResponse = {
  cfsr?: number | string | null;
  riskBand?: string | null;
  components?: Partial<Record<ComponentKey, number | string | null>>;
  componentMeta?: Partial<Record<ComponentKey, unknown>>;
  scoreConfidence?: number | string | null;
  scoreCoverage?: number | string | null;
  delta?: number | string | null;
  computedAt?: string | null;
  dataSourcesSummary?: string[] | string | null;
};

type CfsrHistoryResponse = {
  data?: Array<{ cfsr?: number | string | null; riskBand?: string | null; computedAt?: string | null }> | null;
  _meta?: Record<string, unknown> | null;
};

type DashboardIndex = {
  score?: number | string | null;
  coverage?: number | string | null;
  status?: string | null;
  source?: string | null;
  latestCanonicalDate?: string | null;
};

type DashboardIndicesResponse = {
  data?: Partial<Record<IndexKey, DashboardIndex | null>> | null;
};

type IndexKey =
  | "retailPriceStress"
  | "statePriceDispersion"
  | "inputCostStress"
  | "globalCommodityStress"
  | "newsAttention"
  | "dataQuality";

type FuzzyStateResponse = {
  fertilizer?: string | null;
  priceTrend?: string | null;
  newsVolume?: string | null;
  compound?: string | null;
  membershipScores?: unknown;
  conflicts?: unknown;
  computedAt?: string | null;
};

type PriceRow = {
  commodityCode?: string | null;
  commodityName?: string | null;
  displayName?: string | null;
  sourceHeader?: string | null;
  priceMyr?: number | string | null;
  priceUsd?: number | string | null;
  date?: string | null;
  state?: string | null;
  unit?: string | null;
  unitCanonical?: string | null;
  seriesType?: string | null;
  sourceId?: string | null;
  category?: string | null;
  subcategory?: string | null;
  sourceUrl?: string | null;
  workbookUpdatedAt?: string | null;
};

type CurrentPricesResponse = {
  data?: PriceRow[] | null;
  _meta?: { source?: string | null; series?: string | null; [key: string]: unknown } | null;
};

type PriceTrendResponse = {
  data?: Array<{ date?: string | null; price?: number | string | null }> | null;
  trendPct?: number | string | null;
  _meta?: { source?: string | null; series?: string | null; [key: string]: unknown } | null;
};

type WorldBankPriceSeries = {
  commodityCode?: string | null;
  commodityLabel?: string | null;
  category?: string | null;
  subcategory?: string | null;
  unit?: string | null;
  sourceUrl?: string | null;
  workbookUpdatedAt?: string | null;
  latestPriceUsd?: number | string | null;
  previousPriceUsd?: number | string | null;
  latestDate?: string | null;
  changePct?: number | string | null;
};

type WorldBankPricesResponse = {
  series?: WorldBankPriceSeries[] | null;
  lastUpdated?: string | null;
  source?: string | null;
};

type WorldBankCommodity = {
  commodityCode?: string | null;
  label?: string | null;
  category?: string | null;
  unit?: string | null;
};

type WorldBankCommoditiesResponse = {
  commodities?: WorldBankCommodity[] | null;
  source?: string | null;
};

type WorldBankDisplayRow = {
  commodityCode: string;
  displayName: string;
  category?: string | null;
  subcategory?: string | null;
  priceUsd?: number | string | null;
  previousPriceUsd?: number | string | null;
  latestDate?: string | null;
  changePct?: number | string | null;
  unit?: string | null;
  sourceUrl?: string | null;
  workbookUpdatedAt?: string | null;
};

type NewsRow = {
  title?: string | null;
  url?: string | null;
  source?: string | null;
  publishedAt?: string | null;
  sentimentScore?: number | string | null;
  insightScore?: number | string | null;
  severity?: string | null;
  isAlert?: boolean | null;
  primaryCommodity?: string | null;
  implication?: string | null;
  sentimentSide?: string | null;
  matchedKeywords?: unknown;
  foodSecurityRelevance?: unknown;
  eventType?: string | null;
  sourceAuthority?: unknown;
  analysisConfidence?: number | string | null;
};

type NewsResponse = {
  data?: NewsRow[] | null;
  _meta?: { source?: string | null; [key: string]: unknown } | null;
};

type AiAnalysisResponse = {
  content?: string | null;
  structuredOutput?: unknown;
  generatedAt?: string | null;
  dataContext?: unknown;
  promptHash?: string | null;
  _meta?: { source?: string | null; [key: string]: unknown } | null;
};

type LiveRun = {
  job?: string | null;
  success?: boolean | null;
  startedAt?: string | Date | null;
  durationMs?: number | string | null;
  rowsWritten?: number | string | null;
  error?: string | null;
};

type LiveDataResponse = {
  lastRuns?: LiveRun[] | null;
  allRecentLogs?: LiveRun[] | null;
};

const COMPONENTS: Array<{ key: ComponentKey; code: string; label: string }> = [
  { key: "n1ImportDependency", code: "N1", label: "Import Dependency" },
  { key: "n2SupplyChainHealth", code: "N2", label: "Supply Chain Health" },
  { key: "n3FertilizerAvailability", code: "N3", label: "Fertilizer Access" },
  { key: "n4GeopoliticalRisk", code: "N4", label: "Global Political Risk" },
  { key: "n5PriceVolatility", code: "N5", label: "Price Stability" },
];

const INDEX_CARDS: Array<{ key: IndexKey; title: string; question: string; icon: typeof Activity }> = [
  { key: "retailPriceStress", title: "Retail Price Stress", question: "Are retail prices abnormally high?", icon: Activity },
  { key: "statePriceDispersion", title: "State Price Dispersion", question: "How much do prices vary across states?", icon: BarChart3 },
  { key: "inputCostStress", title: "Input Cost Stress", question: "Are farming input costs elevated?", icon: Truck },
  { key: "globalCommodityStress", title: "Global Commodity Stress", question: "Are world food prices elevated?", icon: ShieldCheck },
  { key: "newsAttention", title: "News Attention", question: "How much food-crisis news coverage?", icon: Newspaper },
  { key: "dataQuality", title: "Data Quality", question: "How fresh and complete is our data?", icon: Database },
];

const TABS: Array<{ id: GovTab; label: string; icon: typeof BarChart3 }> = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "prices", label: "Price Intel", icon: Table2 },
  { id: "supply", label: "Supply Risk", icon: Truck },
  { id: "news", label: "News", icon: Newspaper },
  { id: "ai", label: "AI Analysis", icon: Brain },
];

const FIELD_LABELS: Record<string, string> = {
  n1ImportDependency: "Import Dependency",
  n2SupplyChainHealth: "Supply Chain Health",
  n3FertilizerAvailability: "Fertilizer Access",
  n4GeopoliticalRisk: "Global Political Risk",
  n5PriceVolatility: "Price Stability",
  retailPriceStress: "Retail Price Stress",
  statePriceDispersion: "State Price Dispersion",
  inputCostStress: "Input Cost Stress",
  globalCommodityStress: "Global Commodity Stress",
  newsAttention: "News Attention",
  dataQuality: "Data Quality",
};

const COMMODITY_NAME_OVERRIDES: Record<string, string> = {
  "BAWANG BESAR IMPORT (CHINA)": "Large Onion (Imported, China)",
  "BAWANG KECIL MERAH BIASA IMPORT (INDIA)": "Small Red Onion (Imported, India)",
  "BAWANG PUTIH IMPORT (CHINA)": "Garlic (Imported, China)",
  "CILI MERAH": "Red Chilli",
  "CILI PADI": "Bird's Eye Chilli",
  "AYAM BERSIH - STANDARD": "Chicken (Standard)",
  "TELUR AYAM GRED A": "Chicken Eggs (Grade A)",
  "TELUR AYAM GRED B": "Chicken Eggs (Grade B)",
  "TELUR AYAM GRED C": "Chicken Eggs (Grade C)",
  "MINYAK MASAK TULEN": "Cooking Oil",
  "GULA PASIR BERTAPIS": "Refined Sugar",
  "BERAS IMPORT": "Rice (Imported)",
  "BERAS TEMPATAN": "Rice (Local)",
};

const COMMODITY_TERM_TRANSLATIONS: Array<[string, string]> = [
  ["bawang kecil merah biasa", "Small Red Onion"],
  ["bawang besar", "Large Onion"],
  ["bawang putih", "Garlic"],
  ["bawang merah", "Red Onion"],
  ["cili merah", "Red Chilli"],
  ["cili padi", "Bird's Eye Chilli"],
  ["minyak masak", "Cooking Oil"],
  ["gula pasir", "Sugar"],
  ["beras", "Rice"],
  ["ayam", "Chicken"],
  ["telur", "Eggs"],
  ["ikan", "Fish"],
  ["daging", "Meat"],
  ["sawi", "Mustard Greens"],
  ["kangkung", "Water Spinach"],
  ["bayam", "Spinach"],
  ["kubis", "Cabbage"],
  ["tomato", "Tomato"],
  ["import", "Imported"],
  ["tempatan", "Local"],
  ["gred", "Grade"],
  ["biasa", "Standard"],
];

export default function GovernmentDashboard() {
  const [activeTab, setActiveTab] = useState<GovTab>("overview");
  const [priceSearch, setPriceSearch] = useState("");
  const [priceCategory, setPriceCategory] = useState("all");
  const [selectedCommodity, setSelectedCommodity] = useState("");
  const [newsSeverity, setNewsSeverity] = useState("all");
  const [newsSide, setNewsSide] = useState("all");
  const [newsCommodity, setNewsCommodity] = useState("all");

  const cfsrQuery = trpc.risk.getCfsr.useQuery(undefined, { refetchInterval: 60 * 60_000 });
  const historyQuery = trpc.risk.getCfsrHistory.useQuery({ days: 30 }, { refetchInterval: 60 * 60_000 });
  const indicesQuery = trpc.risk.getDashboardIndices.useQuery(undefined, { refetchInterval: 60 * 60_000 });
  const fuzzyQuery = trpc.risk.getFuzzyState.useQuery(undefined, { refetchInterval: 60 * 60_000 });
  const pricesQuery = trpc.prices.getCurrent.useQuery({}, { refetchInterval: 60 * 60_000 });
  const worldBankPricesQuery = trpc.worldbank.prices.useQuery({ months: 3 }, { refetchInterval: 60 * 60_000 });
  const worldBankCommoditiesQuery = trpc.worldbank.commodities.useQuery({ limit: 5000 }, { refetchInterval: 60 * 60_000 });
  const newsQuery = trpc.news.getLatest.useQuery({ limit: 50 }, { refetchInterval: 60 * 60_000 });
  const cfsrAnalysisQuery = trpc.ai.getAnalysis.useQuery({ type: "cfsr_analysis" }, { refetchInterval: 60 * 60_000 });
  const recommendationsQuery = trpc.ai.getAnalysis.useQuery({ type: "recommendations" }, { refetchInterval: 60 * 60_000 });
  const gapAnalysisQuery = trpc.ai.getAnalysis.useQuery({ type: "gap_analysis" }, { refetchInterval: 60 * 60_000 });
  const liveDataQuery = trpc.liveData.getStatus.useQuery(undefined, { refetchInterval: 5 * 60_000 });

  const cfsr = cfsrQuery.data as CfsrResponse | undefined;
  const history = historyQuery.data as CfsrHistoryResponse | undefined;
  const indices = indicesQuery.data as DashboardIndicesResponse | undefined;
  const fuzzy = fuzzyQuery.data as FuzzyStateResponse | undefined;
  const prices = pricesQuery.data as CurrentPricesResponse | undefined;
  const worldBankPrices = worldBankPricesQuery.data as WorldBankPricesResponse | undefined;
  const worldBankCommodities = worldBankCommoditiesQuery.data as WorldBankCommoditiesResponse | undefined;
  const news = newsQuery.data as NewsResponse | undefined;
  const cfsrAnalysis = cfsrAnalysisQuery.data as AiAnalysisResponse | undefined;
  const recommendations = recommendationsQuery.data as AiAnalysisResponse | undefined;
  const gapAnalysis = gapAnalysisQuery.data as AiAnalysisResponse | undefined;
  const liveData = liveDataQuery.data as LiveDataResponse | undefined;

  const band = normalizeRiskBand(cfsr?.riskBand);
  const cfsrScore = toNumber(cfsr?.cfsr);
  const confidencePct = toPercentNumber(cfsr?.scoreConfidence);
  const coveragePct = toPercentNumber(cfsr?.scoreCoverage);
  const freshness = getFreshness(liveData);
  const historyRows = useMemo(() => buildHistoryRows(history?.data ?? []), [history]);

  const nationalRows = useMemo(() => {
    return (prices?.data ?? [])
      .filter((row) => {
        const series = String(row.seriesType ?? "").toLowerCase();
        return (!series || series === "national_median") && toNumber(row.priceMyr) !== null && commodityName(row);
      })
      .sort((a, b) => commodityName(a).localeCompare(commodityName(b)));
  }, [prices]);

  const commodityOptions = useMemo(() => unique(nationalRows.map(commodityName)).slice(0, 80), [nationalRows]);
  const priceCategories = useMemo(() => unique(nationalRows.map(priceCategoryOf)).sort(), [nationalRows]);
  const effectiveCommodity = selectedCommodity || commodityOptions[0] || "";
  const trendQuery = trpc.prices.getTrend.useQuery(
    { item: effectiveCommodity || "__pending__", days: 30 },
    { enabled: Boolean(effectiveCommodity), refetchInterval: 60 * 60_000 }
  );
  const selectedTrend = trendQuery.data as PriceTrendResponse | undefined;

  const filteredPriceRows = useMemo(() => {
    const query = priceSearch.trim().toLowerCase();
    return nationalRows
      .filter((row) => priceCategory === "all" || priceCategoryOf(row) === priceCategory)
      .filter((row) => !query || `${commodityName(row)} ${displayCommodityName(row)}`.toLowerCase().includes(query))
      .slice(0, 60);
  }, [nationalRows, priceCategory, priceSearch]);

  const worldBankRows = useMemo(() => {
    return buildWorldBankRows(worldBankPrices?.series ?? [], worldBankCommodities?.commodities ?? [], prices?.data ?? []);
  }, [prices, worldBankCommodities, worldBankPrices]);

  const newsRows = news?.data ?? [];
  const commodityFilters = useMemo(() => unique(newsRows.map((item) => item.primaryCommodity ?? "").filter(Boolean)).slice(0, 30), [newsRows]);
  const filteredNews = useMemo(() => {
    return newsRows.filter((item) => {
      const severityOk = newsSeverity === "all" || String(item.severity ?? "").toLowerCase() === newsSeverity;
      const sideOk = newsSide === "all" || String(item.sentimentSide ?? "").toLowerCase() === newsSide;
      const commodityOk = newsCommodity === "all" || item.primaryCommodity === newsCommodity;
      return severityOk && sideOk && commodityOk;
    });
  }, [newsRows, newsSeverity, newsSide, newsCommodity]);

  const alertRows = newsRows.filter((item) => item.isAlert);
  const newsStats = useMemo(() => getNewsStats(newsRows), [newsRows]);
  const tickerRows = useMemo(() => {
    const seen = new Set<string>();
    return [...alertRows, ...newsRows]
      .sort((a, b) => {
        const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return bTime - aTime;
      })
      .filter((item) => {
        const key = `${item.title ?? ""}|${item.url ?? ""}`;
        if (!item.title || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 10);
  }, [alertRows, newsRows]);
  const liveRuns = useMemo(() => getLiveRuns(liveData), [liveData]);

  return (
    <main className={dashboardShell}>
      <header className="sticky top-14 z-30 -mx-4 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
              <Building2 className="h-5 w-5 text-emerald-700" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-bold text-emerald-950">FoodMonitor</p>
                <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  Government
                </span>
                <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${riskBadgeClass(band)}`}>
                  Food Risk: {formatScore(cfsrScore)}/100 - {readableRiskBand(band)}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">Last updated: {formatUpdatedLabel(cfsr?.computedAt ?? freshness.startedAt)}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                    active
                      ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                      : "border-transparent bg-white text-slate-500 hover:border-slate-200 hover:bg-emerald-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
            <FreshnessBadge freshness={freshness} />
          </div>
        </div>
      </header>

      <div className="space-y-6 pt-6">
        <section
          className="relative overflow-hidden rounded-[28px] text-white"
          style={{
            backgroundImage: "linear-gradient(135deg, rgba(6, 78, 59, 0.9), rgba(4, 120, 87, 0.74)), url('/images/hero-bg.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="absolute inset-0 bg-emerald-950/25" />
          <div className="relative grid gap-6 p-6 md:p-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.25em] text-emerald-50">
                <Building2 className="h-3.5 w-3.5" />
                National Command Layer
              </span>
              <h1 className="mt-5 max-w-2xl text-3xl font-bold leading-tight md:text-5xl">
                Government Dashboard
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-emerald-50/85 md:text-base">
                A branded command surface for policy teams, with operational cards, warnings, tables, and AI analysis kept on clean readable layers below.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <span className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-emerald-900">
                  Risk posture: {readableRiskBand(band)}
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white">
                  Data completeness: {formatPercent(cfsr?.scoreConfidence)}
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white">
                  Updated: {formatUpdatedLabel(cfsr?.computedAt ?? freshness.startedAt)}
                </span>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-2xl border border-white/15 bg-emerald-950/35 p-4 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100/75">Current Command Brief</p>
                <p className="mt-3 text-base font-semibold leading-7 text-white">{riskVerdict(band, cfsrScore)}</p>
                <p className="mt-2 text-sm leading-6 text-emerald-50/75">{deltaSentence(toNumber(cfsr?.delta), band)}</p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-emerald-950/35 p-4 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100/75">System Watch</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white">
                    {alertRows.length > 0 ? `${alertRows.length} active alert${alertRows.length === 1 ? "" : "s"}` : "No active alert ribbon"}
                  </span>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white">
                    {confidencePct !== null && confidencePct < 50 ? "Coverage limited" : "Coverage healthy"}
                  </span>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white">
                    {freshness.state === "fresh" ? "Fresh ingest" : freshness.state === "failed" ? "Pipeline needs attention" : "Refresh pending"}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-emerald-50/75">
                  Keep the hero atmospheric, but keep the policy evidence surfaces below plain, structured, and easy to brief from.
                </p>
              </div>
            </div>
          </div>
        </section>

        {activeTab === "overview" && (
          <>
            <section className="grid gap-4 rounded-lg border border-slate-200 bg-[#F8FAF9] p-5 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="text-xs font-bold uppercase text-emerald-700">Is Our Food Supply Safe?</p>
                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <p className="tabular-nums text-5xl font-bold text-slate-950">{formatScore(cfsrScore)}</p>
                  <span className={`mb-1 rounded-lg px-3 py-1 text-sm font-bold ${riskBadgeClass(band)}`}>{readableRiskBand(band)}</span>
                </div>
                <p className="mt-3 text-base font-semibold leading-7 text-slate-800">{riskVerdict(band, cfsrScore)}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{deltaSentence(toNumber(cfsr?.delta), band)}</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <MiniMetric label="Change from yesterday" value={formatSigned(toNumber(cfsr?.delta))} />
                  <MiniMetric label="Data completeness" value={formatPercent(cfsr?.scoreConfidence)} />
                  <MiniMetric label="Sources reporting" value={formatPercent(cfsr?.scoreCoverage)} />
                  <MiniMetric label="Computed" value={formatUpdatedLabel(cfsr?.computedAt)} />
                </div>
                <DataQualityAlert confidence={confidencePct} coverage={coveragePct} />
                <SourceBlock
                  title="Where does this score come from?"
                  source={dataSourcesText(cfsr?.dataSourcesSummary)}
                  updated={cfsr?.computedAt ?? null}
                  confidence={cfsr?.scoreConfidence ?? null}
                  coverage={cfsr?.scoreCoverage ?? null}
                />
              </div>

              <div className="min-h-72 rounded-lg border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-emerald-700">30-Day Food Risk Trend</h2>
                  <span className="text-xs font-semibold text-slate-500">{historyRows.length} points</span>
                </div>
                <div className="h-64">
                  <CfsrTrendChart data={historyRows} />
                </div>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-700">{historySummary(historyRows)}</p>
              </div>
            </section>

            <section className="space-y-4">
              <SectionTitle title="What Is Driving The Score?" description="Each component explains one part of national food supply risk." />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {COMPONENTS.map((component) => (
                  <ComponentCard
                    key={component.key}
                    code={component.code}
                    label={component.label}
                    value={toNumber(cfsr?.components?.[component.key])}
                    meta={cfsr?.componentMeta?.[component.key]}
                  />
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <SectionTitle title="Policy Questions" description="Plain-language signals for quick triage." />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {INDEX_CARDS.map((item) => (
                  <IndexCard key={item.key} config={item} index={indices?.data?.[item.key] ?? null} />
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-[#F8FAF9] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-emerald-700">Current Conditions At A Glance</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-950">What the latest signals mean</h2>
                  <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-700">{fuzzySummary(fuzzy)}</p>
                </div>
                <span className="text-xs font-semibold text-slate-500">{formatUpdatedLabel(fuzzy?.computedAt)}</span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <StateTile label="Fertilizer costs" value={fuzzy?.fertilizer ?? "-"} />
                <StateTile label="Price direction" value={fuzzy?.priceTrend ?? "-"} />
                <StateTile label="News coverage" value={fuzzy?.newsVolume ?? "-"} />
                <StateTile label="Overall condition" value={fuzzy?.compound ?? "-"} />
              </div>
            </section>
          </>
        )}

        {activeTab === "prices" && (
          <section className="space-y-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <SectionTitle title="Price Intelligence" description="Grouped local prices, simple trend direction, and world-market rows on demand." />
              <div className="grid w-full max-w-2xl gap-2 sm:grid-cols-[1fr_13rem]">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    value={priceSearch}
                    onChange={(event) => setPriceSearch(event.target.value)}
                    placeholder="Search commodity"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
                <select
                  value={priceCategory}
                  onChange={(event) => setPriceCategory(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="all">All Categories</option>
                  {priceCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>

            <section className="rounded-lg border border-slate-200 bg-[#F8FAF9] p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-emerald-700">Current National Median Prices</h2>
                <span className="text-xs font-semibold text-slate-500">
                  {filteredPriceRows.length} rows from {cleanSourceName(prices?._meta?.source ?? "PriceCatcher")}
                </span>
              </div>
              <PriceTable rows={filteredPriceRows} />
            </section>

            <section className="grid gap-4 lg:grid-cols-[20rem_1fr]">
              <div className="rounded-lg border border-slate-200 bg-[#F8FAF9] p-4">
                <h2 className="text-lg font-semibold text-emerald-700">Price Trend Explorer</h2>
                <select
                  value={effectiveCommodity}
                  onChange={(event) => setSelectedCommodity(event.target.value)}
                  className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  {commodityOptions.map((item) => (
                    <option key={item} value={item}>{displayCommodityName({ commodityName: item })}</option>
                  ))}
                </select>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {priceTrendSentence(toNumber(selectedTrend?.trendPct))}
                </p>
                <SourceBlock
                  title="Where does this trend come from?"
                  source={selectedTrend?._meta?.source ?? prices?._meta?.source ?? "prices.getTrend"}
                  updated={null}
                  extra={`Series: ${selectedTrend?._meta?.series ?? "national_median"}`}
                />
              </div>
              <div className="h-80 rounded-lg border border-slate-200 bg-white p-4">
                <PriceTrendChart trend={selectedTrend} loading={trendQuery.isLoading} />
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-[#F8FAF9] p-4">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-emerald-700">
                    World Bank Commodity Prices <span className="text-xs font-semibold text-slate-500">({worldBankRows.length} rows)</span>
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">Latest monthly benchmark prices from the World Bank commodity workbook.</p>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {cleanSourceName(worldBankPrices?.source ?? "worldbank_prices")}
                </span>
              </div>
              {worldBankPricesQuery.isLoading && worldBankRows.length === 0 ? (
                <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading World Bank prices...</p>
              ) : worldBankRows.length === 0 ? (
                <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">No World Bank prices are available yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px] text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Commodity</th>
                        <th className="px-3 py-2">Category</th>
                        <th className="px-3 py-2">Price (USD)</th>
                        <th className="px-3 py-2">Unit</th>
                        <th className="px-3 py-2">Latest month</th>
                        <th className="px-3 py-2">1-month change</th>
                        <th className="px-3 py-2">Source</th>
                        <th className="px-3 py-2">Workbook updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {worldBankRows.map((row, index) => {
                        const change = toNumber(row.changePct);
                        return (
                          <tr key={`${row.commodityCode}-${index}`} className="bg-white">
                            <td className="px-3 py-2 font-semibold text-slate-950">{displayWorldBankCommodityName(row)}</td>
                            <td className="px-3 py-2">{worldBankCategoryLabel(row)}</td>
                            <td className="px-3 py-2 tabular-nums">{formatUsd(toNumber(row.priceUsd))}</td>
                            <td className="px-3 py-2">{row.unit ?? "-"}</td>
                            <td className="px-3 py-2">{formatWorldBankMonth(row.latestDate)}</td>
                            <td className={`px-3 py-2 tabular-nums font-semibold ${change !== null && change > 0 ? "text-red-700" : change !== null && change < 0 ? "text-emerald-700" : "text-slate-600"}`}>
                              {formatTrendPct(change)}
                            </td>
                            <td className="px-3 py-2">
                              {row.sourceUrl ? <a href={row.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold text-emerald-700">Open source</a> : "-"}
                            </td>
                            <td className="px-3 py-2">{formatCompactDate(row.workbookUpdatedAt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </section>
        )}

        {activeTab === "supply" && (
          <section className="space-y-5">
            <SectionTitle title="Supply Risk" description="A plain-English assessment of near-term food supply risks." />
            <AiArticle
              title="Supply Risk Assessment"
              analysis={cfsrAnalysis}
              loading={cfsrAnalysisQuery.isLoading}
              emptyLabel={analysisPendingLabel(freshness.startedAt)}
              takeaway={analysisTakeaway(cfsrAnalysis?.content, band)}
            />

            <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-lg border border-slate-200 bg-[#F8FAF9] p-4">
                <h2 className="text-lg font-semibold text-emerald-700">Signal Conflicts</h2>
                <ConflictList conflicts={fuzzy?.conflicts} />
              </div>
              <JsonDetails title="Advanced: Membership Scores" value={fuzzy?.membershipScores} />
            </section>

            <details className="rounded-lg border border-slate-200 bg-[#F8FAF9] p-4">
              <summary className="cursor-pointer text-lg font-semibold text-emerald-700">Advanced: Data Pipeline Health</summary>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm leading-6 text-slate-600">System checks for the latest ingestion jobs.</p>
                <FreshnessBadge freshness={freshness} />
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Job</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Started</th>
                      <th className="px-3 py-2">Duration</th>
                      <th className="px-3 py-2">Rows</th>
                      <th className="px-3 py-2">Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {liveRuns.map((run, index) => (
                      <tr key={`${run.job ?? "job"}-${index}`} className={run.success === false ? "bg-red-50" : "bg-white"}>
                        <td className="px-3 py-2 font-semibold text-slate-950">{run.job ?? "-"}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${run.success === false ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                            {run.success === false ? "failed" : "success"}
                          </span>
                        </td>
                        <td className="px-3 py-2">{formatDateTime(run.startedAt ?? null)}</td>
                        <td className="px-3 py-2">{formatDuration(toNumber(run.durationMs))}</td>
                        <td className="px-3 py-2 tabular-nums">{formatCount(toNumber(run.rowsWritten))}</td>
                        <td className="px-3 py-2 text-red-700">{run.error ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>
        )}

        {activeTab === "news" && (
          <section className="space-y-5">
            <SectionTitle title="News And Alerts" description="Food-security news translated into policy implications." />
            <NewsTicker rows={tickerRows} />

            {alertRows.length > 0 && (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {alertRows.slice(0, 6).map((item, index) => (
                  <a
                    key={`${item.title ?? "alert"}-${index}`}
                    href={item.url ?? undefined}
                    target={item.url ? "_blank" : undefined}
                    rel="noreferrer"
                    className="rounded-[24px] border border-red-200 bg-[linear-gradient(180deg,rgba(254,242,242,0.96),rgba(255,255,255,0.98))] p-4 shadow-[0_14px_32px_rgba(15,23,42,0.05)]"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${stateBadgeClass(item.severity ?? "high")}`}>
                        {item.severity ?? "alert"}
                      </span>
                      {item.primaryCommodity && (
                        <span className="rounded-full border border-white/80 bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-red-700">
                          {item.primaryCommodity}
                        </span>
                      )}
                    </div>
                    <p className="mt-4 line-clamp-2 font-serif text-lg leading-7 text-slate-950">{item.title ?? "Untitled"}</p>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{item.implication || newsImplicationFallback(item)}</p>
                    <div className="mt-4 flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
                      <span>{item.source ?? "FoodMonitor feed"}</span>
                      <span>{item.publishedAt ? toRelativeTime(item.publishedAt) : "Fresh feed"}</span>
                    </div>
                  </a>
                ))}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-4">
              <MiniMetric label="Total Articles" value={newsStats.total.toLocaleString()} />
              <MiniMetric label="Alerts" value={newsStats.alerts.toLocaleString()} />
              <MiniMetric label="News tone" value={newsStats.averageSentiment} />
              <MiniMetric label="Most-mentioned item" value={newsStats.topCommodity} />
            </div>

            <details className="rounded-lg border border-slate-200 bg-[#F8FAF9] p-4">
              <summary className="cursor-pointer text-sm font-semibold text-emerald-700">Filter news</summary>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <FilterSelect label="Severity" value={newsSeverity} onChange={setNewsSeverity} options={["all", "critical", "high", "moderate", "low"]} />
                <FilterSelect label="Perspective" value={newsSide} onChange={setNewsSide} options={["all", "producer", "consumer", "policy"]} />
                <FilterSelect label="Commodity" value={newsCommodity} onChange={setNewsCommodity} options={["all", ...commodityFilters]} />
              </div>
            </details>

            <NewsTable rows={filteredNews} source={news?._meta?.source ?? "news.getLatest"} />
          </section>
        )}

        {activeTab === "ai" && (
          <section className="space-y-5">
            <SectionTitle title="AI Analysis" description="Recommendations, gaps, and developer audit details separated for clarity." />
            <div className="grid gap-4 xl:grid-cols-2">
              <AiArticle
                title="Recommendations"
                analysis={recommendations}
                loading={recommendationsQuery.isLoading}
                emptyLabel={analysisPendingLabel(freshness.startedAt)}
              />
              <AiArticle
                title="Gap Analysis"
                analysis={gapAnalysis}
                loading={gapAnalysisQuery.isLoading}
                emptyLabel={analysisPendingLabel(freshness.startedAt)}
              />
            </div>
          </section>
        )}

        <footer className="border-t border-slate-200 py-5 text-sm text-slate-500">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <p>Sources: {sourceFooterLabel(cfsr?.dataSourcesSummary, prices?._meta?.source)}</p>
            <p>Last updated: {formatUpdatedLabel(cfsr?.computedAt ?? freshness.startedAt)}</p>
          </div>
        </footer>
      </div>

      <DashboardAssistantChat dashboard="government" commodity={effectiveCommodity || undefined} />
    </main>
  );
}

function buildHistoryRows(rows: NonNullable<CfsrHistoryResponse["data"]>) {
  return rows
    .map((row) => ({
      date: formatCompactDate(row.computedAt),
      cfsr: toNumber(row.cfsr) ?? 0,
      band: normalizeRiskBand(row.riskBand),
    }))
    .filter((row) => row.date !== "-");
}

function CfsrTrendChart({ data }: { data: Array<{ date: string; cfsr: number; band: RiskBand }> }) {
  if (data.length === 0) return <div className="flex h-full items-center justify-center text-sm text-slate-500">No CFSR history returned.</div>;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={24} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={40} />
        <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#e5e7eb" }} />
        <Line type="monotone" dataKey="cfsr" stroke="#059669" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function PriceTrendChart({ trend, loading }: { trend: PriceTrendResponse | undefined; loading: boolean }) {
  const rows = (trend?.data ?? [])
    .map((point) => ({ date: formatCompactDate(point.date), price: toNumber(point.price) ?? 0 }))
    .filter((point) => point.date !== "-");
  if (loading) return <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading trend...</div>;
  if (rows.length === 0) return <div className="flex h-full items-center justify-center text-sm text-slate-500">No trend data returned.</div>;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={24} />
        <YAxis tick={{ fontSize: 11 }} width={52} />
        <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#e5e7eb" }} formatter={(value) => formatRinggit(toNumber(value))} />
        <Line type="monotone" dataKey="price" stroke="#059669" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function ComponentCard({ code, label, value, meta }: { code: string; label: string; value: number | null; meta: unknown }) {
  const safeValue = clamp(value ?? 0, 0, 100);
  const tone = scoreTone(safeValue);
  return (
    <article className="rounded-lg border border-slate-200 bg-[#F8FAF9] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-bold text-emerald-700">{code}</span>
          <h3 className="mt-1 text-sm font-bold text-slate-950">{label}</h3>
        </div>
        <span className="tabular-nums text-2xl font-bold text-slate-950">{value === null ? "-" : safeValue.toFixed(0)}</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-lg bg-[#F0F5F2]">
        <div className="h-full rounded-lg" style={{ width: `${safeValue}%`, backgroundColor: tone }} />
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-700">{componentSummary(label, value)}</p>
      <details className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
        <summary className="cursor-pointer text-xs font-semibold text-emerald-700">Technical source details</summary>
        <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950 p-3 text-xs leading-5 text-slate-100">
          {JSON.stringify(meta ?? { note: "No component metadata returned." }, null, 2)}
        </pre>
      </details>
    </article>
  );
}

function IndexCard({ config, index }: { config: (typeof INDEX_CARDS)[number]; index: DashboardIndex | null }) {
  const Icon = config.icon;
  const score = toNumber(index?.score);
  const safeScore = clamp(score ?? 0, 0, 100);
  const tone = scoreTone(safeScore);
  return (
    <article className="rounded-lg border border-slate-200 bg-[#F8FAF9] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
            <Icon className="h-5 w-5 text-emerald-700" />
          </span>
          <h3 className="mt-3 text-base font-bold text-slate-950">{config.question}</h3>
          <p className="mt-1 text-xs font-semibold uppercase text-slate-500">{config.title}</p>
        </div>
        <span className="tabular-nums text-3xl font-bold text-slate-950">{score === null ? "-" : safeScore.toFixed(0)}</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-lg bg-[#F0F5F2]">
        <div className="h-full rounded-lg" style={{ width: `${safeScore}%`, backgroundColor: tone }} />
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-700">{indexSummary(config.key, score)}</p>
      <details className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
        <summary className="cursor-pointer text-xs font-semibold text-emerald-700">Where does this data come from?</summary>
        <div className="mt-3 grid gap-2">
          <MiniMetric label="Sources reporting" value={formatPercent(index?.coverage)} />
          <MiniMetric label="Data status" value={statusLabel(index?.status)} badgeClass={stateBadgeClass(index?.status)} />
          <p className="break-words text-xs leading-5 text-slate-500">Source: {cleanSourceName(index?.source ?? "-")}</p>
          {index?.latestCanonicalDate && <p className="text-xs text-slate-500">Latest data date: {formatCompactDate(index.latestCanonicalDate)}</p>}
        </div>
      </details>
    </article>
  );
}

function StateTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className={`mt-2 inline-flex rounded-lg px-2 py-1 text-sm font-bold ${stateBadgeClass(value)}`}>{stateLabel(value)}</p>
    </div>
  );
}

function ConflictList({ conflicts }: { conflicts: unknown }) {
  const rows = Array.isArray(conflicts) ? conflicts : [];
  if (rows.length === 0) {
    return <p className="mt-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">No signal conflicts returned.</p>;
  }
  return (
    <div className="mt-3 space-y-3">
      {rows.map((item, index) => (
        <div key={index} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
          {typeof item === "string" ? item : JSON.stringify(item)}
        </div>
      ))}
    </div>
  );
}

function NewsTicker({ rows }: { rows: NewsRow[] }) {
  if (rows.length === 0) return null;
  const rollingRows = [...rows, ...rows];
  const alertCount = rows.filter((item) => item.isAlert).length;

  return (
    <section className="gov-news-ticker overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(248,250,249,0.92)_62%)] shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-3 border-b border-slate-200/80 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">Policy Wire</p>
          <h3 className="mt-1 font-serif text-2xl text-slate-950">Rolling News Ticker</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            A slim headline ribbon for government teams to scan live food-security signals before opening the detailed alert cards below.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            {alertCount} alert{alertCount === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
            <Newspaper className="h-3.5 w-3.5" />
            {rows.length} headline{rows.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className="overflow-hidden">
        <div className="gov-news-ticker-track flex w-max gap-3 px-5 py-4">
          {rollingRows.map((item, index) => {
            const itemClasses =
              "min-w-[18rem] max-w-[22rem] rounded-[22px] border border-slate-200 bg-white/85 px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.05)] backdrop-blur";
            const content = (
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${stateBadgeClass(item.severity ?? (item.isAlert ? "high" : ""))}`}>
                  {item.isAlert ? "alert" : item.severity ?? "update"}
                </span>
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950">{item.title ?? "Untitled"}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {item.primaryCommodity && <span>{item.primaryCommodity}</span>}
                    <span>{item.publishedAt ? toRelativeTime(item.publishedAt) : "Fresh feed"}</span>
                  </div>
                </div>
              </div>
            );

            if (item.url) {
              return (
                <a
                  key={`${item.title ?? "headline"}-${index}`}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className={itemClasses}
                >
                  {content}
                </a>
              );
            }

            return (
              <div key={`${item.title ?? "headline"}-${index}`} className={itemClasses}>
                {content}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function AiArticle({
  title,
  analysis,
  loading,
  emptyLabel,
  takeaway,
}: {
  title: string;
  analysis: AiAnalysisResponse | undefined;
  loading: boolean;
  emptyLabel: string;
  takeaway?: string | null;
}) {
  const cleanedContent = sanitizeAiContent(analysis?.content ?? "");
  return (
    <StructuredAiPanel
      title={title}
      analysis={analysis}
      content={cleanedContent}
      loading={loading}
      emptyLabel={emptyLabel}
      lead={takeaway}
      detailsPanel={<DeveloperInfo analysis={analysis} />}
    />
  );
}

function PriceTable({ rows }: { rows: PriceRow[] }) {
  const groups = groupPriceRows(rows);
  if (rows.length === 0) {
    return <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">No prices match the current search.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2">Commodity</th>
            <th className="px-3 py-2">Price (RM)</th>
            <th className="px-3 py-2">Unit</th>
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Price note</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {groups.map((group) => (
            <Fragment key={group.category}>
              <tr className="bg-emerald-50">
                <td colSpan={5} className="px-3 py-2 text-xs font-bold uppercase text-emerald-700">{group.category}</td>
              </tr>
              {group.rows.map((row, index) => {
                const price = toNumber(row.priceMyr);
                return (
                  <tr key={`${commodityName(row)}-${row.date ?? index}`} className="bg-white">
                    <td className="px-3 py-2 font-semibold text-slate-950">
                      <div>{displayCommodityName(row)}</div>
                      {displayCommodityName(row) !== commodityName(row) && <div className="mt-0.5 text-xs font-normal text-slate-500">{titleCaseCommodity(commodityName(row))}</div>}
                    </td>
                    <td className={`px-3 py-2 tabular-nums font-semibold ${price !== null && price > 20 ? "text-red-700" : "text-slate-950"}`}>{formatRinggit(price)}</td>
                    <td className="px-3 py-2">{row.unitCanonical ?? row.unit ?? "-"}</td>
                    <td className="px-3 py-2">{formatCompactDate(row.date)}</td>
                    <td className="px-3 py-2 text-slate-600">{priceNote(row)}</td>
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NewsTable({ rows, source }: { rows: NewsRow[]; source: string }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-[#F8FAF9] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-emerald-700">News Items</h2>
        <span className="text-xs font-semibold text-slate-500">{rows.length} rows</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Published</th>
              <th className="px-3 py-2">Severity</th>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Relevance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((item, index) => (
              <tr key={`${item.title ?? "news"}-${index}`} className="bg-white align-top">
                <td className="px-3 py-2">
                  <details>
                    <summary className="cursor-pointer font-semibold text-slate-950">
                      {item.url ? <a href={item.url} target="_blank" rel="noreferrer" className="hover:text-emerald-700">{item.title ?? "Untitled"}</a> : item.title ?? "Untitled"}
                    </summary>
                    <div className="mt-3 max-w-xl space-y-2 rounded-lg border border-slate-200 bg-[#F8FAF9] p-3 text-xs leading-5 text-slate-700">
                      <p>{item.implication || "No implication text returned."}</p>
                      <p>News tone: {sentimentLabel(toNumber(item.sentimentScore))}</p>
                      <p>Perspective: {perspectiveLabel(item.sentimentSide)}</p>
                      <p>Matched keywords: {stringifyShort(item.matchedKeywords)}</p>
                      <p>Food security relevance: {stringifyShort(item.foodSecurityRelevance)}</p>
                      <p>Event type: {item.eventType ?? "-"}</p>
                      <p>Source authority: {stringifyShort(item.sourceAuthority)}</p>
                      <p>Analysis confidence: {formatPercent(item.analysisConfidence)}</p>
                      <p>Metadata source: {cleanSourceName(source)}</p>
                    </div>
                  </details>
                </td>
                <td className="px-3 py-2">{item.publishedAt ? toRelativeTime(item.publishedAt) : "-"}</td>
                <td className="px-3 py-2"><span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${stateBadgeClass(item.severity)}`}>{item.severity ?? "-"}</span></td>
                <td className="px-3 py-2">{item.primaryCommodity ?? "-"}</td>
                <td className="px-3 py-2">{relevanceLabel(toNumber(item.insightScore))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DataQualityAlert({ confidence, coverage }: { confidence: number | null; coverage: number | null }) {
  const lowest = Math.min(confidence ?? 100, coverage ?? 100);
  if (lowest >= 50) return null;
  const displayed = Number.isFinite(lowest) ? `${lowest.toFixed(0)}%` : "limited data";
  return (
    <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <p>
          <span className="font-bold">Data completeness warning:</span> this score is based on {displayed} of expected signals.
          Treat it as directional until more sources report.
        </p>
      </div>
    </div>
  );
}

function DeveloperInfo({ analysis }: { analysis: AiAnalysisResponse | undefined }) {
  return (
    <details className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-semibold text-emerald-700">Developer Info</summary>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <JsonDetails title="Structured output" value={analysis?.structuredOutput} />
        <JsonDetails title="Data context" value={analysis?.dataContext} promptHash={analysis?.promptHash ?? null} />
      </div>
    </details>
  );
}

function JsonDetails({ title, value, promptHash }: { title: string; value: unknown; promptHash?: string | null }) {
  const hasValue = value !== undefined && value !== null;
  return (
    <details className="rounded-lg border border-slate-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-semibold text-emerald-700">{title}</summary>
      {promptHash && <p className="mt-3 break-all rounded-lg bg-emerald-50 px-3 py-2 font-mono text-xs text-emerald-900">Prompt hash: {promptHash}</p>}
      {hasValue ? (
        <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950 p-3 text-xs leading-5 text-slate-100">
          {JSON.stringify(value, null, 2)}
        </pre>
      ) : (
        <p className="mt-3 text-sm text-slate-500">No structured data returned.</p>
      )}
    </details>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>{filterOptionLabel(label, option)}</option>
        ))}
      </select>
    </label>
  );
}

function MiniMetric({ label, value, badgeClass }: { label: string; value: string; badgeClass?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className={`mt-1 break-words text-sm font-bold text-slate-950 ${badgeClass ? `inline-flex rounded-lg px-2 py-0.5 ${badgeClass}` : ""}`}>
        {value}
      </p>
    </div>
  );
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-emerald-950 md:text-[28px]">{title}</h1>
      <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function SourceBlock({
  title = "Where does this data come from?",
  source,
  updated,
  extra,
  confidence,
  coverage,
}: {
  title?: string;
  source: string;
  updated?: string | null;
  extra?: string;
  confidence?: number | string | null;
  coverage?: number | string | null;
}) {
  const rows = buildProvenanceRows(source);
  return (
    <details className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-950">
      <summary className="cursor-pointer font-bold uppercase text-emerald-700">{title}</summary>
      <div className="mt-2 grid gap-1">
        <p>Source: {cleanSourceName(source || "FoodMonitor live data")}</p>
        <p>Last updated: {formatUpdatedLabel(updated)}</p>
        {confidence !== undefined && <p>Data completeness: {formatPercent(confidence)}</p>}
        {coverage !== undefined && <p>Sources reporting: {formatPercent(coverage)}</p>}
        {extra && <p>{extra}</p>}
        {rows.length > 0 && (
          <ul className="mt-2 grid gap-1">
            {rows.map((row) => (
              <li key={`${row.label}-${row.detail}`}>
                <span className="font-semibold">{row.label}:</span> {row.detail}
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

function FreshnessBadge({ freshness }: { freshness: ReturnType<typeof getFreshness> }) {
  const classes = {
    fresh: "bg-emerald-50 text-emerald-700 border-emerald-200",
    stale: "bg-amber-50 text-amber-800 border-amber-200",
    failed: "bg-red-50 text-red-700 border-red-200",
  }[freshness.state];

  return (
    <span className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${classes}`}>
      <span className={`h-2 w-2 rounded-lg ${freshness.state === "fresh" ? "bg-emerald-500" : freshness.state === "stale" ? "bg-amber-500" : "bg-red-500"}`} />
      {freshness.label}
    </span>
  );
}

function getFreshness(data: LiveDataResponse | undefined) {
  const runs = getLiveRuns(data);
  const latest = runs[0];
  if (!latest) return { state: "stale" as const, label: "Update pending", startedAt: null as string | null };
  if (latest.success === false) return { state: "failed" as const, label: "Update failed", startedAt: String(latest.startedAt ?? "") };
  const time = latest.startedAt ? new Date(latest.startedAt).getTime() : 0;
  const ageMs = time ? Date.now() - time : Number.POSITIVE_INFINITY;
  const label = latest.startedAt ? `Updated ${toRelativeTime(latest.startedAt)}` : "Update pending";
  if (ageMs <= 24 * 60 * 60_000) return { state: "fresh" as const, label, startedAt: String(latest.startedAt ?? "") };
  return { state: "stale" as const, label, startedAt: String(latest.startedAt ?? "") };
}

function getLiveRuns(data: LiveDataResponse | undefined) {
  return [...(data?.lastRuns ?? []), ...(data?.allRecentLogs ?? [])]
    .filter(Boolean)
    .map((run) => ({ ...run, time: run.startedAt ? new Date(run.startedAt).getTime() : 0 }))
    .sort((a, b) => b.time - a.time)
    .slice(0, 20);
}

function getNewsStats(rows: NewsRow[]) {
  const sentiments = rows.map((item) => toNumber(item.sentimentScore)).filter((value): value is number => value !== null);
  const average = sentiments.length ? sentiments.reduce((sum, value) => sum + value, 0) / sentiments.length : null;
  return {
    total: rows.length,
    alerts: rows.filter((item) => item.isAlert).length,
    averageSentiment: sentimentLabel(average),
    topCommodity: mode(rows.map((item) => item.primaryCommodity ?? "").filter(Boolean)) ?? "-",
  };
}

function readableRiskBand(band: RiskBand) {
  if (band === "LOW") return "Low Risk";
  if (band === "MODERATE") return "Moderate Risk";
  if (band === "CRITICAL") return "Critical Risk";
  return "High Risk";
}

function riskVerdict(band: RiskBand, score: number | null) {
  if (score === null) return "Food supply risk is still being calculated. Wait for the next data update before acting.";
  if (band === "LOW") return "Food supply is stable. No immediate policy action is required.";
  if (band === "MODERATE") return "Food supply is mostly stable, but several signals need monitoring.";
  if (band === "HIGH") return "Food supply risk is elevated. Review price, news, and input-cost signals today.";
  return "Food supply risk is critical. Escalate for immediate policy review.";
}

function deltaSentence(value: number | null, band: RiskBand) {
  if (value === null) return "Change since yesterday is not available yet.";
  if (Math.abs(value) < 0.05) return "Risk is unchanged since yesterday.";
  const direction = value > 0 ? "increased" : "decreased";
  const action = value > 0 && band !== "LOW" ? "review the drivers" : "monitor but no immediate action is needed";
  return `Risk ${direction} since yesterday (${formatSigned(value)}); ${action}.`;
}

function historySummary(rows: Array<{ date: string; cfsr: number; band: RiskBand }>) {
  if (rows.length < 2) return "Trend summary will appear after at least two history points are available.";
  const recent = rows.slice(-7);
  const average = recent.reduce((sum, row) => sum + row.cfsr, 0) / recent.length;
  const peak = rows.reduce((max, row) => (row.cfsr > max.cfsr ? row : max), rows[0]);
  return `Risk has averaged ${average.toFixed(0)}/100 over the latest ${recent.length} points. The highest recent spike was ${peak.cfsr.toFixed(0)}/100 on ${peak.date}.`;
}

function componentSummary(label: string, value: number | null) {
  if (value === null) return `${label} has not reported enough data yet.`;
  const band = value <= 30 ? "low" : value <= 60 ? "moderate" : "high";
  if (label === "Price Stability") {
    return `Price instability is ${band}; lower scores mean prices are steadier.`;
  }
  return `${label} risk is ${band} at ${value.toFixed(0)}/100.`;
}

function indexSummary(key: IndexKey, value: number | null) {
  if (value === null) return "This signal is pending and should not drive decisions yet.";
  const elevated = value >= 60;
  const watch = value >= 40;
  if (key === "newsAttention") {
    if (elevated) return "Media coverage of food issues is elevated. Check the News tab for headlines.";
    if (watch) return "Food-security news is active but not yet severe.";
    return "Food-security news coverage is quiet.";
  }
  if (key === "dataQuality") {
    if (elevated) return "Data freshness and completeness look healthy.";
    if (watch) return "Some data sources are incomplete. Treat the score as directional.";
    return "Data quality is weak. Use caution before making decisions.";
  }
  if (elevated) return "This signal is elevated and should be reviewed today.";
  if (watch) return "This signal is worth monitoring.";
  return "This signal is low and does not need immediate action.";
}

function fuzzySummary(fuzzy: FuzzyStateResponse | undefined) {
  const fertilizer = stateLabel(fuzzy?.fertilizer ?? "");
  const price = stateLabel(fuzzy?.priceTrend ?? "");
  const news = stateLabel(fuzzy?.newsVolume ?? "");
  if (!fertilizer && !price && !news) return "Current conditions are still being calculated.";
  return `Fertilizer costs are ${fertilizer || "unknown"}, price direction is ${price || "unknown"}, and news coverage is ${news || "unknown"}.`;
}

function analysisTakeaway(content: string | null | undefined, band: RiskBand) {
  const cleaned = sanitizeAiContent(content ?? "");
  if (!cleaned.trim()) return null;
  const highSignals = countMatches(cleaned, /\b(high|critical|severe|shortage|disruption)\b/gi);
  const moderateSignals = countMatches(cleaned, /\b(moderate|watch|elevated)\b/gi);
  if (highSignals > 0) return `${highSignals} high-risk signal${highSignals === 1 ? "" : "s"} mentioned. Review recommended actions before briefing leaders.`;
  if (moderateSignals > 0) return `${moderateSignals} moderate signal${moderateSignals === 1 ? "" : "s"} mentioned. Monitor conditions and prepare targeted follow-up.`;
  return riskVerdict(band, null).replace("still being calculated. Wait for the next data update before acting.", "stable based on the generated assessment.");
}

function analysisPendingLabel(lastRun: string | null) {
  return `Analysis pending. The data pipeline last ran ${formatUpdatedLabel(lastRun)}.`;
}

function sanitizeAiContent(content: string) {
  return content
    .replace(/\s*\((?:dashboardIndices|cfsr|fuzzy|prices|news|dataContext)(?:\.[A-Za-z0-9_]+)+\)/g, "")
    .replace(/`(?:dashboardIndices|cfsr|fuzzy|prices|news|dataContext)(?:\.[A-Za-z0-9_]+)+`/g, "the latest dashboard data")
    .replace(/\b(?:dashboardIndices|cfsr|fuzzy|prices|news|dataContext)(?:\.[A-Za-z0-9_]+)+\b/g, "the latest dashboard data")
    .replace(/[ \t]+([.,;:])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sentimentLabel(value: number | null) {
  if (value === null) return "Not enough data";
  if (value <= -0.35) return "Negative";
  if (value < -0.1) return "Slightly Negative";
  if (value <= 0.1) return "Mostly Neutral";
  if (value < 0.35) return "Slightly Positive";
  return "Positive";
}

function relevanceLabel(value: number | null) {
  if (value === null) return "Not scored";
  if (value >= 0.7) return "High";
  if (value >= 0.4) return "Medium";
  return "Low";
}

function perspectiveLabel(value: string | null | undefined) {
  const normalized = String(value ?? "").toLowerCase();
  if (!normalized) return "-";
  if (normalized === "producer") return "Producer";
  if (normalized === "consumer") return "Consumer";
  if (normalized === "policy") return "Policy";
  return titleCaseCommodity(normalized);
}

function newsImplicationFallback(item: NewsRow) {
  const subject = item.primaryCommodity ? `${item.primaryCommodity} coverage` : "This story";
  return `${subject} may affect food security planning. Open the item for details.`;
}

function filterOptionLabel(label: string, option: string) {
  if (option !== "all") return titleCaseCommodity(option);
  if (label === "Severity") return "All Severities";
  if (label === "Perspective") return "All Perspectives";
  if (label === "Commodity") return "All Commodities";
  return "All";
}

function stateLabel(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized === "-") return "";
  return titleCaseCommodity(normalized.replace(/_/g, " "));
}

function statusLabel(value: string | null | undefined) {
  const normalized = String(value ?? "").toLowerCase();
  if (!normalized || normalized === "missing") return "Missing";
  if (normalized === "observed") return "Observed data";
  if (normalized === "derived") return "Estimated from related signals";
  if (normalized === "fallback") return "Limited fallback estimate";
  return stateLabel(normalized);
}

function sourceFooterLabel(summary: CfsrResponse["dataSourcesSummary"], priceSource: string | null | undefined) {
  const source = dataSourcesText(summary);
  if (source && buildProvenanceRows(source).length > 0) return "FoodMonitor CFSR components";
  return cleanSourceName(source || priceSource || "FoodMonitor live data");
}

function cleanSourceName(source: string | null | undefined) {
  const raw = String(source ?? "").trim();
  if (!raw || raw === "-") return "FoodMonitor live data";
  const lower = raw.toLowerCase();
  if (buildProvenanceRows(raw).length > 0 || lower.includes("confidence=") || lower.includes("rows=")) return "FoodMonitor CFSR components";
  if (lower === "db") return "FoodMonitor database";
  if (lower.includes("pricecatcher")) return "PriceCatcher (Data.gov.my)";
  if (lower.includes("worldbank")) return "World Bank commodity prices";
  if (lower.includes("news.getlatest")) return "FoodMonitor news ingestion";
  if (lower.includes("prices.gettrend")) return "FoodMonitor price trend service";
  if (lower.includes("ai.getanalysis")) return "AI analysis service";
  return titleCaseCommodity(raw.replace(/[_-]/g, " "));
}

function buildProvenanceRows(source: string | null | undefined) {
  const raw = String(source ?? "");
  if (!raw.includes(":") && !raw.includes("|")) return [];
  return raw
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [key, ...detailParts] = part.split(":");
      const detail = detailParts.join(":").trim();
      if (!detail || !friendlyFieldLabel(key.trim())) return null;
      return {
        label: friendlyFieldLabel(key.trim()),
        detail: friendlySourceDetail(detail),
      };
    })
    .filter((row): row is { label: string; detail: string } => Boolean(row));
}

function friendlyFieldLabel(key: string) {
  const direct = FIELD_LABELS[key];
  if (direct) return direct;
  const pieces = key.split(".");
  const last = pieces[pieces.length - 1];
  return FIELD_LABELS[last] ?? "";
}

function friendlySourceDetail(detail: string) {
  const confidence = detail.match(/confidence=([0-9.]+)/i)?.[1];
  const coverage = detail.match(/coverage=([0-9.]+)/i)?.[1];
  const rows = detail.match(/rows=([0-9]+)/i)?.[1];
  const states: string[] = [];
  if (/missing/i.test(detail)) states.push("missing data");
  if (/fallback/i.test(detail)) states.push("limited fallback estimate");
  if (/observed/i.test(detail)) states.push("observed data");
  if (/derived/i.test(detail)) states.push("estimated signal");
  if (confidence) states.push(`data completeness ${formatPercent(confidence)}`);
  if (coverage) states.push(`sources reporting ${formatPercent(coverage)}`);
  if (rows) states.push(`${rows} rows`);
  return states.length ? states.join(", ") : "available signal";
}

function displayCommodityName(row: Pick<PriceRow, "commodityName" | "displayName">) {
  const original = commodityName(row);
  if (!original) return "-";
  const normalized = original.replace(/\s+/g, " ").trim().toUpperCase();
  const override = COMMODITY_NAME_OVERRIDES[normalized];
  if (override) return override;
  const origin = normalized.match(/IMPORT\s*\(([^)]+)\)/)?.[1];
  let translated = original.replace(/IMPORT\s*\([^)]+\)/i, "").replace(/\s+/g, " ").trim();
  for (const [source, target] of COMMODITY_TERM_TRANSLATIONS) {
    translated = translated.replace(new RegExp(`\\b${escapeRegExp(source)}\\b`, "gi"), target);
  }
  translated = titleCaseCommodity(translated);
  if (origin) return `${translated} (Imported, ${titleCaseCommodity(origin)})`;
  return translated;
}

function priceCategoryOf(row: PriceRow) {
  const explicit = row.category || row.subcategory;
  if (explicit) return titleCaseCommodity(String(explicit).replace(/[_-]/g, " "));
  const name = commodityName(row).toLowerCase();
  if (/(rice|beras|wheat|gandum|sugar|gula|oil|minyak)/.test(name)) return "Staples";
  if (/(bawang|cili|kangkung|bayam|tomato|kubis|sawi|vegetable)/.test(name)) return "Vegetables";
  if (/(ayam|chicken|telur|egg|ikan|fish|daging|meat)/.test(name)) return "Protein";
  if (/(fertilizer|baja|diesel|fuel)/.test(name)) return "Inputs";
  return "Other";
}

function buildWorldBankRows(series: WorldBankPriceSeries[], commodities: WorldBankCommodity[], fallbackRows: PriceRow[]) {
  const commodityMeta = new Map(
    commodities
      .map((item) => [normalizeCommodityCode(item.commodityCode), item] as const)
      .filter(([code]) => Boolean(code))
  );

  const rows = series
    .filter((item) => normalizeCommodityCode(item.commodityCode) && toNumber(item.latestPriceUsd) !== null)
    .map((item) => {
      const commodityCode = normalizeCommodityCode(item.commodityCode);
      const meta = commodityMeta.get(commodityCode);
      return {
        commodityCode,
        displayName: String(item.commodityLabel ?? meta?.label ?? titleCaseCommodity(commodityCode.replace(/_/g, " "))).trim(),
        category: item.category ?? meta?.category ?? null,
        subcategory: item.subcategory ?? null,
        priceUsd: item.latestPriceUsd,
        previousPriceUsd: item.previousPriceUsd,
        latestDate: item.latestDate ?? null,
        changePct: item.changePct,
        unit: item.unit ?? meta?.unit ?? null,
        sourceUrl: item.sourceUrl ?? null,
        workbookUpdatedAt: item.workbookUpdatedAt ?? null,
      } satisfies WorldBankDisplayRow;
    });

  if (rows.length > 0) return rows.sort(sortWorldBankRows);

  return fallbackRows
    .filter((row) => toNumber(row.priceUsd) !== null && (row.displayName || row.commodityCode || String(row.sourceId ?? "").toLowerCase().includes("worldbank")))
    .map((row, index) => {
      const label = commodityName(row) || String(row.sourceHeader ?? "").trim();
      const commodityCode = normalizeCommodityCode(row.commodityCode) || normalizeCommodityCode(label) || `WORLDBANK_${index}`;
      return {
        commodityCode,
        displayName: label || titleCaseCommodity(commodityCode.replace(/_/g, " ")),
        category: row.category ?? null,
        subcategory: row.subcategory ?? null,
        priceUsd: row.priceUsd,
        previousPriceUsd: null,
        latestDate: row.date ?? null,
        changePct: null,
        unit: row.unit ?? row.unitCanonical ?? null,
        sourceUrl: row.sourceUrl ?? null,
        workbookUpdatedAt: row.workbookUpdatedAt ?? null,
      } satisfies WorldBankDisplayRow;
    })
    .sort(sortWorldBankRows);
}

function sortWorldBankRows(a: WorldBankDisplayRow, b: WorldBankDisplayRow) {
  return `${a.category ?? ""}|${a.subcategory ?? ""}|${a.displayName}`.localeCompare(`${b.category ?? ""}|${b.subcategory ?? ""}|${b.displayName}`);
}

function normalizeCommodityCode(value: string | null | undefined) {
  return String(value ?? "").trim().toUpperCase();
}

function displayWorldBankCommodityName(row: WorldBankDisplayRow) {
  return row.displayName || titleCaseCommodity(row.commodityCode.replace(/_/g, " "));
}

function worldBankCategoryLabel(row: WorldBankDisplayRow) {
  const parts = [row.category, row.subcategory]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .filter((part, index, list) => list.findIndex((value) => value.toLowerCase() === part.toLowerCase()) === index);
  return parts.length > 0 ? parts.join(" / ") : "-";
}

function groupPriceRows(rows: PriceRow[]) {
  const groups = new Map<string, PriceRow[]>();
  for (const row of rows) {
    const category = priceCategoryOf(row);
    groups.set(category, [...(groups.get(category) ?? []), row]);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, groupRows]) => ({ category, rows: groupRows }));
}

function priceNote(row: PriceRow) {
  const source = cleanSourceName(row.sourceId ?? "");
  if (source !== "FoodMonitor live data") return source;
  return "National median local price";
}

function priceTrendSentence(value: number | null) {
  if (value === null) return "Trend is not available yet.";
  if (value > 1) return `Price is up ${value.toFixed(1)}% over the selected period. Watch for pressure on consumers.`;
  if (value < -1) return `Price is down ${Math.abs(value).toFixed(1)}% over the selected period. Conditions are easing.`;
  return `Price is broadly stable (${formatTrendPct(value)}).`;
}

function formatUpdatedLabel(value: string | Date | null | undefined) {
  if (!value) return "Update pending";
  return toRelativeTime(value);
}

function toPercentNumber(value: number | string | null | undefined) {
  const numeric = toNumber(value);
  if (numeric === null) return null;
  return Math.abs(numeric) <= 1 ? numeric * 100 : numeric;
}

function titleCaseCommodity(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => (part.length <= 2 && part !== "of" ? part.toUpperCase() : `${part.charAt(0).toUpperCase()}${part.slice(1)}`))
    .join(" ")
    .replace(/\bUsd\b/g, "USD")
    .replace(/\bRm\b/g, "RM")
    .replace(/\bDap\b/g, "DAP")
    .replace(/\bTsp\b/g, "TSP")
    .replace(/\bHrw\b/g, "HRW")
    .replace(/\bSrw\b/g, "SRW");
}

function countMatches(value: string, pattern: RegExp) {
  return value.match(pattern)?.length ?? 0;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function commodityName(row: Pick<PriceRow, "commodityName" | "displayName">) {
  return String(row.commodityName ?? row.displayName ?? "").trim();
}

function scoreTone(score: number) {
  if (score <= 30) return "#10B981";
  if (score <= 50) return "#F59E0B";
  if (score <= 70) return "#F97316";
  return "#EF4444";
}

function formatScore(value: number | null) {
  return value === null ? "-" : value.toFixed(0);
}

function formatSigned(value: number | null) {
  if (value === null) return "-";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

function formatTrendPct(value: number | null) {
  if (value === null) return "-";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatRinggit(value: number | null) {
  return value === null ? "-" : `RM ${value.toFixed(2)}`;
}

function formatUsd(value: number | null) {
  return value === null ? "-" : `USD ${value.toFixed(2)}`;
}

function formatPercent(value: number | string | null | undefined) {
  const numeric = toNumber(value);
  if (numeric === null) return "-";
  const percent = Math.abs(numeric) <= 1 ? numeric * 100 : numeric;
  return `${percent.toFixed(0)}%`;
}

function formatCount(value: number | null) {
  return value === null ? "-" : value.toLocaleString();
}

function formatDuration(value: number | null) {
  if (value === null) return "-";
  if (value < 1000) return `${value.toFixed(0)} ms`;
  return `${(value / 1000).toFixed(1)} s`;
}

function formatCompactDate(value: string | null | undefined) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-MY", { month: "short", day: "numeric" });
}

function formatWorldBankMonth(value: string | null | undefined) {
  if (!value) return "-";
  const trimmed = value.trim();
  if (/^[A-Za-z]{3,9}\s+\d{4}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  return parsed.toLocaleDateString("en-MY", { month: "short", year: "numeric" });
}

function dataSourcesText(value: string[] | string | null | undefined) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  return value ?? "";
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function mode(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function stringifyShort(value: unknown) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
}
