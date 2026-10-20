import { createTRPCUntypedClient, httpBatchLink, TRPCClientError } from "@trpc/client";
import type { AnyRouter } from "@trpc/server";
import type { z } from "zod";
import { createCloudRunIdTokenHeaderProvider, type HeaderProvider } from "./auth";
import { createFoodMonitorConfig, type FoodMonitorConfig } from "./config";
import {
  FoodMonitorAiFlowResultSchema,
  FoodMonitorHealthSchema,
  FoodMonitorIngestLogSchema,
  FoodMonitorJobRunResultSchema,
  FoodMonitorProvenanceSchema,
  FoodMonitorStatusSchema,
  type FoodMonitorAiFlowName,
  type FoodMonitorAiFlowResult,
  type FoodMonitorHealth,
  type FoodMonitorIngestLog,
  type FoodMonitorJobName,
  type FoodMonitorJobParams,
  type FoodMonitorJobRunResult,
  type FoodMonitorProvenance,
  type FoodMonitorStatus,
} from "./contracts";
import { FoodMonitorUpstreamError, isFoodMonitorUpstreamError } from "./errors";

type FetchLike = typeof fetch;

export type FoodMonitorClientOptions = {
  config?: FoodMonitorConfig;
  fetchImpl?: FetchLike;
  headerProvider?: HeaderProvider;
};

function createTimeoutSignal(timeoutMs: number, upstreamSignal?: AbortSignal | null) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const abortFromUpstream = () => controller.abort();
  upstreamSignal?.addEventListener("abort", abortFromUpstream, { once: true });

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeout);
      upstreamSignal?.removeEventListener("abort", abortFromUpstream);
    },
  };
}

function toHeaders(initHeaders: HeadersInit | undefined): Headers {
  return new Headers(initHeaders);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function normalizeTrpcError(path: string, error: unknown): FoodMonitorUpstreamError {
  if (isFoodMonitorUpstreamError(error)) return error;

  if (error instanceof TRPCClientError) {
    const data = (error as TRPCClientError<AnyRouter> & { data?: { httpStatus?: number } }).data;
    return new FoodMonitorUpstreamError({
      code: data?.httpStatus === 408 ? "UPSTREAM_TIMEOUT" : "UPSTREAM_HTTP_ERROR",
      status: data?.httpStatus,
      message: `Foodmonitor tRPC ${path} failed: ${error.message}`,
      cause: error,
    });
  }

  return new FoodMonitorUpstreamError({
    code: "UPSTREAM_NETWORK_ERROR",
    message: `Foodmonitor tRPC ${path} failed: ${getErrorMessage(error)}`,
    cause: error,
  });
}

export class FoodMonitorClient {
  readonly config: FoodMonitorConfig;

  private readonly fetchImpl: FetchLike;
  private readonly headerProvider: HeaderProvider;
  private readonly trpcClient: ReturnType<typeof createTRPCUntypedClient<AnyRouter>>;

  constructor(options: FoodMonitorClientOptions = {}) {
    this.config = options.config ?? createFoodMonitorConfig();
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.headerProvider = options.headerProvider ?? createCloudRunIdTokenHeaderProvider(this.config);

    this.trpcClient = createTRPCUntypedClient<AnyRouter>({
      links: [
        httpBatchLink({
          url: this.config.trpcUrl,
          maxItems: 1,
          headers: () => this.headerProvider(),
          fetch: (input, init) => this.fetchWithTimeout(input as RequestInfo | URL, init as RequestInit | undefined),
        }),
      ],
    });
  }

  async callTrpcQuery<TOutput>(
    path: string,
    input?: unknown,
    schema?: z.ZodType<TOutput>,
  ): Promise<TOutput> {
    try {
      const result = await this.trpcClient.query(path, input);
      return schema ? this.parseResponse(path, result, schema) : (result as TOutput);
    } catch (error) {
      throw normalizeTrpcError(path, error);
    }
  }

  getHealth(): Promise<FoodMonitorHealth> {
    return this.getRest("/api/health", FoodMonitorHealthSchema);
  }

  getStatus(): Promise<FoodMonitorStatus> {
    return this.getRest("/api/status", FoodMonitorStatusSchema);
  }

  getIngestLog(): Promise<FoodMonitorIngestLog> {
    return this.getRest("/api/ingest-log", FoodMonitorIngestLogSchema);
  }

  getProvenance(): Promise<FoodMonitorProvenance> {
    return this.getRest("/api/provenance", FoodMonitorProvenanceSchema);
  }

  runJob(job: FoodMonitorJobName, params: FoodMonitorJobParams = {}): Promise<FoodMonitorJobRunResult> {
    const search = new URLSearchParams();
    if (params.beforeDate) search.set("beforeDate", params.beforeDate);
    if (params.limit != null) search.set("limit", String(params.limit));
    if (params.month) search.set("month", params.month);
    if (params.debug != null) search.set("debug", params.debug ? "1" : "0");

    const query = search.toString();
    const suffix = query ? `?${query}` : "";
    return this.postInternal(
      `/internal/jobs/${encodeURIComponent(job)}${suffix}`,
      undefined,
      FoodMonitorJobRunResultSchema,
    );
  }

  runAiFlow(flow: FoodMonitorAiFlowName, input: unknown): Promise<FoodMonitorAiFlowResult> {
    return this.postInternal(
      `/internal/ai/flows/${encodeURIComponent(flow)}`,
      input ?? {},
      FoodMonitorAiFlowResultSchema,
    );
  }

  private async getRest<TOutput>(path: string, schema: z.ZodType<TOutput>): Promise<TOutput> {
    return this.requestJson(path, { method: "GET" }, schema);
  }

  private async postInternal<TOutput>(
    path: string,
    body: unknown,
    schema: z.ZodType<TOutput>,
  ): Promise<TOutput> {
    if (!this.config.jobSharedSecret) {
      throw new FoodMonitorUpstreamError({
        code: "UPSTREAM_MISCONFIGURED",
        message: "FOODMONITOR_JOB_SHARED_SECRET is required for foodmonitor internal endpoints.",
      });
    }

    return this.requestJson(
      path,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-job-secret": this.config.jobSharedSecret },
        body: body === undefined ? undefined : JSON.stringify(body),
      },
      schema,
    );
  }

  private async requestJson<TOutput>(
    path: string,
    init: RequestInit,
    schema: z.ZodType<TOutput>,
  ): Promise<TOutput> {
    const url = `${this.config.baseUrl}${path}`;
    const headers = toHeaders(init.headers);
    const authHeaders = await this.headerProvider();
    for (const [key, value] of Object.entries(authHeaders)) {
      headers.set(key, value);
    }
    headers.set("accept", "application/json");

    let response: Response;
    try {
      response = await this.fetchWithTimeout(url, { ...init, headers });
    } catch (error) {
      if (isFoodMonitorUpstreamError(error)) throw error;
      throw new FoodMonitorUpstreamError({
        code: "UPSTREAM_NETWORK_ERROR",
        message: `Foodmonitor ${init.method ?? "GET"} ${path} failed: ${getErrorMessage(error)}`,
        cause: error,
      });
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new FoodMonitorUpstreamError({
        code: "UPSTREAM_HTTP_ERROR",
        status: response.status,
        message: `Foodmonitor ${init.method ?? "GET"} ${path} returned ${response.status}: ${text.slice(0, 240)}`,
      });
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch (error) {
      throw new FoodMonitorUpstreamError({
        code: "UPSTREAM_INVALID_JSON",
        message: `Foodmonitor ${init.method ?? "GET"} ${path} returned invalid JSON.`,
        cause: error,
      });
    }

    return this.parseResponse(path, json, schema);
  }

  private parseResponse<TOutput>(path: string, value: unknown, schema: z.ZodType<TOutput>): TOutput {
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      throw new FoodMonitorUpstreamError({
        code: "UPSTREAM_INVALID_RESPONSE",
        message: `Foodmonitor ${path} response did not match the expected contract: ${parsed.error.message}`,
        cause: parsed.error,
      });
    }
    return parsed.data;
  }

  private async fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const { signal, cleanup } = createTimeoutSignal(this.config.timeoutMs, init?.signal);
    try {
      return await this.fetchImpl(input, { ...(init ?? {}), signal });
    } catch (error) {
      const abortedByTimeout = signal.aborted && !init?.signal?.aborted;
      if (abortedByTimeout) {
        throw new FoodMonitorUpstreamError({
          code: "UPSTREAM_TIMEOUT",
          message: `Foodmonitor request timed out after ${this.config.timeoutMs}ms.`,
          cause: error,
        });
      }
      throw error;
    } finally {
      cleanup();
    }
  }
}

export function createFoodMonitorClient(options?: FoodMonitorClientOptions): FoodMonitorClient {
  return new FoodMonitorClient(options);
}

export const foodMonitorClient = createFoodMonitorClient();
