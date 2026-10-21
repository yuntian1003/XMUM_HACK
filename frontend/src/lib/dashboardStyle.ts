export type RiskBand = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function normalizeRiskBand(value: string | null | undefined): RiskBand {
  const band = String(value ?? "").toLowerCase();
  if (band === "low") return "LOW";
  if (band === "moderate" || band === "medium") return "MODERATE";
  if (band === "critical") return "CRITICAL";
  return "HIGH";
}

export function riskBadgeClass(band: RiskBand) {
  if (band === "LOW") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  if (band === "MODERATE") return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  if (band === "HIGH") return "bg-red-50 text-red-700 ring-1 ring-red-200";
  return "bg-red-600 text-white ring-1 ring-red-700";
}

export function stateBadgeClass(value: string | null | undefined) {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("critical") || normalized.includes("high") || normalized.includes("severe")) {
    return "bg-red-50 text-red-700 ring-1 ring-red-200";
  }
  if (normalized.includes("moderate") || normalized.includes("watch") || normalized.includes("warning") || normalized.includes("fallback")) {
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  }
  if (normalized.includes("derived") || normalized.includes("observed")) {
    return "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200";
  }
  if (!normalized) return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
}

export function formatScoreMeta(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${(value * 100).toFixed(0)}%`;
}

export function formatPct(value: number | null | undefined, fallback = "No previous record") {
  if (value === null || value === undefined || Number.isNaN(value)) return fallback;
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function formatRinggit(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `RM ${value.toFixed(digits)}`;
}

export function formatUsd(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `USD ${value.toFixed(2)}`;
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "-";
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString();
}

export function toRelativeTime(value: number | string | Date) {
  const time = value instanceof Date ? value.getTime() : typeof value === "number" ? value : new Date(value).getTime();
  if (Number.isNaN(time)) return "Unknown time";
  const diff = Date.now() - time;
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function sourceBadge(source: string | null | undefined) {
  if (!source) return { label: "No source", className: "bg-slate-100 text-slate-700 ring-1 ring-slate-200" };
  if (source.includes("live") || source.includes("api")) {
    return { label: source, className: "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200" };
  }
  if (source.includes("fallback")) {
    return { label: source, className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" };
  }
  return { label: source, className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" };
}

export const dashboardShell = "min-h-screen w-full bg-[#edf6f0] px-4 py-6 text-[#0f2417] md:px-8";
export const dashboardFrame = "w-full bg-[#edf6f0]";
export const farmerFrame = "w-full bg-[#edf6f0]";
export const metricCard = "rounded-xl border border-[#d8e8dd] bg-white p-4 shadow-sm text-[#0f2417]";
export const softPanel = "rounded-xl border border-[#d8e8dd] bg-white p-4 text-[#0f2417]";
