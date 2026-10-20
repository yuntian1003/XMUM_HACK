export type FoodMonitorAuthMode = "cloud-run-id-token" | "none";

export type FoodMonitorConfig = {
  baseUrl: string;
  trpcUrl: string;
  audience: string;
  authMode: FoodMonitorAuthMode;
  jobSharedSecret: string;
  timeoutMs: number;
};

const DEFAULT_FOODMONITOR_URL =
  "https://foodmonitor-15891690721.asia-southeast1.run.app";

export function normalizeBaseUrl(value: string | undefined): string {
  const trimmed = value?.trim() || DEFAULT_FOODMONITOR_URL;
  return trimmed.replace(/\/+$/, "");
}

export function normalizeAuthMode(value: string | undefined): FoodMonitorAuthMode {
  return value?.trim() === "none" ? "none" : "cloud-run-id-token";
}

export function createFoodMonitorConfig(env: NodeJS.ProcessEnv = process.env): FoodMonitorConfig {
  const baseUrl = normalizeBaseUrl(env.FOODMONITOR_API_BASE_URL);
  const audience = env.FOODMONITOR_AUDIENCE?.trim() || baseUrl;
  const timeoutMs = Number(env.FOODMONITOR_TIMEOUT_MS ?? 15000);

  return {
    baseUrl,
    trpcUrl: `${baseUrl}/trpc`,
    audience,
    authMode: normalizeAuthMode(env.FOODMONITOR_AUTH_MODE),
    jobSharedSecret: env.FOODMONITOR_JOB_SHARED_SECRET?.trim() ?? "",
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 15000,
  };
}
