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
    <div className="min-h-screen bg-white text-slate-950">
      <section
        className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden bg-cover bg-center px-4 py-10 md:px-8"
        style={{ backgroundImage: "url('/images/hero-bg.png')" }}
      >
        <div className="absolute inset-0 bg-white/82" />
        <div className="relative z-10 flex min-h-[calc(100vh-8.5rem)] flex-col justify-center">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
              <Leaf className="h-4 w-4" />
              FoodMonitor
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight text-emerald-950 md:text-6xl">
              One food intelligence platform, three clear product surfaces.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-700 md:text-lg">
              Crop Scanner handles field diagnosis, Farmer Hub turns signals into action, and Government Dashboard keeps policy decisions evidence-led.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/scan"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Open Crop Scanner
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/farmer-hub"
                className="inline-flex items-center gap-2 rounded-lg border border-transparent hover:border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                Open Farmer Hub
              </Link>
              <Link
                href="/government-dashboard"
                className="inline-flex items-center gap-2 rounded-lg border border-transparent hover:border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                Open Government Dashboard
              </Link>
            </div>
          </div>

          <div className="mt-10 grid gap-3 md:grid-cols-3">
            {signals.map((signal) => {
              const Icon = signal.icon;
              return (
                <div key={signal.label} className="rounded-lg border border-slate-200 bg-white/90 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                      <Icon className="h-5 w-5 text-emerald-700" />
                    </div>
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", signal.badgeClass)}>
                      {signal.value}
                    </span>
                  </div>
                  <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{signal.label}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{signal.detail}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 md:px-8">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-emerald-700">Choose Workspace</p>
            <h2 className="mt-1 text-2xl font-bold text-emerald-950">Start from the product surface you need.</h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
            <Activity className="h-4 w-4" />
            Backend status: {freshness.label}
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr_0.85fr]">
          {workspaces.map((workspace) => {
            const Icon = workspace.icon;
            return (
              <Link
                key={workspace.href}
                href={workspace.href}
                className={cn(
                  "group relative block rounded-[24px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-0.5",
                  workspace.featured
                    ? "overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-700 text-white hover:border-emerald-200"
                    : "border"
                )}
              >
                {workspace.featured && (
                  <>
                    <div className="absolute inset-0 bg-[url('/images/hero-bg.png')] bg-cover bg-center opacity-20" />
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/70 via-emerald-900/60 to-emerald-700/30" />
                  </>
                )}
                <div className="flex h-full flex-col gap-5">
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div className="relative z-10">
                      <span
                        className={cn(
                          "inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-semibold",
                          workspace.featured
                            ? "border border-white/20 bg-white/10 text-white"
                            : ""
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {workspace.eyebrow}
                      </span>
                      <h3 className={cn("mt-4 text-xl font-bold", workspace.featured ? "text-white" : "text-slate-950")}>{workspace.title}</h3>
                      <p className={cn("mt-2 max-w-2xl text-sm leading-6", workspace.featured ? "text-emerald-50/90" : "text-slate-600")}>
                        {workspace.copy}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {workspace.highlights.map((highlight) => (
                          <span
                            key={highlight}
                            className={cn(
                              "rounded-full px-2.5 py-1 text-xs font-semibold",
                              workspace.featured ? "bg-white/15 text-white" : "bg-white text-emerald-700 ring-1 ring-emerald-200"
                            )}
                          >
                            {highlight}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "relative z-10 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold",
                        workspace.featured
                          ? "bg-white text-emerald-800"
                          : "bg-white text-emerald-700 ring-1 ring-emerald-200 group-hover:bg-emerald-50 transition-colors duration-300"
                      )}
                    >
                      {workspace.action}
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>

                  <div
                    className={cn(
                      "relative z-10 mt-auto rounded-2xl border p-4",
                      workspace.featured
                        ? "border-white/15 bg-emerald-950/35 backdrop-blur"
                        : "border-emerald-100 bg-white"
                    )}
                  >
                    <p className={cn("text-xs font-bold uppercase tracking-[0.18em]", workspace.featured ? "text-emerald-100/75" : "text-emerald-700")}>
                      {workspace.statusLabel}
                    </p>
                    <p className={cn("mt-3 text-lg font-semibold leading-6", workspace.featured ? "text-white" : "text-slate-900")}>
                      {workspace.statusValue}
                    </p>
                    <p className={cn("mt-2 text-sm leading-6", workspace.featured ? "text-emerald-50/75" : "text-slate-600")}>
                      {workspace.statusCopy}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
