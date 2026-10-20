import { GoogleAuth } from "google-auth-library";
import type { FoodMonitorConfig } from "./config";
import { FoodMonitorUpstreamError } from "./errors";

export type HeaderProvider = () => Promise<Record<string, string>>;

function headersToRecord(headers: unknown): Record<string, string> {
  const output: Record<string, string> = {};

  if (headers && typeof (headers as Headers).forEach === "function") {
    (headers as Headers).forEach((value, key) => {
      output[key] = value;
    });
    return output;
  }

  if (headers && typeof headers === "object") {
    for (const [key, value] of Object.entries(headers as Record<string, unknown>)) {
      if (value != null) output[key] = String(value);
    }
  }

  return output;
}

export function createCloudRunIdTokenHeaderProvider(config: FoodMonitorConfig): HeaderProvider {
  if (config.authMode === "none") {
    return async () => ({});
  }

  const auth = new GoogleAuth();
  let clientPromise: ReturnType<GoogleAuth["getIdTokenClient"]> | null = null;

  return async () => {
    try {
      clientPromise ??= auth.getIdTokenClient(config.audience);
      const client = await clientPromise;
      const headers = headersToRecord(await client.getRequestHeaders(config.audience));
      const authHeader = headers.authorization ?? headers.Authorization;

      if (!authHeader) {
        throw new Error("Google auth client did not return an Authorization header.");
      }

      return { Authorization: authHeader };
    } catch (error) {
      throw new FoodMonitorUpstreamError({
        code: "UPSTREAM_AUTH_ERROR",
        message: `Unable to create foodmonitor Cloud Run ID token for ${config.audience}.`,
        cause: error,
      });
    }
  };
}
