import { useMemo } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  Camera,
  Cloud,
  Leaf,
  ShieldCheck,
  Sprout,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { coerceNumber, getLiveFreshness, type LiveDataStatusLike } from "@/lib/backendSignals";
import { normalizeRiskBand, riskBadgeClass, toRelativeTime } from "@/lib/dashboardStyle";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

type CfsrResponse = {
  cfsr?: number | string | null;
  riskBand?: string | null;
  computedAt?: string | null;
};

type PriceRow = {
  commodityName?: string | null;
  displayName?: string | null;
};

type CurrentPricesResponse = {
  data?: PriceRow[] | null;
};

type NewsRow = {
  title?: string | null;
  publishedAt?: string | null;
  isAlert?: boolean | null;
  sentimentSide?: string | null;
};

type NewsResponse = {
  data?: NewsRow[] | null;
};

type ScanStatsResponse = {
  total: number;
  byDisease: Record<string, number>;
  bySeverity: Record<string, number>;
};

function uniqueCount(values: Array<string | null | undefined>) {
  return new Set(values.map((value) => value?.trim()).filter(Boolean)).size;
}

function readableBandLabel(value: string | null | undefined) {
  const band = normalizeRiskBand(value);
  if (band === "LOW") return "Low risk";
  if (band === "MODERATE") return "Moderate risk";
  if (band === "CRITICAL") return "Critical risk";
  return "High risk";
}

export default function PortalLanding() {
  const { isAuthenticated } = useAuth();

  const cfsrQuery = trpc.risk.getCfsr.useQuery(undefined, { refetchInterval: 60 * 60_000 });
  const pricesQuery = trpc.prices.getCurrent.useQuery({}, { refetchInterval: 60 * 60_000 });
  const newsQuery = trpc.news.getLatest.useQuery({ limit: 12 }, { refetchInterval: 60 * 60_000 });
  const liveDataQuery = trpc.liveData.getStatus.useQuery(undefined, { refetchInterval: 5 * 60_000 });
  const cloudStatsQuery = trpc.scans.stats.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 60 * 60_000,
  });

  const cfsr = cfsrQuery.data as CfsrResponse | undefined;
  const prices = pricesQuery.data as CurrentPricesResponse | undefined;
  const news = newsQuery.data as NewsResponse | undefined;
  const liveData = liveDataQuery.data as LiveDataStatusLike | undefined;
  const cloudStats = cloudStatsQuery.data as ScanStatsResponse | undefined;

  const band = normalizeRiskBand(cfsr?.riskBand);
  const riskScore = coerceNumber(cfsr?.cfsr);
  const freshness = getLiveFreshness(liveData);
  const newsRows = news?.data ?? [];
  const alertCount = newsRows.filter((item) => item.isAlert).length;
  const producerHeadline =
    newsRows.find((item) => String(item.sentimentSide ?? "").toLowerCase() === "producer") ??
    newsRows[0];
  const commodityCount = uniqueCount((prices?.data ?? []).map((row) => row.displayName ?? row.commodityName));
  const cloudScanCount = cloudStats?.total ?? 0;
  const severeCloudCount = cloudStats?.bySeverity?.severe ?? 0;

  const signals = useMemo(
    () => [
      {
        icon: ShieldCheck,
        label: "National food risk",
        value: riskScore === null ? "Awaiting score" : `${Math.round(riskScore)}/100`,
        detail: readableBandLabel(cfsr?.riskBand),
        badgeClass: riskBadgeClass(band),
      },
      {
        icon: BarChart3,
        label: "Live market coverage",
        value: commodityCount > 0 ? `${commodityCount} tracked prices` : "Price feed loading",
        detail: producerHeadline?.title
          ? `Latest producer signal: ${producerHeadline.title}`
          : "Producer-facing price and alert feed is standing by.",
        badgeClass: "bg-white text-emerald-700 ring-1 ring-emerald-200",
      },
      {
        icon: Cloud,
        label: "Platform freshness",
        value: freshness.label,
        detail: isAuthenticated
          ? `${cloudScanCount} cloud scan${cloudScanCount === 1 ? "" : "s"} linked to your account`
          : "Crop Scanner can store captures locally and sync when you sign in.",
        badgeClass:
          freshness.state === "fresh"
            ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
            : freshness.state === "failed"
              ? "bg-red-100 text-red-700 ring-1 ring-red-200"
              : "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
      },
    ],
    [
      band,
      cfsr?.riskBand,
      cloudScanCount,
      commodityCount,
      freshness.label,
      freshness.state,
      isAuthenticated,
      producerHeadline?.title,
      riskScore,
    ]
  );

  const workspaces = useMemo(
    () => [
      {
        href: "/scan",
        icon: Camera,
        eyebrow: "Crop Scanner",
        title: "Field-ready diagnosis with offline capture and AI follow-up",
        copy: "Treat Crop Scanner as its own workspace: capture a leaf, review the result, and keep the full scan history together.",
        action: "Open Crop Scanner",
        featured: true,
        highlights: [
          "Offline-first",
          freshness.state === "fresh" ? "Cloud live" : "Cloud pending",
          isAuthenticated ? `${cloudScanCount} synced` : "History ready",
        ],
        statusLabel: "Cloud history",
        statusValue: isAuthenticated
          ? cloudStatsQuery.isLoading
            ? "Checking account..."
            : `${cloudScanCount} cloud scan${cloudScanCount === 1 ? "" : "s"}`
          : "Sign in for sync",
        statusCopy: isAuthenticated
          ? severeCloudCount > 0
            ? `${severeCloudCount} severe capture${severeCloudCount === 1 ? "" : "s"} already synced for follow-up.`
            : "Your account is ready to receive new captures from the field."
          : "Capture works locally first, then syncs to the backend when your account is connected.",
      },
      {
        href: "/farmer-hub",
        icon: Sprout,
        eyebrow: "Farmer Hub",
        title: "Daily decisions for planting, prices, and input costs",
        copy: "Plain-language risk, commodity prices, producer alerts, and AI recommendations in one decision workspace.",
        action: "Open Farmer Hub",
        featured: false,
        highlights: [
          commodityCount > 0 ? `${commodityCount} live prices` : "Price watch",
          alertCount > 0 ? `${alertCount} alerts` : "Alerts ready",
          "Producer-first",
        ],
        statusLabel: "Market feed",
        statusValue: commodityCount > 0 ? `${commodityCount} tracked price lines` : "Market feed loading",
        statusCopy: producerHeadline?.title
          ? `${producerHeadline.title}${producerHeadline.publishedAt ? ` · ${toRelativeTime(producerHeadline.publishedAt)}` : ""}`
          : "Producer news, input cost pressure, and AI recommendations will surface here from the backend feed.",
      },
      {
        href: "/government-dashboard",
        icon: Building2,
        eyebrow: "Government",
        title: "Policy intelligence for food security risk",
        copy: "CFSR trends, dashboard indices, supply risk, news alerts, and audit-ready AI analysis.",
        action: "Open Government Dashboard",
        featured: false,
        highlights: [
          riskScore === null ? "Risk trend" : `${Math.round(riskScore)}/100`,
          alertCount > 0 ? `${alertCount} alerts` : "Policy signals",
          "Evidence trail",
        ],
        statusLabel: "National brief",
        statusValue: riskScore === null ? "Risk update pending" : `${Math.round(riskScore)}/100 · ${readableBandLabel(cfsr?.riskBand)}`,
        statusCopy: cfsr?.computedAt
          ? `CFSR refreshed ${toRelativeTime(cfsr.computedAt)} with backend-fed signals ready for interpretation.`
          : "The policy brief will populate as soon as the latest CFSR update lands.",
      },
    ],
    [
      alertCount,
      cfsr?.computedAt,
      cfsr?.riskBand,
      cloudScanCount,
      cloudStatsQuery.isLoading,
      commodityCount,
      freshness.state,
      isAuthenticated,
      producerHeadline?.publishedAt,
      producerHeadline?.title,
      riskScore,
      severeCloudCount,
    ]
  );

  return (
    <div className="min-h-screen bg-[#edf6f0] text-[#0f2417] pb-16">
      <div className="w-full max-w-[1550px] mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* ── Top Breadcrumb & Live Status Bar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-white/90 px-4 py-1.5 text-xs font-bold text-emerald-800 shadow-sm">
            <Leaf className="h-4 w-4 text-emerald-600" />
            <span>AgriGuard Unified Food & Crop Intelligence</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-white/90 px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
            <Activity className="h-4 w-4 text-emerald-600" />
            <span>Backend Freshness: <strong className="text-emerald-700">{freshness.label}</strong></span>
          </div>
        </div>

        {/* ── Long Panoramic Hero Command Center ── */}
        <section
          className="relative overflow-hidden rounded-[28px] text-white shadow-md"
          style={{
            backgroundImage: "linear-gradient(135deg, rgba(6, 78, 59, 0.94), rgba(4, 120, 87, 0.82)), url('/images/hero-bg.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-emerald-950/30 pointer-events-none" />
          <div className="relative grid gap-6 p-6 md:p-8 xl:grid-cols-[minmax(0,1.3fr)_minmax(22rem,0.7fr)] items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/20 px-3.5 py-1 text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-100">
                <Leaf className="h-3.5 w-3.5 text-emerald-300" />
                Integrated National Ag-Platform
              </span>
              <h1 className="mt-4 text-3xl md:text-5xl font-black tracking-tight leading-tight">
                Protect crops. Maximize yield.<br />
                <span className="text-emerald-200">
                  Strengthen Malaysian food security.
                </span>
              </h1>
              <p className="mt-4 text-emerald-50/90 text-sm md:text-base leading-relaxed max-w-3xl">
                Unified crop disease diagnosis for farmers, live market prices from PriceCatcher, and national food supply risk monitoring in one enterprise decision workspace.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/scan"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-emerald-900 shadow-md hover:bg-emerald-50 transition-all hover:scale-[1.02]"
                >
                  <Camera className="h-4 w-4 text-emerald-700" />
                  Launch Crop Scanner
                  <ArrowRight className="h-4 w-4 text-emerald-700" />
                </Link>
                <Link
                  href="/farmer-hub"
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition-all"
                >
                  <Sprout className="h-4 w-4 text-emerald-300" />
                  Open Farmer Hub
                </Link>
                <Link
                  href="/farm-desk"
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-5 py-3 text-sm font-bold text-emerald-950 shadow-md transition-all hover:scale-[1.02] hover:bg-amber-200"
                >
                  <Sprout className="h-4 w-4" />
                  Open Farm Desk demo
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/government-dashboard"
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition-all"
                >
                  <Building2 className="h-4 w-4 text-emerald-300" />
                  Government Dashboard
                </Link>
              </div>
            </div>

            {/* Right Card: National Risk Radar Barometer */}
            <div className="rounded-2xl border border-white/20 bg-emerald-950/40 p-5 backdrop-blur shadow-lg">
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">
                  National Risk Radar
                </p>
                <span className={cn("rounded-full px-3 py-0.5 text-xs font-extrabold", riskBadgeClass(band))}>
                  {readableBandLabel(cfsr?.riskBand)}
                </span>
              </div>

              <div className="flex items-center gap-4 my-2">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/10 border border-white/15">
                  <div className="text-center">
                    <span className="text-3xl font-black text-white">
                      {riskScore === null ? "--" : Math.round(riskScore)}
                    </span>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                      /100 CFSR
                    </span>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white">Comprehensive Food Security Risk</p>
                  <p className="text-xs text-emerald-100/80 mt-1 leading-snug">
                    {cfsr?.computedAt
                      ? `Refreshed ${toRelativeTime(cfsr.computedAt)}. Supply lines stable.`
                      : "Aggregating 5 national risk dimensions including import dependency."}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/15 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-white/10 p-2.5">
                  <span className="text-emerald-200/80 block text-[10px] font-semibold uppercase">Commodities</span>
                  <span className="font-bold text-white text-sm">{commodityCount > 0 ? `${commodityCount} tracked` : "18 items"}</span>
                </div>
                <div className="rounded-xl bg-white/10 p-2.5">
                  <span className="text-emerald-200/80 block text-[10px] font-semibold uppercase">Active Notices</span>
                  <span className="font-bold text-white text-sm">{alertCount > 0 ? `${alertCount} notices` : "Normal status"}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Key Operational Signal Strip (Wide Panoramic) ── */}
        <div className="grid gap-4 sm:grid-cols-3">
          {signals.map((signal) => {
            const Icon = signal.icon;
            return (
              <div
                key={signal.label}
                className="rounded-2xl border border-[#d8e8dd] bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-emerald-300"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={cn("rounded-full px-3 py-1 text-xs font-bold", signal.badgeClass)}>
                    {signal.value}
                  </span>
                </div>
                <p className="mt-4 text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  {signal.label}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800 line-clamp-2">
                  {signal.detail}
                </p>
              </div>
            );
          })}
        </div>

        {/* ── Workspaces Section (Expansive Long Bars) ── */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Product Ecosystem</p>
              <h2 className="text-2xl font-black text-slate-900 mt-0.5">Explore AgriGuard Workspaces</h2>
            </div>
            <p className="text-xs text-slate-500 max-w-md sm:text-right">
              Large, dedicated surface bars designed for rapid access to field diagnosis, market intelligence, and government policy.
            </p>
          </div>

          <div className="space-y-4">
            {workspaces.map((ws) => {
              const Icon = ws.icon;
              return (
                <div
                  key={ws.href}
                  className="rounded-2xl border border-[#d8e8dd] bg-white p-5 md:p-6 shadow-sm hover:shadow-md transition-all hover:border-emerald-300 group"
                >
                  <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
                    {/* Left: Icon, category, title, description, and highlight tags */}
                    <div className="flex items-start gap-4 xl:max-w-2xl">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <Icon className="h-7 w-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                            {ws.eyebrow}
                          </span>
                        </div>
                        <h3 className="mt-1.5 text-xl font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {ws.title}
                        </h3>
                        <p className="mt-1 text-xs md:text-sm text-slate-600 leading-relaxed">
                          {ws.copy}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {ws.highlights.map((tag) => (
                            <span key={tag} className="rounded-lg bg-slate-50 border border-slate-200/60 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Middle: Long horizontal status telemetry pill */}
                    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 xl:w-96 shrink-0">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {ws.statusLabel}
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-800">
                        {ws.statusValue}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2">
                        {ws.statusCopy}
                      </p>
                    </div>

                    {/* Right: Direct Action CTA */}
                    <div className="shrink-0 flex items-center">
                      <Link
                        href={ws.href}
                        className="inline-flex w-full xl:w-auto items-center justify-center gap-2 rounded-xl bg-slate-900 group-hover:bg-emerald-600 px-6 py-3.5 text-xs font-bold text-white shadow-sm transition-all hover:scale-[1.02]"
                      >
                        {ws.action}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
