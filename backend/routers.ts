import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { ONE_YEAR_MS } from "@shared/const";
import { runPlantDiagnosisGenkit } from "./genkit/plantDiagnosis";
import { getAiAnalysisDashboard, getFuelDashboard, getFuzzyStateDashboard, getFxDashboard, getMacroIndicatorsDashboard, getManualBaselinesDashboard, getPriceCatcherDashboard, getWorldBankCommodityDashboard, getWorldBankPriceDashboard, insertScan, getLatestNewsItems, getRiskDashboard, getScansByUser, getScanStats, upsertUser } from "./db";
import { getCropTreatment } from "./cropTreatments";
import {
  identifyPlantDisease,
  identifyPlantSpecies,
  mapPlantNetToCropType,
} from "./plantnetService";
import {
  createLocalAuthUser,
  verifyLocalAuthUser,
} from "./_core/localAuthStore";
import { sdk } from "./_core/sdk";
import { searchVertexAiContext } from "./vertexAiSearch";
import {
  DashboardAssistantChatInputSchema,
  runDashboardAssistantChat,
} from "./assistantChat";
import {
  sendPOToTelegram,
  getPOStatus,
  getOrCreateLinkCode,
  getLinkedOwnerIds,
  saveCurrentLinks,
  isFarmLinked,
  unlinkFarm,
  type POItem,
} from "./telegram";
import { getAllLocalAuthUsers } from "./_core/localAuthStore";
import {
  FoodMonitorAiFlowNameSchema,
  FoodMonitorJobNameSchema,
  FoodMonitorJobParamsSchema,
  foodMonitorClient,
  mapFoodMonitorAiDashboard,
  mapFoodMonitorFuzzyDashboard,
  mapFoodMonitorNewsList,
  mapFoodMonitorRiskDashboard,
  toFoodMonitorTrpcError,
  getLocalFoodMonitorFallback,
  getFallbackRiskDashboard,
  getFallbackNewsList,
} from "./integrations/foodmonitor";

// ── Shared Zod schemas ────────────────────────────────────────────────────────

const ScanInputSchema = z.object({
  localId: z.string(),
  diseaseName: z.string(),
  diseaseKey: z.string(),
  confidence: z.number(),
  severity: z.enum(["healthy", "mild", "moderate", "severe"]),
  cropVariety: z.string().optional(),
  fieldId: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  notes: z.string().optional(),
  scannedAt: z.date(),
});

type AnalysisPayload = {
  confirmedDisease: string;
  confirmedDiseaseKey: string;
  confirmedSeverity: string;
  confidenceAdjustment: string;
  symptoms: string[];
  immediateActions: string[];
  treatmentPlan: {
    chemical: string;
    biological: string;
    cultural: string;
  };
  preventionTips: string[];
  yieldImpact: string;
  spreadRisk: string;
  urgency: string;
  additionalNotes: string;
};

type LocalDetectionSignal = {
  plantType: string;
  diseaseKey: string;
  diseaseName: string;
  confidence: number;
  severity: "healthy" | "mild" | "moderate" | "severe";
};

type PlantNetSpeciesSignal = {
  scientificName: string;
  commonNames: string[];
  confidence: number;
  organ: string;
  mappedCrop?: string;
};

type PlantNetDiseaseSignal = {
  diseaseName: string;
  scientificName?: string;
  confidence: number;
};

const severityRank: Record<LocalDetectionSignal["severity"], number> = {
  healthy: 0,
  mild: 1,
  moderate: 2,
  severe: 3,
};

function normalizeDiseaseKey(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "unknown"
  );
}
function pickMoreSevereSeverity(
  first: LocalDetectionSignal["severity"],
  second: LocalDetectionSignal["severity"]
): LocalDetectionSignal["severity"] {
  return severityRank[second] > severityRank[first] ? second : first;
}

function mergePlantNetAndLlmAnalysis(params: {
  analysis: AnalysisPayload;
  localDetection: LocalDetectionSignal;
  plantNetSpecies: PlantNetSpeciesSignal | null;
  plantNetDisease: PlantNetDiseaseSignal | null;
}): AnalysisPayload {
  const merged: AnalysisPayload = { ...params.analysis };
  const confidenceNotes: string[] = [];

  if (params.plantNetSpecies) {
    confidenceNotes.push(
      `PlantNet species: ${params.plantNetSpecies.scientificName} (${Math.round(
        params.plantNetSpecies.confidence * 100
      )}% confidence)`
    );
    if (params.plantNetSpecies.mappedCrop) {
      confidenceNotes.push(`Mapped crop: ${params.plantNetSpecies.mappedCrop}`);
    }
  }

  if (params.plantNetDisease) {
    confidenceNotes.push(
      `PlantNet disease: ${params.plantNetDisease.diseaseName} (${Math.round(
        params.plantNetDisease.confidence * 100
      )}% confidence)`
    );
  }

  confidenceNotes.push(
    `Local detector: ${params.localDetection.diseaseName} (${params.localDetection.diseaseKey}), severity ${params.localDetection.severity} (${Math.round(
      params.localDetection.confidence * 100
    )}% confidence)`
  );

  if (params.plantNetDisease && params.plantNetDisease.confidence >= 0.55) {
    merged.confirmedDisease = params.plantNetDisease.diseaseName;
    merged.confirmedDiseaseKey = normalizeDiseaseKey(
      params.plantNetDisease.scientificName ||
        params.plantNetDisease.diseaseName
    );
  } else if (
    !merged.confirmedDiseaseKey ||
    merged.confirmedDiseaseKey === "unknown"
  ) {
    merged.confirmedDiseaseKey = params.localDetection.diseaseKey;
  }

  if (
    params.plantNetDisease &&
    params.plantNetDisease.confidence >= 0.45 &&
    merged.confirmedDisease.toLowerCase() !==
      params.plantNetDisease.diseaseName.toLowerCase()
  ) {
    confidenceNotes.push(
      `PlantNet and LLM disagree on disease naming; using LLM wording with PlantNet as supporting evidence.`
    );
  }

  merged.confirmedSeverity = pickMoreSevereSeverity(
    merged.confirmedSeverity as LocalDetectionSignal["severity"],
    params.localDetection.severity
  );

  merged.spreadRisk =
    merged.confirmedSeverity === "healthy"
      ? "low"
      : merged.confirmedSeverity === "severe"
        ? "high"
        : merged.spreadRisk;

  merged.urgency =
    merged.confirmedSeverity === "healthy"
      ? "monitor"
      : merged.confirmedSeverity === "severe"
        ? "treat_immediately"
        : "treat_soon";

  merged.confidenceAdjustment = confidenceNotes.join(". ");

  merged.additionalNotes = `${merged.additionalNotes} This diagnosis was fused from the local detector, PlantNet, and the LLM.`;

  return merged;
}

function buildFallbackAnalysis(params: {
  diseaseName: string;
  diseaseKey: string;
  severity: string;
  cropType: string;
  cropTreatment: ReturnType<typeof getCropTreatment> | null | undefined;
  plantNetDiseaseHint?: string;
}): AnalysisPayload {
  const isHealthy =
    params.severity === "healthy" || params.diseaseKey === "healthy";
  const spreadRisk = isHealthy
    ? "low"
    : params.severity === "severe"
      ? "high"
      : "medium";
  const urgency = isHealthy
    ? "monitor"
    : params.severity === "severe"
      ? "treat_immediately"
      : "treat_soon";

  return {
    confirmedDisease: params.diseaseName,
    confirmedDiseaseKey: params.diseaseKey,
    confirmedSeverity: params.severity,
    confidenceAdjustment: params.plantNetDiseaseHint
      ? `PlantNet disease signal suggests: ${params.plantNetDiseaseHint}.`
      : `Generated from local detection and crop-specific fallback guidance for ${params.cropType}.`,
    symptoms: isHealthy
      ? ["No obvious lesions", "Uniform leaf color", "No severe tissue damage"]
      : [
          "Visible discoloration or lesion patterns",
          "Localized tissue stress symptoms",
          "Progression risk if untreated",
        ],
    immediateActions: isHealthy
      ? ["Continue monitoring every 3-5 days", "Maintain balanced irrigation"]
      : [
          "Remove severely affected plant parts",
          "Improve field hygiene and airflow",
          "Apply treatment according to local recommendation",
        ],
    treatmentPlan: {
      chemical:
        params.cropTreatment?.chemical ??
        "Apply suitable fungicide/insecticide based on local guidance.",
      biological:
        params.cropTreatment?.biological ??
        "Use approved bio-control agents where available.",
      cultural:
        params.cropTreatment?.cultural ??
        "Adjust irrigation, sanitation, and spacing to reduce spread.",
    },
    preventionTips: [
      "Use certified clean planting material",
      "Scout regularly and isolate early infections",
      "Avoid excessive nitrogen and water stress",
    ],
    yieldImpact: isHealthy
      ? "No expected yield impact."
      : "Potential moderate to high yield reduction if untreated.",
    spreadRisk,
    urgency,
    additionalNotes:
      "Fallback analysis used because upstream AI response was unavailable. Validate with local agronomy extension if symptoms worsen.",
  };
}

// ── App Router ────────────────────────────────────────────────────────────────

async function getFoodMonitorRiskDashboard(limit: number) {
  try {
    const days = Math.max(1, Math.min(365, limit));
    const [current, history] = await Promise.all([
      foodMonitorClient.callTrpcQuery("risk.getCfsr"),
      foodMonitorClient.callTrpcQuery("risk.getCfsrHistory", { days }),
    ]);
    return mapFoodMonitorRiskDashboard(current, history);
  } catch (error) {
    console.warn("[Foodmonitor] risk dashboard fallback:", error);
    return null;
  }
}

async function getFoodMonitorFuzzyDashboard() {
  try {
    const current = await foodMonitorClient.callTrpcQuery("risk.getFuzzyState");
    return mapFoodMonitorFuzzyDashboard(current);
  } catch (error) {
    console.warn("[Foodmonitor] fuzzy dashboard fallback:", error);
    return null;
  }
}

async function getFoodMonitorNews(limit: number) {
  try {
    const remote = await foodMonitorClient.callTrpcQuery("news.getLatest", { limit });
    return mapFoodMonitorNewsList(remote, limit);
  } catch (error) {
    console.warn("[Foodmonitor] news fallback:", error);
    return null;
  }
}

async function getFoodMonitorAiDashboard() {
  try {
    const remote = await foodMonitorClient.callTrpcQuery("ai.getAnalysis", {
      type: "cfsr_analysis",
    });
    return mapFoodMonitorAiDashboard(remote);
  } catch (error) {
    console.warn("[Foodmonitor] AI dashboard fallback:", error);
    return null;
  }
}

async function callFoodMonitorQuery(path: string, input?: unknown) {
  try {
    return await foodMonitorClient.callTrpcQuery(path, input);
  } catch (error) {
    const fallback = getLocalFoodMonitorFallback(path, input);
    if (fallback !== null && fallback !== undefined) {
      console.warn(`[FoodMonitor] Upstream query "${path}" unavailable (${(error as Error)?.message || error}). Using local fallback dataset.`);
      return fallback;
    }
    throw toFoodMonitorTrpcError(error);
  }
}

async function callFoodMonitorRest<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    throw toFoodMonitorTrpcError(error);
  }
}

export const appRouter = router({
  system: systemRouter,

  assistant: router({
    chat: publicProcedure
      .input(DashboardAssistantChatInputSchema)
      .mutation(async ({ input }) => runDashboardAssistantChat(input)),
  }),

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    signup: publicProcedure
      .input(
        z.object({
          name: z.string().min(2).max(100),
          email: z.string().email(),
          password: z.string().min(6).max(128),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const user = createLocalAuthUser({
          name: input.name,
          email: input.email,
          password: input.password,
        });

        // Best-effort DB sync — a cloud DB failure must NOT block the session cookie.
        try {
          await upsertUser({
            openId: user.openId,
            name: user.name,
            email: user.email,
            loginMethod: "local",
            lastSignedIn: new Date(),
          });
        } catch (dbErr) {
          console.warn("[Auth/signup] DB sync failed (non-fatal):", (dbErr as Error)?.message ?? dbErr);
        }

        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name,
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        return { success: true, user: { name: user.name, email: user.email } };
      }),
    login: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const user = verifyLocalAuthUser({
          email: input.email,
          password: input.password,
        });
        if (!user) {
          throw new Error("Invalid email or password.");
        }

        // Best-effort DB sync — a cloud DB failure must NOT block the session cookie.
        try {
          await upsertUser({
            openId: user.openId,
            name: user.name,
            email: user.email,
            loginMethod: "local",
            lastSignedIn: new Date(),
          });
        } catch (dbErr) {
          console.warn("[Auth/login] DB sync failed (non-fatal):", (dbErr as Error)?.message ?? dbErr);
        }

        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name,
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        return { success: true, user: { name: user.name, email: user.email } };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ── Tier 1: Crop Pathology Scans ─────────────────────────────────────────
  scans: router({
    sync: protectedProcedure
      .input(z.object({ scans: z.array(ScanInputSchema) }))
      .mutation(async ({ ctx, input }) => {
        let synced = 0;
        for (const scan of input.scans) {
          try {
            await insertScan({
              userId: ctx.user.id,
              localId: scan.localId,
              diseaseName: scan.diseaseName,
              diseaseKey: scan.diseaseKey,
              confidence: scan.confidence,
              severity: scan.severity,
              cropVariety: scan.cropVariety,
              fieldId: scan.fieldId,
              latitude: scan.latitude,
              longitude: scan.longitude,
              notes: scan.notes,
              synced: true,
              scannedAt: scan.scannedAt,
            });
            synced++;
          } catch (e) {
            console.error("Failed to sync scan:", e);
          }
        }
        return { synced };
      }),

    list: protectedProcedure
      .input(z.object({ limit: z.number().default(100) }))
      .query(async ({ ctx, input }) =>
        getScansByUser(ctx.user.id, input.limit)
      ),

    stats: protectedProcedure.query(async ({ ctx }) =>
      getScanStats(ctx.user.id)
    ),

    analyze: publicProcedure
      .input(
        z.object({
          imageBase64: z.string(),
          diseaseKey: z.string(),
          diseaseName: z.string(),
          confidence: z.number(),
          severity: z.string(),
          plantType: z.string().optional(),
          cropVariety: z.string().optional(),
          fieldId: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          // Crop type candidate from client-side detector (can be noisy)
          let detectedCropType = input.plantType || "unknown";
          const rawImageInput = input.imageBase64?.trim();
          if (!rawImageInput) {
            throw new Error("Missing imageBase64 payload");
          }

          const dataUrlMatch = /^data:([^;]+);base64,([\s\S]+)$/i.exec(
            rawImageInput
          );
          const normalizedBase64 = (dataUrlMatch
            ? dataUrlMatch[2]
            : rawImageInput
          ).replace(/\s+/g, "");
          const mimeType = (dataUrlMatch?.[1] || "image/jpeg").toLowerCase();
          const imageDataUrlForLlm = `data:${mimeType};base64,${normalizedBase64}`;
          const imageBuffer = Buffer.from(normalizedBase64, "base64");

          const [plantNetSpeciesResult, plantNetDiseaseResult] =
            await Promise.all([
              identifyPlantSpecies(imageBuffer, "auto"),
              identifyPlantDisease(imageBuffer, "auto"),
            ]);

          let plantNetSpecies: PlantNetSpeciesSignal | null = null;
          let plantNetDisease: PlantNetDiseaseSignal | null = null;
          let plantNetContext = "";

          if (plantNetSpeciesResult) {
            const mappedCrop = mapPlantNetToCropType(
              plantNetSpeciesResult.scientificName
            );
            if (
              mappedCrop &&
              (detectedCropType === "unknown" ||
                plantNetSpeciesResult.confidence >= 0.45)
            ) {
              detectedCropType = mappedCrop;
            }

            plantNetSpecies = {
              scientificName: plantNetSpeciesResult.scientificName,
              commonNames: plantNetSpeciesResult.commonNames,
              confidence: plantNetSpeciesResult.confidence,
              organ: plantNetSpeciesResult.organ,
              mappedCrop: mappedCrop ?? undefined,
            };

            plantNetContext += `\n\nPlantNet Species Identification:\nScientific Name: ${plantNetSpeciesResult.scientificName}\nCommon Names: ${plantNetSpeciesResult.commonNames.join(", ")}\nConfidence: ${(plantNetSpeciesResult.confidence * 100).toFixed(0)}%\nOrgan: ${plantNetSpeciesResult.organ}\nMapped Crop: ${mappedCrop ?? "unknown"}`;
          }

          if (plantNetDiseaseResult) {
            plantNetDisease = {
              diseaseName: plantNetDiseaseResult.diseaseName,
              scientificName: plantNetDiseaseResult.scientificName,
              confidence: plantNetDiseaseResult.confidence,
            };

            plantNetContext += `\nPlantNet Disease Identification:\nLikely disease: ${plantNetDiseaseResult.diseaseName}\nConfidence: ${Math.round(
              plantNetDiseaseResult.confidence * 100
            )}%`;
          }

          const vertexQuery = [
            detectedCropType,
            input.diseaseName,
            input.notes,
            plantNetDiseaseResult?.diseaseName,
          ]
            .filter(Boolean)
            .join(" ");

          const vertexContext = await searchVertexAiContext({
            query: vertexQuery,
          });

          if (vertexContext) {
            plantNetContext += `\n\nVertex AI Search Grounding:\n${vertexContext.summary}`;

            if (vertexContext.sources.length) {
              const sourcesText = vertexContext.sources
                .map((source, index) => `${index + 1}. ${source.title} - ${source.uri}`)
                .join("\n");
              plantNetContext += `\nSources:\n${sourcesText}`;
            }
          }

          // Get crop-specific treatment recommendations
          const cropTreatment =
            detectedCropType !== "unknown"
              ? getCropTreatment(detectedCropType, input.diseaseKey)
              : null;
          const treatmentContext = cropTreatment
            ? `\n\nCrop-Specific Treatment Reference:\nCrop: ${cropTreatment.cropName}\nRegion: ${cropTreatment.cropRegion}\nSeason: ${cropTreatment.cropSeason}\nChemical: ${cropTreatment.chemical}\nBiological: ${cropTreatment.biological}\nCultural: ${cropTreatment.cultural}\nExpected Recovery: ${cropTreatment.expectedRecovery}`
            : "";

          const analysis = await runPlantDiagnosisGenkit({
            imageDataUrl: imageDataUrlForLlm,
            detectedCropType,
            localDetection: {
              plantType: input.plantType || detectedCropType,
              diseaseKey: input.diseaseKey,
              diseaseName: input.diseaseName,
              confidence: input.confidence,
              severity: input.severity as LocalDetectionSignal["severity"],
            },
            plantNetSpecies: plantNetSpecies ?? undefined,
            plantNetDisease: plantNetDisease ?? undefined,
            cropVariety: input.cropVariety,
            notes: input.notes,
            plantNetContext,
            treatmentContext,
          });

          const fusedAnalysis = mergePlantNetAndLlmAnalysis({
            analysis,
            localDetection: {
              plantType: input.plantType || detectedCropType,
              diseaseKey: input.diseaseKey,
              diseaseName: input.diseaseName,
              confidence: input.confidence,
              severity: input.severity as LocalDetectionSignal["severity"],
            },
            plantNetSpecies,
            plantNetDisease,
          });

          return { success: true, analysis: fusedAnalysis };
        } catch (e) {
          console.warn("[Scans] AI analysis unavailable or failed. Using expert agronomy fallback:", (e as Error)?.message || e);
          const crop = input.plantType || "rice";
          const treatment = getCropTreatment(crop, input.diseaseKey);
          const fallback = buildFallbackAnalysis({
            diseaseName: input.diseaseName,
            diseaseKey: input.diseaseKey,
            severity: input.severity,
            cropType: crop,
            cropTreatment: treatment,
          });
          return { success: true, analysis: fallback };
        }
      }),
  }),

  news: router({
    getLatest: publicProcedure
      .input(
        z.object({
          commodity: z.string().optional(),
          severity: z.enum(["CRITICAL", "HIGH", "MODERATE", "LOW"]).optional(),
          side: z.enum(["producer", "consumer", "policy"]).optional(),
          limit: z.number().min(1).max(100).default(50),
        })
      )
      .query(async ({ input }) => callFoodMonitorQuery("news.getLatest", input)),
    list: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(1000).default(300) }))
      .query(async ({ input }) => {
        const remote = await getFoodMonitorNews(input.limit);
        if (remote && remote.length > 0) return remote;
        const local = await getLatestNewsItems(input.limit);
        return local && local.length > 0 ? local : getFallbackNewsList(input.limit);
      }),
  }),

  risk: router({
    getCfsr: publicProcedure.query(async () =>
      callFoodMonitorQuery("risk.getCfsr")
    ),
    getCfsrHistory: publicProcedure
      .input(z.object({ days: z.number().min(1).max(365).default(30) }))
      .query(async ({ input }) =>
        callFoodMonitorQuery("risk.getCfsrHistory", input)
      ),
    getFuzzyState: publicProcedure.query(async () =>
      callFoodMonitorQuery("risk.getFuzzyState")
    ),
    getDashboardIndices: publicProcedure.query(async () =>
      callFoodMonitorQuery("risk.getDashboardIndices")
    ),
    dashboard: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(30) }))
      .query(async ({ input }) => {
        const remote = await getFoodMonitorRiskDashboard(input.limit);
        if (remote) return remote;
        const local = await getRiskDashboard(input.limit);
        return local?.current ? local : getFallbackRiskDashboard(input.limit);
      }),
  }),

  fuzzy: router({
    dashboard: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(30) }))
      .query(async ({ input }) => {
        const remote = await getFoodMonitorFuzzyDashboard();
        return remote ?? getFuzzyStateDashboard(input.limit);
      }),
  }),

  ai: router({
    getAnalysis: publicProcedure
      .input(z.object({ type: z.enum(["cfsr_analysis", "recommendations", "gap_analysis"]).default("cfsr_analysis") }))
      .query(async ({ input }) => callFoodMonitorQuery("ai.getAnalysis", input)),
    dashboard: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(30) }))
      .query(async ({ input }) => {
        const remote = await getFoodMonitorAiDashboard();
        return remote ?? getAiAnalysisDashboard(input.limit);
      }),
  }),

  prices: router({
    getCurrent: publicProcedure
      .input(z.object({ item: z.string().optional() }))
      .query(async ({ input }) => callFoodMonitorQuery("prices.getCurrent", input)),
    getTrend: publicProcedure
      .input(z.object({ item: z.string(), days: z.number().min(1).max(180).default(7) }))
      .query(async ({ input }) => callFoodMonitorQuery("prices.getTrend", input)),
  }),

  liveData: router({
    getStatus: publicProcedure.query(async () =>
      callFoodMonitorQuery("liveData.getStatus")
    ),
  }),

  fx: router({
    latest: publicProcedure
      .input(z.object({ days: z.number().min(2).max(3650).default(3650) }))
      .query(async ({ input }) => getFxDashboard(input.days)),
  }),

  fuel: router({
    latest: publicProcedure
      .input(z.object({ days: z.number().min(2).max(90).default(30) }))
      .query(async ({ input }) => getFuelDashboard(input.days)),
  }),

  macro: router({
    indicators: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(30) }))
      .query(async ({ input }) => getMacroIndicatorsDashboard(input.limit)),
  }),

  manual: router({
    baselines: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(200).default(50) }))
      .query(async ({ input }) => getManualBaselinesDashboard(input.limit)),
  }),

  pricecatcher: router({
    latest: publicProcedure
      .input(z.object({ months: z.number().min(1).max(120).default(4), limit: z.number().min(0).max(250000).default(0) }))
      .query(async ({ input }) => getPriceCatcherDashboard(input.months, input.limit)),
  }),

  worldbank: router({
    prices: publicProcedure
      .input(z.object({ months: z.number().min(3).max(60).default(24) }))
      .query(async ({ input }) => getWorldBankPriceDashboard(input.months)),
    commodities: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(5000).default(500) }))
      .query(async ({ input }) => getWorldBankCommodityDashboard(input.limit)),
  }),

  foodmonitor: router({
    health: publicProcedure.query(async () =>
      callFoodMonitorRest(() => foodMonitorClient.getHealth())
    ),
    status: publicProcedure.query(async () =>
      callFoodMonitorRest(() => foodMonitorClient.getStatus())
    ),
    ingestLog: publicProcedure.query(async () =>
      callFoodMonitorRest(() => foodMonitorClient.getIngestLog())
    ),
    provenance: publicProcedure.query(async () =>
      callFoodMonitorRest(() => foodMonitorClient.getProvenance())
    ),
    jobs: router({
      run: adminProcedure
        .input(
          z.object({
            job: FoodMonitorJobNameSchema,
            params: FoodMonitorJobParamsSchema.default({}),
          })
        )
        .mutation(async ({ input }) =>
          callFoodMonitorRest(() => foodMonitorClient.runJob(input.job, input.params))
        ),
    }),
    aiFlows: router({
      run: adminProcedure
        .input(
          z.object({
            flow: FoodMonitorAiFlowNameSchema,
            input: z.unknown().optional(),
          })
        )
        .mutation(async ({ input }) =>
          callFoodMonitorRest(() => foodMonitorClient.runAiFlow(input.flow, input.input ?? {}))
        ),
    }),
  }),

  // ── Farm Desk Telegram PO approval (multi-owner, auth-gated linking) ────────────
  farmDesk: router({
    // Generate the deterministic link code for the logged-in user.
    // Requires authentication — unauthenticated users get UNAUTHORIZED.
    // The code is always the same for the same user (derived from openId).
    generateLinkCode: protectedProcedure
      .mutation(({ ctx }) => {
        const code = getOrCreateLinkCode(ctx.user.openId);
        return { code, farmId: ctx.user.openId };
      }),

    // Check whether the current logged-in user has a linked Telegram.
    // Also flushes any in-memory links to disk so they survive restarts.
    getLinkStatus: protectedProcedure
      .query(({ ctx }) => {
        const linked = isFarmLinked(ctx.user.openId);
        if (linked) saveCurrentLinks(); // ensure persisted to disk
        return { linked, farmId: ctx.user.openId };
      }),

    // Unlink (owner can re-link a different Telegram account).
    unlinkTelegram: protectedProcedure
      .mutation(({ ctx }) => {
        unlinkFarm(ctx.user.openId);
        return { ok: true };
      }),

    // List all registered owners for the Worker's owner picker.
    // Returns ALL users with a telegramLinked flag so workers can always pick,
    // even if the owner hasn't linked Telegram yet.
    getAllOwners: publicProcedure
      .query(() => {
        const linkedIds = new Set(getLinkedOwnerIds());
        const allUsers = getAllLocalAuthUsers();
        return allUsers.map((u) => ({
          openId: u.openId,
          name: u.name,
          email: u.email,
          telegramLinked: linkedIds.has(u.openId),
        }));
      }),

    // Send the PO draft — targetFarmId is the worker-selected owner's openId.
    // Falls back to the manager's own farmId if no target was selected.
    sendPO: publicProcedure
      .input(
        z.object({
          poId: z.string(),
          farmId: z.string(),
          targetFarmId: z.string().optional(),
          items: z.array(
            z.object({
              name: z.string(),
              qty: z.number(),
              unit: z.string(),
              unitPrice: z.number(),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        const recipientId = input.targetFarmId ?? input.farmId;
        return sendPOToTelegram(input.poId, input.items as POItem[], recipientId);
      }),

    // Poll for the owner's approve/reject decision.
    pollStatus: publicProcedure
      .input(z.object({ poId: z.string() }))
      .query(({ input }) => {
        const record = getPOStatus(input.poId);
        return {
          status: record?.status ?? null,
          decidedAt: record?.decidedAt ?? null,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
