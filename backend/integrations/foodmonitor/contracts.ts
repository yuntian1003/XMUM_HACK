import { z } from "zod";

export const FOODMONITOR_JOB_NAMES = [
  "bnm-fx",
  "fuel-price",
  "news-rss",
  "worldbank-rtfp",
  "pricecatcher-sync",
  "compute-cfsr",
  "generate-ai",
] as const;

export const FOODMONITOR_AI_FLOW_NAMES = [
  "government-brief",
  "farmer-watch",
  "evidence-check",
] as const;

export type FoodMonitorJobName = (typeof FOODMONITOR_JOB_NAMES)[number];
export type FoodMonitorAiFlowName = (typeof FOODMONITOR_AI_FLOW_NAMES)[number];

export const FoodMonitorJobNameSchema = z.enum(FOODMONITOR_JOB_NAMES);
export const FoodMonitorAiFlowNameSchema = z.enum(FOODMONITOR_AI_FLOW_NAMES);

export const FoodMonitorJobParamsSchema = z.object({
  beforeDate: z.string().optional(),
  limit: z.number().int().positive().max(100000).optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  debug: z.boolean().optional(),
});

export type FoodMonitorJobParams = z.infer<typeof FoodMonitorJobParamsSchema>;

const nullableDateLike = z.union([z.string(), z.date(), z.null()]).optional();

export const FoodMonitorHealthSchema = z.object({
  status: z.string(),
  time: z.string(),
});

export const FoodMonitorIngestLogEntrySchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    job: z.string().optional(),
    success: z.boolean().optional(),
    startedAt: nullableDateLike,
    finishedAt: nullableDateLike,
    durationMs: z.number().nullable().optional(),
    rowsWritten: z.number().nullable().optional(),
    error: z.string().nullable().optional(),
    isFallback: z.boolean().nullable().optional(),
    createdAt: nullableDateLike,
  })
  .catchall(z.unknown());

export const FoodMonitorStatusSchema = z.object({
  generatedAt: z.string(),
  jobs: z.array(
    z
      .object({
        job: FoodMonitorJobNameSchema.or(z.string()),
        description: z.string().optional(),
        schedule: z.string().optional(),
        lastRun: z
          .object({
            success: z.boolean().optional(),
            startedAt: nullableDateLike,
            finishedAt: nullableDateLike,
            durationMs: z.number().nullable().optional(),
            rowsWritten: z.number().nullable().optional(),
            error: z.string().nullable().optional(),
            fallbackUsed: z.boolean().nullable().optional(),
          })
          .catchall(z.unknown())
          .nullable(),
      })
      .catchall(z.unknown()),
  ),
  recentRuns: z.array(FoodMonitorIngestLogEntrySchema),
});

export const FoodMonitorIngestLogSchema = z.object({
  logs: z.array(FoodMonitorIngestLogEntrySchema),
});

export const FoodMonitorProvenanceSchema = z.object({
  computedAt: z.union([z.string(), z.date(), z.null()]).optional(),
  dataSources: z.array(z.string()),
});

export const FoodMonitorJobRunResultSchema = z
  .object({
    job: FoodMonitorJobNameSchema.or(z.string()),
  })
  .catchall(z.unknown());

export const FoodMonitorAiFlowResultSchema = z
  .object({
    success: z.boolean(),
    id: z.string(),
    flow: FoodMonitorAiFlowNameSchema.or(z.string()),
    generatedAt: z.string(),
    dataContext: z.unknown(),
    output: z.unknown(),
  })
  .catchall(z.unknown());

export const FoodMonitorAgentAnswerSchema = z.object({
  answer: z.string(),
  highlights: z.array(z.string()).default([]),
  limitations: z.array(z.string()).default([]),
  citations: z.array(z.string()).default([]),
  recommendedWording: z.string().optional(),
});

export type FoodMonitorHealth = z.infer<typeof FoodMonitorHealthSchema>;
export type FoodMonitorStatus = z.infer<typeof FoodMonitorStatusSchema>;
export type FoodMonitorIngestLog = z.infer<typeof FoodMonitorIngestLogSchema>;
export type FoodMonitorProvenance = z.infer<typeof FoodMonitorProvenanceSchema>;
export type FoodMonitorJobRunResult = z.infer<typeof FoodMonitorJobRunResultSchema>;
export type FoodMonitorAiFlowResult = z.infer<typeof FoodMonitorAiFlowResultSchema>;
export type FoodMonitorAgentAnswer = z.infer<typeof FoodMonitorAgentAnswerSchema>;
