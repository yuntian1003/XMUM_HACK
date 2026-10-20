import { z } from "zod";
import {
  FoodMonitorAgentAnswerSchema,
  foodMonitorClient,
  isFoodMonitorUpstreamError,
  type FoodMonitorAiFlowName,
} from "./integrations/foodmonitor";
import { invokeLLM } from "./_core/llm";
import { searchVertexAiContext } from "./vertexAiSearch";

const AssistantMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});

export const DashboardAssistantChatInputSchema = z.object({
  dashboard: z.enum(["government", "farmer"]),
  message: z.string().trim().min(1).max(4000),
  history: z.array(AssistantMessageSchema).max(20).optional(),
  state: z.string().trim().max(128).optional(),
  district: z.string().trim().max(128).optional(),
  commodity: z.string().trim().max(128).optional(),
  pendingQuestion: z.string().trim().max(4000).optional(),
});

const DashboardAssistantChatOutputSchema = z.object({
  kind: z.enum(["answer", "needs_state", "error"]),
  flow: z.enum(["government-brief", "farmer-watch", "evidence-check"]).optional(),
  output: FoodMonitorAgentAnswerSchema,
  generatedAt: z.string().optional(),
  dataContext: z.unknown().optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  pendingQuestion: z.string().optional(),
});

type DashboardAssistantChatInput = z.infer<typeof DashboardAssistantChatInputSchema>;
export type DashboardAssistantChatOutput = z.infer<typeof DashboardAssistantChatOutputSchema>;

type AgentAnswer = z.infer<typeof FoodMonitorAgentAnswerSchema>;

const LocalRagAnswerSchema = z.object({
  answer: z.string().min(1),
  highlights: z.array(z.string()).default([]),
  limitations: z.array(z.string()).default([]),
  recommendedWording: z.string().optional(),
});

const FACTUAL_NEWS_RAG_SYSTEM_PROMPT = [
  "You are a factual agriculture policy assistant.",
  "Rules:",
  "1. Use only the retrieved documents.",
  "2. Do not use prior knowledge unless it is directly supported by retrieved text.",
  "3. Do not make predictions, promises, or opinionated claims.",
  "4. Distinguish clearly between announced, proposed, implemented, and reported impact.",
  "5. If a retrieved source contains a promise, report it as a claim by the source, not as fact.",
  "6. If evidence is missing or conflicting, say so plainly.",
  "7. Quote dates precisely.",
  "8. Return concise factual prose plus citations.",
].join("\n");

const FACTUAL_NEWS_RAG_DEVELOPER_INSTRUCTIONS = [
  "When describing initiatives:",
  "- Say announced, stated, reported, published, or implemented.",
  "- Never say will definitely improve, guarantees, proves, or similar.",
].join("\n");

const MALAYSIAN_STATE_ALIASES: Array<{ state: string; aliases: string[] }> = [
  { state: "Johor", aliases: ["johor"] },
  { state: "Kedah", aliases: ["kedah"] },
  { state: "Kelantan", aliases: ["kelantan"] },
  { state: "Melaka", aliases: ["melaka", "malacca"] },
  { state: "Negeri Sembilan", aliases: ["negeri sembilan", "n9"] },
  { state: "Pahang", aliases: ["pahang"] },
  { state: "Penang", aliases: ["penang", "pulau pinang"] },
  { state: "Perak", aliases: ["perak"] },
  { state: "Perlis", aliases: ["perlis"] },
  { state: "Sabah", aliases: ["sabah"] },
  { state: "Sarawak", aliases: ["sarawak"] },
  { state: "Selangor", aliases: ["selangor"] },
  { state: "Terengganu", aliases: ["terengganu", "trengganu"] },
  { state: "Kuala Lumpur", aliases: ["kuala lumpur", "kl"] },
  { state: "Putrajaya", aliases: ["putrajaya"] },
  { state: "Labuan", aliases: ["labuan"] },
];

const COMMODITY_ALIASES: Array<{ commodity: string; aliases: string[] }> = [
  { commodity: "rice", aliases: ["rice", "beras", "paddy", "padi"] },
  { commodity: "chicken", aliases: ["chicken", "ayam"] },
  { commodity: "eggs", aliases: ["egg", "eggs", "telur"] },
  { commodity: "diesel", aliases: ["diesel", "fuel", "petrol"] },
  { commodity: "cooking oil", aliases: ["cooking oil", "minyak masak"] },
  { commodity: "sugar", aliases: ["sugar", "gula"] },
  { commodity: "onion", aliases: ["onion", "bawang"] },
  { commodity: "chilli", aliases: ["chilli", "chili", "cili"] },
  { commodity: "fertilizer", aliases: ["fertilizer", "fertiliser", "baja"] },
];

const EMPTY_AGENT_ANSWER: AgentAnswer = {
  answer: "",
  highlights: [],
  limitations: [],
  citations: [],
};

function cleanOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function includesTerm(text: string, term: string) {
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(term)}([^a-z0-9]|$)`, "i").test(text);
}

function normalizeState(value: string | undefined): string | undefined {
  const explicit = cleanOptional(value);
  if (!explicit) return undefined;

  return MALAYSIAN_STATE_ALIASES.find(({ state, aliases }) =>
    state.toLowerCase() === explicit.toLowerCase() ||
    aliases.some((alias) => alias.toLowerCase() === explicit.toLowerCase())
  )?.state;
}

function detectStateInText(value: string | undefined): string | undefined {
  const text = cleanOptional(value)?.toLowerCase();
  if (!text) return undefined;

  return MALAYSIAN_STATE_ALIASES.find(({ aliases }) =>
    aliases.some((alias) => includesTerm(text, alias.toLowerCase()))
  )?.state;
}

function detectState(message: string, storedState: string | undefined): string | undefined {
  return detectStateInText(message) ?? normalizeState(storedState);
}

function detectCommodity(message: string, explicit: string | undefined) {
  const cleaned = cleanOptional(explicit);
  if (cleaned) return cleaned;

  const text = message.toLowerCase();
  return (
    COMMODITY_ALIASES.find(({ aliases }) =>
      aliases.some((alias) => includesTerm(text, alias.toLowerCase()))
    )?.commodity ?? "rice"
  );
}

function evidenceTerms(message: string, commodity: string) {
  const terms = new Set<string>([commodity]);
  for (const item of COMMODITY_ALIASES) {
    for (const alias of item.aliases) {
      if (includesTerm(message.toLowerCase(), alias.toLowerCase())) {
        terms.add(item.commodity);
        terms.add(alias);
      }
    }
  }
  return Array.from(terms).slice(0, 8);
}

function shouldRunEvidenceCheck(message: string) {
  return /\b(cause|caused|causal|causality|evidence|supported|unsupported|claim|correlation|correlated|prove|proven)\b/i.test(message) ||
    /\bcan i say\b/i.test(message) ||
    /\breport wording\b/i.test(message);
}

function chooseFlow(input: DashboardAssistantChatInput): FoodMonitorAiFlowName {
  if (shouldRunEvidenceCheck(input.message)) return "evidence-check";
  if (input.dashboard === "farmer") return "farmer-watch";
  return "government-brief";
}

function isQuotaError(error: unknown) {
  if (!isFoodMonitorUpstreamError(error)) return false;
  return /\b(429|RESOURCE_EXHAUSTED|quota|Too Many Requests)\b/i.test(error.message);
}

function formatEvidenceFallback(question: string): AgentAnswer {
  return {
    answer:
      "Do not state that diesel prices caused rice prices to rise unless you have causal evidence. Safer wording is: diesel prices rose around the same period as rice prices, and higher fuel costs may have contributed to rice supply-chain or production cost pressure.",
    highlights: [
      "Use 'associated with', 'coincided with', or 'may have contributed to' instead of 'caused'.",
      "A causal claim needs more than two rising series; it needs timing, controls for other drivers, and a plausible mechanism.",
    ],
    limitations: [
      "FoodMonitor's AI model quota is currently exhausted, so this is a cautious wording fallback rather than a grounded dashboard evidence check.",
      `Original question: ${question}`,
    ],
    citations: [],
    recommendedWording:
      "Diesel prices increased during the same period as rice prices, suggesting fuel costs may have contributed to price pressure, but the dashboard evidence does not by itself prove causation.",
  };
}

function formatFlowError(
  error: unknown,
  flow: FoodMonitorAiFlowName,
  question: string
): AgentAnswer {
  if (isFoodMonitorUpstreamError(error)) {
    if (isQuotaError(error)) {
      if (flow === "evidence-check") {
        return formatEvidenceFallback(question);
      }

      return {
        answer:
          "The assistant reached FoodMonitor, but the upstream Gemini model quota is currently exhausted. Try again after quota resets or switch FoodMonitor to an API key/project with available quota.",
        highlights: [],
        limitations: [
          "FoodMonitor returned a quota or RESOURCE_EXHAUSTED error from its AI model provider.",
        ],
        citations: [],
      };
    }

    if (error.code === "UPSTREAM_MISCONFIGURED") {
      return {
        answer:
          "Assistant configuration is incomplete. FoodMonitor AI flow access needs the server-side shared secret before I can retrieve grounded answers.",
        highlights: [],
        limitations: ["FOODMONITOR_JOB_SHARED_SECRET is missing or unavailable on the backend."],
        citations: [],
      };
    }

    if (error.code === "UPSTREAM_AUTH_ERROR") {
      return {
        answer:
          "The assistant cannot authenticate to the FoodMonitor Cloud Run service yet. Configure Google Application Default Credentials or run the app with a service account that can invoke FoodMonitor.",
        highlights: [],
        limitations: [
          "FOODMONITOR_AUTH_MODE is using Cloud Run ID-token auth, but the backend could not create a valid ID token.",
        ],
        citations: [],
      };
    }

    if (error.status === 401) {
      return {
        answer:
          "The FoodMonitor AI service rejected the assistant request because the internal job secret was not accepted.",
        highlights: [],
        limitations: [
          "FoodMonitor returned HTTP 401 from /internal/ai/flows. The backend is authenticated to Cloud Run, but x-job-secret does not match FoodMonitor's JOB_SHARED_SECRET.",
        ],
        citations: [],
      };
    }

    if (error.status === 403) {
      return {
        answer:
          "The FoodMonitor AI service rejected the assistant request before it reached the internal Genkit flow.",
        highlights: [],
        limitations: [
          "FoodMonitor returned HTTP 403. Check Cloud Run IAM access and FOODMONITOR_AUDIENCE for the backend runtime identity.",
        ],
        citations: [],
      };
    }
  }

  return {
    answer:
      "The dashboard assistant could not reach the FoodMonitor AI service right now. Try again after the data service is available.",
    highlights: [],
    limitations: ["FoodMonitor AI flow call failed before a grounded answer was returned."],
    citations: [],
  };
}

function parseAgentAnswer(value: unknown): AgentAnswer {
  const parsed = FoodMonitorAgentAnswerSchema.safeParse(value);
  if (parsed.success) return parsed.data;

  return {
    answer: "The assistant received an unexpected response shape from FoodMonitor.",
    highlights: [],
    limitations: [`Invalid assistant response: ${parsed.error.message}`],
    citations: [],
  };
}

function extractTextContent(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "type" in item && "text" in item) {
          const maybe = item as { type?: unknown; text?: unknown };
          if (maybe.type === "text" && typeof maybe.text === "string") return maybe.text;
        }
        return "";
      })
      .join("\n")
      .trim();
  }
  return "";
}

async function runLocalRagFallback(params: {
  flow: FoodMonitorAiFlowName;
  question: string;
  state?: string;
  district?: string;
  commodity?: string;
}): Promise<DashboardAssistantChatOutput | null> {
  const query = [
    params.question,
    params.commodity,
    params.state,
    params.district,
    params.flow,
    "Malaysia food prices risk policy farmer",
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (!query) return null;

  const context = await searchVertexAiContext({ query, maxResults: 5 });
  if (!context) return null;

  try {
    const completion = await invokeLLM({
      messages: [
        {
          role: "system",
          content: FACTUAL_NEWS_RAG_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                `Flow: ${params.flow}`,
                `Question: ${params.question}`,
                params.state ? `State: ${params.state}` : "",
                params.district ? `District: ${params.district}` : "",
                params.commodity ? `Commodity: ${params.commodity}` : "",
                `Developer instructions:\n${FACTUAL_NEWS_RAG_DEVELOPER_INSTRUCTIONS}`,
                "Retrieved summary:",
                context.summary,
                "Return concise factual prose only. Separate source claims from observed reported impact, and state when evidence is missing.",
              ]
                .filter(Boolean)
                .join("\n"),
            },
          ],
        },
      ],
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "dashboard_assistant_rag_answer",
          schema: {
            type: "object",
            properties: {
              answer: { type: "string" },
              highlights: {
                type: "array",
                items: { type: "string" },
              },
              limitations: {
                type: "array",
                items: { type: "string" },
              },
              recommendedWording: { type: "string" },
            },
            required: ["answer", "highlights", "limitations"],
          },
        },
      },
      maxTokens: 700,
    });

    const raw = extractTextContent(completion.choices[0]?.message?.content);
    if (!raw) return null;

    const parsedJson = JSON.parse(raw) as unknown;
    const parsedAnswer = LocalRagAnswerSchema.safeParse(parsedJson);
    if (!parsedAnswer.success) return null;

    const citations = context.sources
      .map((source) => `${source.title}: ${source.uri}`)
      .slice(0, 6);

    return DashboardAssistantChatOutputSchema.parse({
      kind: "answer",
      flow: params.flow,
      output: {
        answer: parsedAnswer.data.answer,
        highlights: parsedAnswer.data.highlights,
        limitations: parsedAnswer.data.limitations,
        citations,
        ...(parsedAnswer.data.recommendedWording
          ? { recommendedWording: parsedAnswer.data.recommendedWording }
          : {}),
      },
      generatedAt: new Date().toISOString(),
      dataContext: {
        fallback: "local-rag",
        retrievalSummary: context.summary,
        sources: context.sources,
      },
      ...(params.state ? { state: params.state } : {}),
      ...(params.district ? { district: params.district } : {}),
    });
  } catch {
    return null;
  }
}

async function runFoodMonitorFlow(
  flow: FoodMonitorAiFlowName,
  input: Record<string, unknown>
): Promise<DashboardAssistantChatOutput> {
  const result = await foodMonitorClient.runAiFlow(flow, input);
  return DashboardAssistantChatOutputSchema.parse({
    kind: "answer",
    flow,
    output: parseAgentAnswer(result.output),
    generatedAt: result.generatedAt,
    dataContext: result.dataContext,
  });
}

export async function runDashboardAssistantChat(
  input: DashboardAssistantChatInput
): Promise<DashboardAssistantChatOutput> {
  const flow = chooseFlow(input);
  const state = detectState(input.message, input.state);
  const district = cleanOptional(input.district);
  const pendingQuestion = cleanOptional(input.pendingQuestion);
  const question = pendingQuestion && state ? pendingQuestion : input.message;
  const commodity = detectCommodity(question, input.commodity);

  if (flow === "farmer-watch" && !state) {
    return DashboardAssistantChatOutputSchema.parse({
      kind: "needs_state",
      flow,
      output: {
        ...EMPTY_AGENT_ANSWER,
        answer:
          "Which Malaysian state should I use for the local farmer watch? Tell me the state, and I will check local prices, input cost pressure, and available weather or water signals.",
        limitations: ["Farmer watch needs a state before it can retrieve local dashboard evidence."],
      },
      pendingQuestion: question,
    });
  }

  try {
    if (flow === "government-brief") {
      return await runFoodMonitorFlow(flow, { question });
    }

    if (flow === "farmer-watch") {
      const result = await runFoodMonitorFlow(flow, {
        question,
        state,
        ...(district ? { district } : {}),
      });
      return { ...result, state, ...(district ? { district } : {}) };
    }

    return await runFoodMonitorFlow(flow, {
      question,
      commodity,
      days: 30,
      terms: evidenceTerms(question, commodity),
    });
  } catch (error) {
    console.warn("[DashboardAssistant] FoodMonitor flow failed", {
      flow,
      code: isFoodMonitorUpstreamError(error) ? error.code : undefined,
      status: isFoodMonitorUpstreamError(error) ? error.status : undefined,
      message: error instanceof Error ? error.message : String(error),
    });
    const ragFallback = await runLocalRagFallback({
      flow,
      question,
      state,
      district,
      commodity,
    });

    if (ragFallback) {
      return ragFallback;
    }

    return DashboardAssistantChatOutputSchema.parse({
      kind: "error",
      flow,
      output: formatFlowError(error, flow, question),
      ...(state ? { state } : {}),
      ...(district ? { district } : {}),
    });
  }
}
