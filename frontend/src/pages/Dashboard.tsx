import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart2,
  Brain,
  Camera,
  CircleDollarSign,
  History,
  Leaf,
  Newspaper,
  ShieldCheck,
  Sprout,
  TrendingDown,
  TrendingUp,
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
import { getLocalScans, type LocalScan } from "@/lib/db";
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

type FarmerTab = "prices" | "inputs" | "news" | "ai";

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
  scoreConfidence?: number | string | null;
  scoreCoverage?: number | string | null;
  computedAt?: string | null;
  dataSourcesSummary?: string[] | string | null;
};

type DashboardIndex = {
  score?: number | string | null;
  coverage?: number | string | null;
  status?: string | null;
  source?: string | null;
};

type DashboardIndicesResponse = {
  data?: {
    inputCostStress?: DashboardIndex | null;
    globalCommodityStress?: DashboardIndex | null;
  } | null;
};

type FuzzyStateResponse = {
  fertilizer?: string | null;
  priceTrend?: string | null;
  newsVolume?: string | null;
  compound?: string | null;
  computedAt?: string | null;
};

type PriceRow = {
  commodityName?: string | null;
  displayName?: string | null;
  priceMyr?: number | string | null;
  priceUsd?: number | string | null;
  date?: string | null;
  unit?: string | null;
  unitCanonical?: string | null;
  seriesType?: string | null;
};

type CurrentPricesResponse = {
  data?: PriceRow[] | null;
  _meta?: {
    source?: string | null;
    [key: string]: unknown;
  } | null;
};

type TrendPoint = {
  date?: string | null;
  price?: number | string | null;
};

type PriceTrendResponse = {
  data?: TrendPoint[] | null;
  trendPct?: number | string | null;
  _meta?: {
    source?: string | null;
    series?: string | null;
    [key: string]: unknown;
  } | null;
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
};

type NewsResponse = {
  data?: NewsRow[] | null;
  _meta?: {
    source?: string | null;
    [key: string]: unknown;
  } | null;
};

type AiAnalysisResponse = {
  content?: string | null;
  structuredOutput?: unknown;
  generatedAt?: string | null;
  dataContext?: unknown;
  promptHash?: string | null;
};

type LiveRun = {
  success?: boolean | null;
  startedAt?: string | Date | null;
};

type LiveDataResponse = {
  lastRuns?: LiveRun[] | null;
  allRecentLogs?: LiveRun[] | null;
};

type PriceCardModel = {
  name: string;
  group: string;
  row: PriceRow;
};

const COMPONENTS: Array<{ key: ComponentKey; code: string; label: string }> = [
  { key: "n1ImportDependency", code: "N1", label: "Import Dependency" },
  { key: "n2SupplyChainHealth", code: "N2", label: "Supply Chain Health" },
  { key: "n3FertilizerAvailability", code: "N3", label: "Fertilizer Access" },
  { key: "n4GeopoliticalRisk", code: "N4", label: "Global Political Risk" },
  { key: "n5PriceVolatility", code: "N5", label: "Price Stability" },
];

const PRICE_GROUPS = [
  { label: "Staples", keywords: ["rice", "beras", "wheat", "gandum", "cooking oil", "minyak", "sugar", "gula"] },
  { label: "Vegetables", keywords: ["kangkung", "bayam", "tomato", "cabbage", "kubis", "vegetable", "sawi"] },
  { label: "Protein", keywords: ["chicken", "ayam", "egg", "telur", "fish", "ikan"] },
];

const TABS: Array<{ id: FarmerTab; label: string; icon: typeof CircleDollarSign }> = [
  { id: "prices", label: "Prices", icon: CircleDollarSign },
  { id: "inputs", label: "Input Cost", icon: BarChart2 },
  { id: "news", label: "News", icon: Newspaper },
  { id: "ai", label: "AI Advisor", icon: Brain },
];

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
  ["import", "Imported"],
  ["tempatan", "Local"],
  ["gred", "Grade"],
  ["biasa", "Standard"],
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<FarmerTab>("prices");
  const [expandedCommodity, setExpandedCommodity] = useState<string | null>(null);
  const [latestScan, setLatestScan] = useState<LocalScan | null>(null);

  const cfsrQuery = trpc.risk.getCfsr.useQuery(undefined, { refetchInterval: 60 * 60_000 });
  const indicesQuery = trpc.risk.getDashboardIndices.useQuery(undefined, { refetchInterval: 60 * 60_000 });
  const fuzzyQuery = trpc.risk.getFuzzyState.useQuery(undefined, { refetchInterval: 60 * 60_000 });
  const priceQuery = trpc.prices.getCurrent.useQuery({}, { refetchInterval: 60 * 60_000 });
  const newsQuery = trpc.news.getLatest.useQuery({ limit: 10, side: "producer" }, { refetchInterval: 60 * 60_000 });
  const aiQuery = trpc.ai.getAnalysis.useQuery({ type: "recommendations" }, { refetchInterval: 60 * 60_000 });
  const liveDataQuery = trpc.liveData.getStatus.useQuery(undefined, { refetchInterval: 5 * 60_000 });

  const cfsr = cfsrQuery.data as CfsrResponse | undefined;
  const indices = indicesQuery.data as DashboardIndicesResponse | undefined;
  const fuzzy = fuzzyQuery.data as FuzzyStateResponse | undefined;
  const prices = priceQuery.data as CurrentPricesResponse | undefined;
  const news = newsQuery.data as NewsResponse | undefined;
  const ai = aiQuery.data as AiAnalysisResponse | undefined;
  const liveData = liveDataQuery.data as LiveDataResponse | undefined;

  const priceCards = useMemo(() => buildPriceCards(prices?.data ?? []), [prices]);
  const expandedTrendQuery = trpc.prices.getTrend.useQuery(
    { item: expandedCommodity ?? "__pending__", days: 30 },
    { enabled: Boolean(expandedCommodity), refetchInterval: 60 * 60_000 }
  );

  const trend0 = trpc.prices.getTrend.useQuery({ item: priceCards[0]?.name ?? "__pending__", days: 7 }, { enabled: Boolean(priceCards[0]?.name), refetchInterval: 60 * 60_000 });
  const trend1 = trpc.prices.getTrend.useQuery({ item: priceCards[1]?.name ?? "__pending__", days: 7 }, { enabled: Boolean(priceCards[1]?.name), refetchInterval: 60 * 60_000 });
  const trend2 = trpc.prices.getTrend.useQuery({ item: priceCards[2]?.name ?? "__pending__", days: 7 }, { enabled: Boolean(priceCards[2]?.name), refetchInterval: 60 * 60_000 });
  const trend3 = trpc.prices.getTrend.useQuery({ item: priceCards[3]?.name ?? "__pending__", days: 7 }, { enabled: Boolean(priceCards[3]?.name), refetchInterval: 60 * 60_000 });
  const trend4 = trpc.prices.getTrend.useQuery({ item: priceCards[4]?.name ?? "__pending__", days: 7 }, { enabled: Boolean(priceCards[4]?.name), refetchInterval: 60 * 60_000 });
  const trend5 = trpc.prices.getTrend.useQuery({ item: priceCards[5]?.name ?? "__pending__", days: 7 }, { enabled: Boolean(priceCards[5]?.name), refetchInterval: 60 * 60_000 });

  const trendByCommodity = useMemo(() => {
    const pairs = [trend0.data, trend1.data, trend2.data, trend3.data, trend4.data, trend5.data].map((value, index) => [
      priceCards[index]?.name,
      value as PriceTrendResponse | undefined,
    ] as const);
    return new Map(pairs.filter((pair): pair is readonly [string, PriceTrendResponse | undefined] => Boolean(pair[0])));
  }, [priceCards, trend0.data, trend1.data, trend2.data, trend3.data, trend4.data, trend5.data]);

  const producerNews = useMemo(() => {
    return (news?.data ?? []).filter((item) => !item.sentimentSide || item.sentimentSide.toLowerCase() === "producer");
  }, [news]);

  const band = normalizeRiskBand(cfsr?.riskBand);
  const cfsrScore = toNumber(cfsr?.cfsr);
  const freshness = getFreshness(liveData);
  const expandedTrend = expandedTrendQuery.data as PriceTrendResponse | undefined;

  useEffect(() => {
    let active = true;

    void getLocalScans(1).then((scans) => {
      if (active) setLatestScan(scans[0] ?? null);
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className={dashboardShell}>
      <header className="sticky top-14 z-30 -mx-4 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
              <Sprout className="h-5 w-5 text-emerald-700" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-bold text-emerald-950">FoodMonitor</p>
                <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  Farmer
                </span>
              </div>
              <p className="text-xs text-slate-500">Prices, inputs, alerts, and recommendations.</p>
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
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${active
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
            backgroundImage: "linear-gradient(135deg, rgba(6, 78, 59, 0.92), rgba(4, 120, 87, 0.78)), url('/images/hero-bg.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="absolute inset-0 bg-emerald-950/20" />
          <div className="relative p-6 md:p-8">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.25em] text-emerald-50">
                <Sprout className="h-3.5 w-3.5" />
                Farmer Command Center
              </span>
              <h1 className="mt-5 max-w-2xl text-3xl font-bold leading-tight md:text-5xl">
                Run the farm from one focused workspace.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-emerald-50/85 md:text-base">
                Keep the dashboard clean for decisions, and treat Crop Scanner as the fast field app sitting right beside it for capture, diagnosis, and follow-up.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/scan"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-emerald-900 hover:bg-emerald-50"
                >
                  <Camera className="h-4 w-4" />
                  Open Crop Scanner
                </Link>
                <Link
                  href={latestScan ? `/result/${latestScan.localId}` : "/history"}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/15"
                >
                  <History className="h-4 w-4" />
                  {latestScan ? "Open Latest Result" : "Review Scan History"}
                </Link>
              </div>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/15 bg-emerald-950/35 p-4 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100/75">Field Scan</p>
                <p className="mt-3 text-xl font-semibold text-white">
                  {latestScan ? latestScan.diseaseName ?? "Recent diagnosis ready" : "Crop Scanner ready"}
                </p>
                <p className="mt-2 text-sm leading-6 text-emerald-50/75">
                  {latestScan
                    ? `Last scan ${toRelativeTime(latestScan.scannedAt)}. Keep moving from capture to action without leaving the product family.`
                    : "Capture a crop issue, review the diagnosis, and keep the full result trail in one place."}
                </p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-emerald-950/35 p-4 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100/75">Farm Signals</p>
                <p className="mt-3 text-xl font-semibold text-white">Track supply and price pressure</p>
                <p className="mt-2 text-sm leading-6 text-emerald-50/75">
                  Use the tabs below for prices, input costs, producer news, and AI recommendations without visual noise.
                </p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-emerald-950/35 p-4 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100/75">Decision Support</p>
                <p className="mt-3 text-xl font-semibold text-white">Practical actions, not raw noise</p>
                <p className="mt-2 text-sm leading-6 text-emerald-50/75">
                  The dashboard stays operational. Crop Scanner stays task-first. Together they cover diagnosis, market pressure, and next actions.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 border-b border-slate-200 pb-6 lg:grid-cols-[minmax(19rem,0.48fr)_1fr]">
          <div className="rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top,rgba(236,253,245,0.95),rgba(255,255,255,0.94)_62%)] p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-emerald-700">Food Risk Level</p>
                <p className="mt-3 max-w-xs text-sm leading-6 text-slate-600">
                  Composite Food Security Risk (CFSR) index: a national-level barometer of food system stability.
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${riskBadgeClass(band)}`}>{bandLabel(band)}</span>
            </div>

            <div className="mt-6 flex justify-center">
              <ScoreGauge score={cfsrScore} label={bandLabel(band)} />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <MiniStat label="National score" value={`${formatScore(cfsrScore)}/100`} />
              <MiniStat label="Last refresh" value={formatCompactDate(cfsr?.computedAt)} />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-[#F8FAF9] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-emerald-950 md:text-[28px]">Farmer Dashboard</h1>
                <p className="mt-2 max-w-3xl text-base leading-7 text-slate-700">{farmerRiskSentence(band)}</p>
              </div>
              <Link
                href="/scan"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <Camera className="h-4 w-4" />
                Open Crop Scanner
              </Link>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MiniStat label="Data completeness" value={formatPercent(cfsr?.scoreConfidence)} />
              <MiniStat label="Sources reporting" value={formatPercent(cfsr?.scoreCoverage)} />
              <MiniStat label="Updated" value={formatCompactDate(cfsr?.computedAt)} />
            </div>
            <DataQualityAlert confidence={toPercentNumber(cfsr?.scoreConfidence)} coverage={toPercentNumber(cfsr?.scoreCoverage)} />

            {latestScan && (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-emerald-700">Recent Scanner Activity</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">{latestScan.diseaseName ?? "Diagnosis ready"}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Captured {toRelativeTime(latestScan.scannedAt)}. Keep Crop Scanner as the dedicated field workflow and this dashboard as the decision layer.
                    </p>
                  </div>
                  <Link
                    href={`/result/${latestScan.localId}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    Review Result
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )}

            <details className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
              <summary className="cursor-pointer text-sm font-semibold text-emerald-700">View component breakdown</summary>
              <div className="mt-4 grid gap-3 md:grid-cols-5">
                {COMPONENTS.map((component) => (
                  <ComponentBar
                    key={component.key}
                    label={component.label}
                    code={component.code}
                    value={toNumber(cfsr?.components?.[component.key])}
                  />
                ))}
              </div>
              <SourceDisclosure
                className="mt-4"
                source={dataSourcesText(cfsr?.dataSourcesSummary)}
                updated={cfsr?.computedAt ?? null}
                confidence={cfsr?.scoreConfidence ?? null}
              />
            </details>
          </div>
        </section>

        {activeTab === "prices" && (
          <section className="space-y-4">
            <SectionTitle
              title="Current Prices"
              description="One price per commodity. Tap a card for the 30-day trend and source."
            />
            {priceQuery.isLoading ? (
              <LoadingPanel label="Loading commodity prices..." />
            ) : priceCards.length === 0 ? (
              <EmptyPanel label="No national median prices returned yet." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {priceCards.map((item) => {
                  const price = toNumber(item.row.priceMyr);
                  const trend = trendByCommodity.get(item.name);
                  const trendPct = toNumber(trend?.trendPct);
                  const isOpen = expandedCommodity === item.name;
                  return (
                    <article key={item.name} className="rounded-lg border border-slate-200 bg-[#F8FAF9] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                      <button
                        type="button"
                        onClick={() => setExpandedCommodity(isOpen ? null : item.name)}
                        className="w-full rounded-lg text-left focus:outline-none"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                              {item.group}
                            </span>
                            <h3 className="mt-2 text-base font-bold text-slate-950">{displayCommodityName({ commodityName: item.name })}</h3>
                            {displayCommodityName({ commodityName: item.name }) !== item.name && (
                              <p className="mt-1 text-xs text-slate-500">{titleCaseCommodity(item.name)}</p>
                            )}
                          </div>
                          <TrendBadge trendPct={trendPct} />
                        </div>
                        <div className="mt-4 flex items-end gap-2">
                          <p className="tabular-nums text-2xl font-bold text-slate-950">{formatRinggit(price)}</p>
                          <p className="pb-1 text-xs text-slate-500">{formatUnit(item.row.unitCanonical ?? item.row.unit)}</p>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">{item.row.date ? `Latest row ${formatCompactDate(item.row.date)}` : "Latest row pending"}</p>
                      </button>

                      {isOpen && (
                        <div className="mt-4 border-t border-slate-200 pt-4">
                          <div className="h-48">
                            <PriceTrendChart trend={expandedTrend} loading={expandedTrendQuery.isLoading} />
                          </div>
                          <p className="mt-3 text-sm font-semibold text-slate-700">
                            {formatTrendSentence(toNumber(expandedTrend?.trendPct))}
                          </p>
                          <SourceDisclosure
                            className="mt-3"
                            source={expandedTrend?._meta?.source ?? prices?._meta?.source ?? "PriceCatcher (Data.gov.my)"}
                            updated={item.row.date ?? null}
                            extra={`Series: ${expandedTrend?._meta?.series ?? item.row.seriesType ?? "national_median"}`}
                          />
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === "inputs" && (
          <section className="space-y-4">
            <SectionTitle
              title="Input Cost"
              description="Stress indices and fuzzy states only. Raw prices stay in the Prices tab."
            />
            <div className="grid gap-4 lg:grid-cols-2">
              <StressCard
                title="Input Cost Stress"
                index={indices?.data?.inputCostStress ?? null}
                icon={BarChart2}
                message={inputCostMessage(indices?.data?.inputCostStress?.score)}
              >
                <DetailRow label="Fertilizer state" value={fuzzy?.fertilizer ?? "-"} badge />
                <DetailRow label="Compound state" value={fuzzy?.compound ?? "-"} badge />
                <SourceDisclosure
                  source={indices?.data?.inputCostStress?.source ?? "commodity_prices fertilizer/fuel benchmarks"}
                  updated={fuzzy?.computedAt ?? null}
                  confidence={indices?.data?.inputCostStress?.coverage ?? null}
                />
              </StressCard>
              <StressCard
                title="Global Food Price Stress"
                index={indices?.data?.globalCommodityStress ?? null}
                icon={ShieldCheck}
                message={globalStressMessage(indices?.data?.globalCommodityStress?.score)}
              >
                <DetailRow label="Price trend state" value={fuzzy?.priceTrend ?? "-"} badge />
                <DetailRow label="News volume state" value={fuzzy?.newsVolume ?? "-"} badge />
                <SourceDisclosure
                  source={indices?.data?.globalCommodityStress?.source ?? "commodity_prices World Bank benchmarks"}
                  updated={fuzzy?.computedAt ?? null}
                  confidence={indices?.data?.globalCommodityStress?.coverage ?? null}
                />
              </StressCard>
            </div>
          </section>
        )}

        {activeTab === "news" && (
          <section className="space-y-4">
            <SectionTitle title="News For Producers" description="Alerts and market implications for farm decisions." />
            {newsQuery.isLoading ? (
              <LoadingPanel label="Loading producer news..." />
            ) : producerNews.length === 0 ? (
              <EmptyPanel label="No producer news returned yet." />
            ) : (
              <div className="grid gap-3">
                {producerNews.map((item, index) => (
                  <details key={`${item.title ?? "news"}-${index}`} className="rounded-lg border border-slate-200 bg-[#F8FAF9] p-4 open:bg-white">
                    <summary className="cursor-pointer list-none">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {item.isAlert && (
                              <span className="rounded-lg border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">
                                AMARAN
                              </span>
                            )}
                            {item.severity && (
                              <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${stateBadgeClass(item.severity)}`}>
                                {item.severity}
                              </span>
                            )}
                            {item.primaryCommodity && (
                              <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                {item.primaryCommodity}
                              </span>
                            )}
                          </div>
                          <h3 className="mt-2 line-clamp-2 text-base font-bold text-slate-950">{truncate(item.title ?? "Untitled", 90)}</h3>
                        </div>
                        <div className="text-left text-xs text-slate-500 md:text-right">
                          <p className="font-semibold text-slate-700">{item.source ?? "FoodMonitor ingest"}</p>
                          <p>{item.publishedAt ? toRelativeTime(item.publishedAt) : "Unknown time"}</p>
                        </div>
                      </div>
                    </summary>
                    <div className="mt-4 grid gap-4 border-t border-slate-200 pt-4 lg:grid-cols-[1fr_16rem]">
                      <div>
                        <p className="text-sm leading-6 text-slate-700">{item.implication || "No implication text returned."}</p>
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                          >
                            Open article
                          </a>
                        )}
                      </div>
                      <div className="space-y-2">
                        <SentimentMeter value={toNumber(item.sentimentScore)} />
                        <DetailRow label="Relevance" value={relevanceLabel(toNumber(item.insightScore))} />
                        <DetailRow label="Perspective" value={perspectiveLabel(item.sentimentSide)} badge />
                        <SourceDisclosure source={news?._meta?.source ?? "news.getLatest"} updated={item.publishedAt ?? null} />
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "ai" && (
          <section className="space-y-4">
            <SectionTitle title="AI Recommendations" description={`Last updated ${formatCompactDate(ai?.generatedAt)}`} />
            <StructuredAiPanel
              title="AI Recommendations"
              analysis={ai}
              content={sanitizeAiContent(ai?.content ?? "")}
              loading={aiQuery.isLoading}
              emptyLabel="No recommendation content returned yet."
              detailsPanel={<DeveloperInfo analysis={ai} />}
            />
          </section>
        )}

        <footer className="border-t border-slate-200 py-5 text-sm text-slate-500">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <p>Sources: {dataSourcesText(cfsr?.dataSourcesSummary) || prices?._meta?.source || "FoodMonitor live data"}</p>
            <p>Last update: {formatDateTime(cfsr?.computedAt ?? freshness.startedAt ?? null)}</p>
          </div>
        </footer>
      </div>

      <DashboardAssistantChat dashboard="farmer" commodity={expandedCommodity ?? undefined} />
    </main>
  );
}

function buildPriceCards(rows: PriceRow[]): PriceCardModel[] {
  const nationalRows = rows
    .filter((row) => {
      const series = String(row.seriesType ?? "").toLowerCase();
      return (!series || series === "national_median") && toNumber(row.priceMyr) !== null && commodityName(row);
    })
    .sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")));

  const used = new Set<string>();
  const cards: PriceCardModel[] = [];

  for (const group of PRICE_GROUPS) {
    const matches = nationalRows.filter((row) => {
      const name = commodityName(row).toLowerCase();
      return group.keywords.some((keyword) => name.includes(keyword));
    });
    for (const row of matches) {
      const name = commodityName(row);
      const key = name.toLowerCase();
      if (used.has(key)) continue;
      used.add(key);
      cards.push({ name, group: group.label, row });
      if (cards.length >= 18) return cards;
    }
  }

  for (const row of nationalRows) {
    const name = commodityName(row);
    const key = name.toLowerCase();
    if (used.has(key)) continue;
    used.add(key);
    cards.push({ name, group: "Market", row });
    if (cards.length >= 18) break;
  }

  return cards;
}

function commodityName(row: Pick<PriceRow, "commodityName" | "displayName">) {
  return String(row.commodityName ?? row.displayName ?? "").trim();
}

function ScoreGauge({ score, label }: { score: number | null; label: string }) {
  const safeScore = clamp(score ?? 0, 0, 100);
  const tone = scoreTone(safeScore);
  const degrees = safeScore * 3.6;
  return (
    <div className="flex w-full max-w-[15rem] flex-col items-center">
      <div className="relative grid place-items-center">
        <div
          className="absolute h-36 w-36 rounded-full blur-3xl opacity-60"
          style={{ background: `radial-gradient(circle, ${tone.color}33 0%, transparent 70%)` }}
        />
        <div
          className="relative flex h-48 w-48 items-center justify-center rounded-full border border-white/70 p-[14px] shadow-[0_24px_70px_rgba(15,23,42,0.16)]"
          style={{ background: `conic-gradient(${tone.color} 0deg ${degrees}deg, rgba(226,232,240,0.92) ${degrees}deg 360deg)` }}
        >
          <div className="absolute inset-[14px] rounded-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(248,250,249,0.9)_55%,rgba(240,245,242,0.96))]" />
          <div className="absolute inset-[34px] rounded-full border border-white/80 bg-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_12px_24px_rgba(15,23,42,0.08)] backdrop-blur" />
          <div className="relative z-10 flex flex-col items-center">
            <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-400">CFSR</span>
            <span className="mt-2 tabular-nums text-5xl font-semibold tracking-tight text-slate-950">
              {score === null ? "-" : safeScore.toFixed(0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ComponentBar({ code, label, value }: { code: string; label: string; value: number | null }) {
  const safeValue = clamp(value ?? 0, 0, 100);
  const tone = scoreTone(safeValue);
  return (
    <div className="rounded-lg border border-slate-200 bg-[#F8FAF9] p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-emerald-700">{code}</span>
        <span className="tabular-nums text-sm font-bold text-slate-950">{value === null ? "-" : safeValue.toFixed(0)}</span>
      </div>
      <p className="mt-1 min-h-8 text-xs font-semibold text-slate-700">{label}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-lg bg-[#F0F5F2]">
        <div className="h-full rounded-lg" style={{ width: `${safeValue}%`, backgroundColor: tone.color }} />
      </div>
    </div>
  );
}

function StressCard({
  title,
  index,
  icon: Icon,
  message,
  children,
}: {
  title: string;
  index: DashboardIndex | null;
  icon: typeof BarChart2;
  message: string;
  children: ReactNode;
}) {
  const score = toNumber(index?.score);
  return (
    <article className="rounded-lg border border-slate-200 bg-[#F8FAF9] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
              <Icon className="h-5 w-5 text-emerald-700" />
            </span>
            <h3 className="text-lg font-semibold text-emerald-700">{title}</h3>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-700">{message}</p>
        </div>
        <ScoreDial score={score} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MiniStat label="Status" value={index?.status ?? "missing"} badgeClass={stateBadgeClass(index?.status)} />
        <MiniStat label="Sources reporting" value={formatPercent(index?.coverage)} />
      </div>

      <details className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-emerald-700">View details and source</summary>
        <div className="mt-4 space-y-3">{children}</div>
      </details>
    </article>
  );
}

function ScoreDial({ score }: { score: number | null }) {
  const safeScore = clamp(score ?? 0, 0, 100);
  const tone = scoreTone(safeScore);
  return (
    <div className="text-right">
      <p className="tabular-nums text-3xl font-bold text-slate-950">{score === null ? "-" : safeScore.toFixed(0)}</p>
      <div className="mt-2 h-2 w-28 overflow-hidden rounded-lg bg-[#F0F5F2]">
        <div className="h-full rounded-lg" style={{ width: `${safeScore}%`, backgroundColor: tone.color }} />
      </div>
    </div>
  );
}

function PriceTrendChart({ trend, loading }: { trend: PriceTrendResponse | undefined; loading: boolean }) {
  const rows = (trend?.data ?? [])
    .map((point) => ({ date: point.date ?? "", price: toNumber(point.price) ?? 0 }))
    .filter((point) => point.date && Number.isFinite(point.price));

  if (loading) return <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading trend...</div>;
  if (rows.length === 0) return <div className="flex h-full items-center justify-center text-sm text-slate-500">No trend data returned.</div>;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={24} />
        <YAxis tick={{ fontSize: 11 }} width={48} />
        <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#e5e7eb" }} formatter={(value) => formatRinggit(toNumber(value))} />
        <Line type="monotone" dataKey="price" stroke="#059669" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function TrendBadge({ trendPct }: { trendPct: number | null }) {
  if (trendPct === null) {
    return <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">Trend pending</span>;
  }
  const rising = trendPct > 0;
  const Icon = rising ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${rising ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
      <Icon className="h-3.5 w-3.5" />
      {trendPct > 0 ? "+" : ""}
      {trendPct.toFixed(1)}% in 7 days
    </span>
  );
}

function SentimentMeter({ value }: { value: number | null }) {
  const safeValue = clamp(value ?? 0, -1, 1);
  const pct = ((safeValue + 1) / 2) * 100;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
        <span>News tone</span>
        <span>{sentimentLabel(value)}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-lg bg-[#F0F5F2]">
        <div className="h-full rounded-lg bg-emerald-600" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function DataQualityAlert({ confidence, coverage }: { confidence: number | null; coverage: number | null }) {
  const lowest = Math.min(confidence ?? 100, coverage ?? 100);
  if (lowest >= 50) return null;
  return (
    <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <p>
          <span className="font-bold">Data completeness warning:</span> this score is based on {lowest.toFixed(0)}% of expected signals.
          Treat it as directional until more sources report.
        </p>
      </div>
    </div>
  );
}

function DeveloperInfo({ analysis }: { analysis: AiAnalysisResponse | undefined }) {
  return (
    <details className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-semibold text-emerald-700">Developer Info</summary>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <JsonDetails title="Structured output" value={analysis?.structuredOutput} />
        <JsonDetails title="Data context" value={analysis?.dataContext} promptHash={analysis?.promptHash ?? null} />
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

function MiniStat({ label, value, badgeClass }: { label: string; value: string; badgeClass?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className={`mt-1 break-words text-sm font-bold text-slate-950 ${badgeClass ? `inline-flex rounded-lg px-2 py-0.5 ${badgeClass}` : ""}`}>
        {value}
      </p>
    </div>
  );
}

function DetailRow({ label, value, badge = false }: { label: string; value: string; badge?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className={badge ? `rounded-lg px-2 py-0.5 text-xs font-semibold ${stateBadgeClass(value)}` : "font-semibold text-slate-900"}>{value}</span>
    </div>
  );
}

function SourceDisclosure({
  source,
  updated,
  confidence,
  extra,
  className = "",
}: {
  source: string;
  updated?: string | null;
  confidence?: number | string | null;
  extra?: string;
  className?: string;
}) {
  return (
    <details className={`rounded-lg border border-emerald-200 bg-emerald-50 p-3 ${className}`}>
      <summary className="cursor-pointer text-xs font-bold uppercase text-emerald-700">Where does this data come from?</summary>
      <div className="mt-2 grid gap-1 text-xs leading-5 text-emerald-950">
        <p>Source: {cleanSourceName(source || "FoodMonitor")}</p>
        <p>Last updated: {formatDateTime(updated)}</p>
        {confidence !== undefined && <p>Data completeness or sources reporting: {formatPercent(confidence)}</p>}
        {extra && <p>{extra}</p>}
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

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-emerald-700">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-[#F8FAF9] p-5 text-sm font-semibold text-slate-600">
      {label}
    </div>
  );
}

function EmptyPanel({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-[#F8FAF9] p-5 text-sm font-semibold text-slate-600">
      {label}
    </div>
  );
}

function getFreshness(data: LiveDataResponse | undefined) {
  const runs = [...(data?.lastRuns ?? []), ...(data?.allRecentLogs ?? [])].filter(Boolean);
  const sorted = runs
    .map((run) => ({ ...run, time: run.startedAt ? new Date(run.startedAt).getTime() : 0 }))
    .sort((a, b) => b.time - a.time);
  const latest = sorted[0];
  if (!latest) return { state: "stale" as const, label: "Update pending", startedAt: null as string | null };
  if (latest.success === false) return { state: "failed" as const, label: "Update failed", startedAt: String(latest.startedAt ?? "") };
  const ageMs = latest.time ? Date.now() - latest.time : Number.POSITIVE_INFINITY;
  const label = latest.startedAt ? `Updated ${toRelativeTime(latest.startedAt)}` : "Update pending";
  if (ageMs <= 24 * 60 * 60_000) return { state: "fresh" as const, label, startedAt: String(latest.startedAt ?? "") };
  return { state: "stale" as const, label, startedAt: String(latest.startedAt ?? "") };
}

function scoreTone(score: number) {
  if (score <= 33) return { color: "#10B981", badge: "bg-emerald-100 text-emerald-700" };
  if (score <= 66) return { color: "#F59E0B", badge: "bg-amber-100 text-amber-800" };
  return { color: "#EF4444", badge: "bg-red-100 text-red-700" };
}

function farmerRiskSentence(band: RiskBand) {
  if (band === "LOW") return "Food supply is stable. Good time to plan new crops.";
  if (band === "MODERATE") return "Some disruptions detected. Monitor input costs.";
  return "Significant disruptions. Check fertilizer and prices.";
}

function bandLabel(band: RiskBand) {
  if (band === "LOW") return "Safe";
  if (band === "MODERATE") return "Caution";
  if (band === "CRITICAL") return "Critical";
  return "High Risk";
}

function inputCostMessage(value: number | string | null | undefined) {
  const score = toNumber(value);
  if (score === null) return "Input cost signal is not available yet.";
  if (score > 70) return "Fertilizer and fuel costs are very high.";
  if (score >= 40) return "Input costs are elevated.";
  return "Input costs are normal.";
}

function globalStressMessage(value: number | string | null | undefined) {
  const score = toNumber(value);
  if (score === null) return "Global food price signal is not available yet.";
  if (score > 70) return "World market prices are under heavy stress.";
  if (score >= 40) return "World market prices are elevated.";
  return "World market prices are stable.";
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

function cleanSourceName(source: string | null | undefined) {
  const raw = String(source ?? "").trim();
  if (!raw || raw === "-") return "FoodMonitor live data";
  const lower = raw.toLowerCase();
  if (lower === "db") return "FoodMonitor database";
  if (lower.includes("pricecatcher")) return "PriceCatcher (Data.gov.my)";
  if (lower.includes("worldbank")) return "World Bank commodity prices";
  if (lower.includes("news.getlatest")) return "FoodMonitor news ingestion";
  if (lower.includes("ai.getanalysis")) return "AI analysis service";
  return titleCaseCommodity(raw.replace(/[_-]/g, " "));
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
    .replace(/\bRm\b/g, "RM");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatTrendSentence(value: number | null) {
  if (value === null) return "Trend percentage is not available.";
  if (value > 0) return `Price is up ${value.toFixed(1)}% over the selected period.`;
  if (value < 0) return `Price is down ${Math.abs(value).toFixed(1)}% over the selected period.`;
  return "Price is flat over the selected period.";
}

function formatScore(value: number | null) {
  return value === null ? "-" : value.toFixed(0);
}

function formatRinggit(value: number | null) {
  return value === null ? "-" : `RM ${value.toFixed(2)}`;
}

function formatUnit(value: string | null | undefined) {
  if (!value) return "per unit";
  return value.toLowerCase().startsWith("per ") ? value : `per ${value}`;
}

function formatPercent(value: number | string | null | undefined) {
  const numeric = toNumber(value);
  if (numeric === null) return "-";
  const percent = Math.abs(numeric) <= 1 ? numeric * 100 : numeric;
  return `${percent.toFixed(0)}%`;
}

function formatCompactDate(value: string | null | undefined) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-MY", { month: "short", day: "numeric" });
}

function dataSourcesText(value: string[] | string | null | undefined) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  return value ?? "";
}

function truncate(value: string, max: number) {
  return value.length <= max ? value : `${value.slice(0, max - 1)}...`;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
}
