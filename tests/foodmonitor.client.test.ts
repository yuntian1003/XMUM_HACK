import { describe, expect, it, vi } from "vitest";
import { createFoodMonitorClient, createFoodMonitorConfig, FoodMonitorUpstreamError } from "../backend/integrations/foodmonitor";

function createTestConfig(overrides: Partial<ReturnType<typeof createFoodMonitorConfig>> = {}) {
  return {
    ...createFoodMonitorConfig({
      FOODMONITOR_API_BASE_URL: "http://foodmonitor.test/",
      FOODMONITOR_AUTH_MODE: "none",
      FOODMONITOR_JOB_SHARED_SECRET: "test-secret",
      FOODMONITOR_TIMEOUT_MS: "1000",
    } as NodeJS.ProcessEnv),
    ...overrides,
  };
}

describe("foodmonitor client", () => {
  it("normalizes the tRPC base URL to /trpc", () => {
    const client = createFoodMonitorClient({
      config: createTestConfig(),
      fetchImpl: vi.fn() as unknown as typeof fetch,
      headerProvider: async () => ({}),
    });

    expect(client.config.baseUrl).toBe("http://foodmonitor.test");
    expect(client.config.trpcUrl).toBe("http://foodmonitor.test/trpc");
  });

  it("calls REST read endpoints with auth headers", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ status: "ok", time: "2026-04-15T00:00:00.000Z" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    const client = createFoodMonitorClient({
      config: createTestConfig(),
      fetchImpl: fetchMock,
      headerProvider: async () => ({ Authorization: "Bearer test-token" }),
    });

    const result = await client.getHealth();

    expect(result.status).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://foodmonitor.test/api/health");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer test-token");
  });

  it("sends x-job-secret only for internal job calls", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ job: "fuel-price", success: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    const client = createFoodMonitorClient({
      config: createTestConfig(),
      fetchImpl: fetchMock,
      headerProvider: async () => ({ Authorization: "Bearer test-token" }),
    });

    const result = await client.runJob("fuel-price", { beforeDate: "2026-04-01", limit: 10 });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(url).toBe("http://foodmonitor.test/internal/jobs/fuel-price?beforeDate=2026-04-01&limit=10");
    expect(headers.get("x-job-secret")).toBe("test-secret");
    expect(headers.get("authorization")).toBe("Bearer test-token");
  });

  it("fails closed for internal endpoints without a server-side job secret", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const client = createFoodMonitorClient({
      config: createTestConfig({ jobSharedSecret: "" }),
      fetchImpl: fetchMock,
      headerProvider: async () => ({}),
    });

    await expect(client.runJob("compute-cfsr")).rejects.toMatchObject({
      code: "UPSTREAM_MISCONFIGURED",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("wraps HTTP errors with upstream context", async () => {
    const fetchMock = vi.fn(async () =>
      new Response("Forbidden", { status: 403 })
    ) as unknown as typeof fetch;
    const client = createFoodMonitorClient({
      config: createTestConfig(),
      fetchImpl: fetchMock,
      headerProvider: async () => ({}),
    });

    await expect(client.getStatus()).rejects.toBeInstanceOf(FoodMonitorUpstreamError);
    await expect(client.getStatus()).rejects.toMatchObject({
      code: "UPSTREAM_HTTP_ERROR",
      status: 403,
    });
  });
});
