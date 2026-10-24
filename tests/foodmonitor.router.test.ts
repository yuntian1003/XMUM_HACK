import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../backend/_core/context";

const foodMonitorClientMock = vi.hoisted(() => ({
  callTrpcQuery: vi.fn(async (path: string, input?: unknown) => ({ path, input })),
  getHealth: vi.fn(async () => ({ status: "ok", time: "2026-04-15T00:00:00.000Z" })),
  getStatus: vi.fn(async () => ({ generatedAt: "2026-04-15T00:00:00.000Z", jobs: [], recentRuns: [] })),
  getIngestLog: vi.fn(async () => ({ logs: [] })),
  getProvenance: vi.fn(async () => ({ computedAt: "2026-04-15T00:00:00.000Z", dataSources: [] })),
  runJob: vi.fn(async (job: string, params?: unknown) => ({ job, params, success: true })),
  runAiFlow: vi.fn(async (flow: string, input?: unknown) => ({
    success: true,
    id: "trace-1",
    flow,
    generatedAt: "2026-04-15T00:00:00.000Z",
    dataContext: {},
    output: {
      answer: `${flow} answer`,
      highlights: ["Useful signal"],
      limitations: [],
      citations: ["dashboard:latest"],
    },
  })),
}));

vi.mock("../backend/integrations/foodmonitor", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../backend/integrations/foodmonitor")>();
  return {
    ...actual,
    foodMonitorClient: foodMonitorClientMock,
  };
});

import { appRouter } from "../backend/routers";
import { FoodMonitorUpstreamError } from "../backend/integrations/foodmonitor";

type UserRole = NonNullable<TrpcContext["user"]>["role"];

function createContext(role: UserRole | null = null): TrpcContext {
  return {
    user: role
      ? {
          id: 1,
          openId: `${role}-user`,
          email: `${role}@example.com`,
          name: `${role} user`,
          loginMethod: "local",
          role,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        }
      : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("foodmonitor router integration", () => {
  beforeEach(() => {
    foodMonitorClientMock.callTrpcQuery.mockClear();
    foodMonitorClientMock.getHealth.mockClear();
    foodMonitorClientMock.getStatus.mockClear();
    foodMonitorClientMock.getIngestLog.mockClear();
    foodMonitorClientMock.getProvenance.mockClear();
    foodMonitorClientMock.runJob.mockClear();
    foodMonitorClientMock.runAiFlow.mockClear();
  });

  it("mirrors public foodmonitor tRPC procedures", async () => {
    const caller = appRouter.createCaller(createContext());

    const result = await caller.risk.getCfsr();

    expect(result).toEqual({ path: "risk.getCfsr", input: undefined });
    expect(foodMonitorClientMock.callTrpcQuery).toHaveBeenCalledWith("risk.getCfsr", undefined);
  });

  it("exposes foodmonitor REST read endpoints", async () => {
    const caller = appRouter.createCaller(createContext());

    const result = await caller.foodmonitor.health();

    expect(result.status).toBe("ok");
    expect(foodMonitorClientMock.getHealth).toHaveBeenCalled();
  });

  it("rejects non-admin internal job triggers", async () => {
    const caller = appRouter.createCaller(createContext("user"));

    await expect(
      caller.foodmonitor.jobs.run({ job: "compute-cfsr", params: {} })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows admins to trigger a supported job", async () => {
    const caller = appRouter.createCaller(createContext("admin"));

    const result = await caller.foodmonitor.jobs.run({
      job: "fuel-price",
      params: { beforeDate: "2026-04-01", limit: 10 },
    });

    expect(result).toMatchObject({ job: "fuel-price", success: true });
    expect(foodMonitorClientMock.runJob).toHaveBeenCalledWith("fuel-price", {
      beforeDate: "2026-04-01",
      limit: 10,
    });
  });

  it("allows admins to trigger a supported AI flow", async () => {
    const caller = appRouter.createCaller(createContext("admin"));

    const result = await caller.foodmonitor.aiFlows.run({
      flow: "evidence-check",
      input: { question: "Is diesel linked to rice?", commodity: "rice", days: 30 },
    });

    expect(result).toMatchObject({ success: true, flow: "evidence-check" });
    expect(foodMonitorClientMock.runAiFlow).toHaveBeenCalledWith("evidence-check", {
      question: "Is diesel linked to rice?",
      commodity: "rice",
      days: 30,
    });
  });

  it("routes government assistant questions to the government brief flow", async () => {
    const caller = appRouter.createCaller(createContext());

    const result = await caller.assistant.chat({
      dashboard: "government",
      message: "What changed in food security today?",
    });

    expect(result.kind).toBe("answer");
    expect(result.flow).toBe("government-brief");
    expect(result.output.answer).toBe("government-brief answer");
    expect(foodMonitorClientMock.runAiFlow).toHaveBeenCalledWith(
      "government-brief",
      { question: "What changed in food security today?" }
    );
  });

  it("routes evidence and causality questions to evidence-check", async () => {
    const caller = appRouter.createCaller(createContext());

    const result = await caller.assistant.chat({
      dashboard: "government",
      message: "Can I say diesel prices caused rice prices to rise?",
    });

    expect(result.kind).toBe("answer");
    expect(result.flow).toBe("evidence-check");
    expect(foodMonitorClientMock.runAiFlow).toHaveBeenCalledWith(
      "evidence-check",
      expect.objectContaining({
        question: "Can I say diesel prices caused rice prices to rise?",
        commodity: "rice",
        days: 30,
      })
    );
  });

  it("asks for state before running farmer-watch", async () => {
    const caller = appRouter.createCaller(createContext());

    const result = await caller.assistant.chat({
      dashboard: "farmer",
      message: "What should I watch this week?",
    });

    expect(result.kind).toBe("needs_state");
    expect(result.flow).toBe("farmer-watch");
    expect(result.pendingQuestion).toBe("What should I watch this week?");
    expect(foodMonitorClientMock.runAiFlow).not.toHaveBeenCalled();
  });

  it("uses the pending farmer question after a state follow-up", async () => {
    const caller = appRouter.createCaller(createContext());

    const result = await caller.assistant.chat({
      dashboard: "farmer",
      message: "Selangor",
      pendingQuestion: "What should I watch this week?",
    });

    expect(result.kind).toBe("answer");
    expect(result.flow).toBe("farmer-watch");
    expect(result.state).toBe("Selangor");
    expect(foodMonitorClientMock.runAiFlow).toHaveBeenCalledWith(
      "farmer-watch",
      { question: "What should I watch this week?", state: "Selangor" }
    );
  });

  it("returns a friendly assistant error when FoodMonitor flow calls fail", async () => {
    foodMonitorClientMock.runAiFlow.mockRejectedValueOnce(
      new Error("upstream down")
    );
    const caller = appRouter.createCaller(createContext());

    const result = await caller.assistant.chat({
      dashboard: "government",
      message: "What changed today?",
    });

    expect(result.kind).toBe("error");
    expect(result.flow).toBe("government-brief");
    expect(result.output.answer).toContain("could not reach");
    expect(result.output.limitations).toContain(
      "FoodMonitor AI flow call failed before a grounded answer was returned."
    );
  });

  it("explains Cloud Run ID-token auth failures clearly", async () => {
    foodMonitorClientMock.runAiFlow.mockRejectedValueOnce(
      new FoodMonitorUpstreamError({
        code: "UPSTREAM_AUTH_ERROR",
        message: "Unable to create foodmonitor Cloud Run ID token.",
      })
    );
    const caller = appRouter.createCaller(createContext());

    const result = await caller.assistant.chat({
      dashboard: "government",
      message: "What changed today?",
    });

    expect(result.kind).toBe("error");
    expect(result.output.answer).toContain("cannot authenticate");
    expect(result.output.limitations[0]).toContain("Cloud Run ID-token auth");
  });

  it("explains FoodMonitor 401 internal secret rejections clearly", async () => {
    foodMonitorClientMock.runAiFlow.mockRejectedValueOnce(
      new FoodMonitorUpstreamError({
        code: "UPSTREAM_HTTP_ERROR",
        status: 401,
        message: "Unauthorized",
      })
    );
    const caller = appRouter.createCaller(createContext());

    const result = await caller.assistant.chat({
      dashboard: "government",
      message: "What changed today?",
    });

    expect(result.kind).toBe("error");
    expect(result.output.answer).toContain("job secret");
    expect(result.output.limitations[0]).toContain("HTTP 401");
    expect(result.output.limitations[0]).toContain("x-job-secret");
  });

  it("explains FoodMonitor 403 Cloud Run rejections clearly", async () => {
    foodMonitorClientMock.runAiFlow.mockRejectedValueOnce(
      new FoodMonitorUpstreamError({
        code: "UPSTREAM_HTTP_ERROR",
        status: 403,
        message: "Forbidden",
      })
    );
    const caller = appRouter.createCaller(createContext());

    const result = await caller.assistant.chat({
      dashboard: "government",
      message: "What changed today?",
    });

    expect(result.kind).toBe("error");
    expect(result.output.answer).toContain("before it reached");
    expect(result.output.limitations[0]).toContain("HTTP 403");
  });

  it("gives cautious wording for evidence questions when AI quota is exhausted", async () => {
    foodMonitorClientMock.runAiFlow.mockRejectedValueOnce(
      new FoodMonitorUpstreamError({
        code: "UPSTREAM_HTTP_ERROR",
        status: 500,
        message:
          "Foodmonitor POST /internal/ai/flows/evidence-check returned 500: RESOURCE_EXHAUSTED: [429 Too Many Requests] quota exceeded",
      })
    );
    const caller = appRouter.createCaller(createContext());

    const result = await caller.assistant.chat({
      dashboard: "government",
      message: "Can I say diesel prices caused rice prices to rise?",
    });

    expect(result.kind).toBe("error");
    expect(result.flow).toBe("evidence-check");
    expect(result.output.answer).toContain("Do not state");
    expect(result.output.recommendedWording).toContain("may have contributed");
    expect(result.output.limitations[0]).toContain("quota");
  });
});
