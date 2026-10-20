import { toRelativeTime } from "@/lib/dashboardStyle";

export type LiveRunLike = {
  success?: boolean | null;
  startedAt?: string | Date | null;
};

export type LiveDataStatusLike = {
  lastRuns?: LiveRunLike[] | null;
  allRecentLogs?: LiveRunLike[] | null;
};

export function coerceNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
}

export function getLiveFreshness(data: LiveDataStatusLike | undefined) {
  const runs = [...(data?.lastRuns ?? []), ...(data?.allRecentLogs ?? [])].filter(Boolean);
  const sorted = runs
    .map((run) => ({
      ...run,
      time: run.startedAt ? new Date(run.startedAt).getTime() : 0,
    }))
    .sort((a, b) => b.time - a.time);
  const latest = sorted[0];

  if (!latest) {
    return {
      state: "stale" as const,
      label: "Update pending",
      startedAt: null as string | null,
    };
  }

  if (latest.success === false) {
    return {
      state: "failed" as const,
      label: "Update failed",
      startedAt: String(latest.startedAt ?? ""),
    };
  }

  const ageMs = latest.time ? Date.now() - latest.time : Number.POSITIVE_INFINITY;
  const label = latest.startedAt ? `Updated ${toRelativeTime(latest.startedAt)}` : "Update pending";

  if (ageMs <= 24 * 60 * 60_000) {
    return {
      state: "fresh" as const,
      label,
      startedAt: String(latest.startedAt ?? ""),
    };
  }

  return {
    state: "stale" as const,
    label,
    startedAt: String(latest.startedAt ?? ""),
  };
}
