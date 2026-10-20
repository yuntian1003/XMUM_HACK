import { TRPCError } from "@trpc/server";

export type FoodMonitorUpstreamErrorCode =
  | "UPSTREAM_AUTH_ERROR"
  | "UPSTREAM_HTTP_ERROR"
  | "UPSTREAM_INVALID_JSON"
  | "UPSTREAM_INVALID_RESPONSE"
  | "UPSTREAM_MISCONFIGURED"
  | "UPSTREAM_NETWORK_ERROR"
  | "UPSTREAM_TIMEOUT";

export class FoodMonitorUpstreamError extends Error {
  readonly code: FoodMonitorUpstreamErrorCode;
  readonly status?: number;
  readonly cause?: unknown;

  constructor(params: {
    code: FoodMonitorUpstreamErrorCode;
    message: string;
    status?: number;
    cause?: unknown;
  }) {
    super(params.message);
    this.name = "FoodMonitorUpstreamError";
    this.code = params.code;
    this.status = params.status;
    this.cause = params.cause;
  }
}

export function isFoodMonitorUpstreamError(error: unknown): error is FoodMonitorUpstreamError {
  return error instanceof FoodMonitorUpstreamError;
}

export function toFoodMonitorTrpcError(error: unknown): TRPCError {
  if (isFoodMonitorUpstreamError(error)) {
    const code =
      error.code === "UPSTREAM_MISCONFIGURED"
        ? "PRECONDITION_FAILED"
        : error.status === 401 || error.status === 403
          ? "FORBIDDEN"
          : "BAD_GATEWAY";

    return new TRPCError({
      code,
      message: error.message,
      cause: error,
    });
  }

  return new TRPCError({
    code: "BAD_GATEWAY",
    message: `Foodmonitor upstream failed: ${error instanceof Error ? error.message : String(error)}`,
    cause: error,
  });
}
