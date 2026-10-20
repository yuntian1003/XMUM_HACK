import { type ReactNode } from "react";
import {
  AlertTriangle,
  Brain,
  Clock3,
  LifeBuoy,
  Sparkles,
} from "lucide-react";
import { Streamdown } from "streamdown";
import { toRelativeTime } from "@/lib/dashboardStyle";

type AnalysisRecord = {
  content?: string | null;
  structuredOutput?: unknown;
  generatedAt?: string | null;
  dataContext?: unknown;
  promptHash?: string | null;
};

type StructuredAiPanelProps = {
  title: string;
  analysis?: AnalysisRecord;
  content: string;
  loading: boolean;
  emptyLabel: string;
  lead?: string | null;
  detailsPanel?: ReactNode;
};

type ActionPriority = "HIGH" | "MEDIUM" | "LOW";

type ActionBrief = {
  sentence: string;
  priority: string;
  timeline: string;
  support: string;
  expectedEffect: string;
  citation?: string | null;
};

type InsightMetric = {
  label: string;
  value: string;
};

export default function StructuredAiPanel({
  title,
  analysis,
  content,
  loading,
  emptyLabel,
  lead,
  detailsPanel,
}: StructuredAiPanelProps) {
  const brief = buildInsightBrief(analysis, content, lead);

  return (
    <article className="rounded-[28px] border border-slate-200 bg-white/90 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-[#F8FAF9] px-3 py-1 text-xs font-semibold text-slate-600">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            AI Briefing
          </div>
          <h2 className="mt-4 text-[1.65rem] font-semibold tracking-tight text-slate-950">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {analysis?.generatedAt ? `Generated ${toRelativeTime(analysis.generatedAt)}` : "Waiting for the latest generated briefing."}
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          <Brain className="h-3.5 w-3.5" />
          Live dashboard analysis
        </span>
      </div>

      {loading ? (
        <div className="mt-5 rounded-[24px] border border-slate-200 bg-[#F8FAF9] p-5 text-sm text-slate-600">Loading analysis...</div>
      ) : brief.hasContent ? (
        <>
          <div className="mt-5 rounded-[24px] border border-slate-200 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(248,250,249,0.92)_62%)] p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                <Brain className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">Structured briefing</p>
                <p className="mt-2 text-2xl font-semibold leading-tight text-slate-950">{brief.headline}</p>
                <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">{brief.summary}</p>
              </div>
            </div>

            {brief.metrics.length > 0 && (
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {brief.metrics.map((metric) => (
                  <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">{metric.label}</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-950">{metric.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {brief.actions.length > 0 && (
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {brief.actions.map((action, index) => (
                <ActionCard key={`${action.sentence}-${index}`} action={action} />
              ))}
            </div>
          )}

          {content && (
            <div className="mt-5 rounded-[24px] border border-slate-200 bg-[#F8FAF9]/85 p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">Full narrative</p>
              <div className="prose prose-sm mt-4 max-w-none text-slate-700 prose-headings:text-slate-950 prose-p:leading-7 prose-li:leading-7 prose-strong:text-slate-950 prose-a:text-emerald-700">
                <Streamdown>{content}</Streamdown>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="mt-5 rounded-[24px] border border-slate-200 bg-[#F8FAF9] p-5 text-sm text-slate-600">{emptyLabel}</div>
      )}

      {detailsPanel}
    </article>
  );
}

function ActionCard({ action }: { action: ActionBrief }) {
  const tone = priorityTone(action.priority);

  return (
    <section className={`rounded-[24px] border p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] ${tone.container}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] ${tone.priorityPill}`}>
          Priority: {action.priority}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          <Clock3 className="h-3.5 w-3.5" />
          Timeline: {action.timeline}
        </span>
      </div>

      <div className="mt-4 rounded-2xl border border-white/70 bg-white/85 p-4 shadow-[0_8px_20px_rgba(15,23,42,0.03)]">
        <p className="text-sm leading-7 text-slate-700">
          {action.sentence}{" "}
          {action.citation && (
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
              {action.citation}
            </span>
          )}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MetaCard
          title="Support"
          value={action.support}
          icon={<LifeBuoy className="h-4 w-4 text-slate-500" />}
        />
        <MetaCard
          title="Expected dashboard effect"
          value={action.expectedEffect}
          icon={<Brain className="h-4 w-4 text-slate-500" />}
        />
      </div>
    </section>
  );
}

function buildInsightBrief(analysis: AnalysisRecord | undefined, content: string, lead?: string | null) {
  const structured = asRecord(analysis?.structuredOutput);
  const dataContext = asRecord(analysis?.dataContext);
  const currentState = compactState(getString(structured?.currentState));
  const coverageNotice = compactText(getString(structured?.coverageNotice));
  const summary = compactText(
    firstString(
      getString(structured?.summary),
      getString(structured?.executiveSummary),
      getString(structured?.overview),
      getString(structured?.recommendationSummary),
      getString(structured?.gapSummary),
      getString(structured?.brief)
    )
  );
  const outlook = compactText(getString(structured?.outlook));

  const headline = firstNonDuplicate(
    [],
    compactText(lead ?? null),
    currentState,
    summary,
    firstSentence(content),
    "Generated from the latest dashboard data."
  );
  const summaryText = firstNonDuplicate(
    [headline],
    summary,
    outlook,
    coverageNotice,
    firstParagraph(content),
    compactText(lead ?? null),
    "Read the full narrative below for detail."
  );
  const metrics = buildMetrics(structured, dataContext, currentState);
  const actions = buildActions(structured, dataContext, content);

  return {
    headline,
    summary: summaryText,
    metrics,
    actions,
    hasContent: Boolean(content || actions.length || headline || summaryText),
  };
}

function buildMetrics(
  structured: Record<string, unknown> | null,
  dataContext: Record<string, unknown> | null,
  currentState: string | null
) {
  const coverage = getNumber(dataContext?.scoreCoverage) ?? getNumber(dataContext?.scoreConfidence);
  const articleCount = getNumber(dataContext?.articleCount);
  const sourceCount = getStringList(dataContext?.sourcesUsed).length;
  const driverCount = normalizeItems(firstValueForKeys(structured, ["primaryDrivers", "drivers", "keyDrivers"])).length;
  const limitationCount = normalizeItems(firstValueForKeys(structured, ["dataLimitations", "limitations", "gaps", "constraints"])).length;

  return [
    currentState ? { label: "State", value: currentState } : null,
    coverage !== null ? { label: "Coverage", value: formatRatioPercent(coverage) } : null,
    driverCount > 0 ? { label: "Drivers", value: `${driverCount} highlighted` } : null,
    limitationCount > 0 ? { label: "Limits", value: `${limitationCount} flagged` } : null,
    articleCount !== null ? { label: "Evidence", value: `${articleCount} article${articleCount === 1 ? "" : "s"}` } : null,
    !articleCount && sourceCount > 0 ? { label: "Sources", value: `${sourceCount} live feed${sourceCount === 1 ? "" : "s"}` } : null,
  ].filter((item): item is InsightMetric => Boolean(item)).slice(0, 4);
}

function buildActions(structured: Record<string, unknown> | null, dataContext: Record<string, unknown> | null, content: string) {
  const actions: ActionBrief[] = [];

  const pushAction = (sentence: string | null, extras?: Partial<ActionBrief>) => {
    if (!sentence) return;
    actions.push({
      sentence,
      priority: extras?.priority ?? inferPriority(sentence),
      timeline: extras?.timeline ?? inferTimeline(sentence),
      support: extras?.support ?? "the latest dashboard data",
      expectedEffect: extras?.expectedEffect ?? inferExpectedEffect(sentence),
      citation: extras?.citation ?? null,
    });
  };

  const drivers = asArray(firstValueForKeys(structured, ["primaryDrivers", "drivers", "keyDrivers"]));
  for (const driver of drivers) {
    const record = asRecord(driver);
    pushAction(
      record ? toActiveSentence(getString(record.claim)) : toActiveSentence(getString(driver)),
      {
        citation: compactCitation(record ? getString(record.citationKey) : null),
        priority: record ? getString(record.priority) ?? undefined : undefined,
        timeline: record ? getString(record.timeline) ?? undefined : undefined,
        support: record ? getString(record.support) ?? undefined : undefined,
        expectedEffect: record ? getString(record.expectedDashboardEffect) ?? undefined : undefined,
      }
    );
  }

  const recommendations = asArray(firstValueForKeys(structured, ["recommendations", "actions", "nextSteps", "recommendedActions", "advisories"]));
  for (const recommendation of recommendations) {
    const record = asRecord(recommendation);
    pushAction(
      record
        ? toActiveSentence(
            firstString(
              getString(record.claim),
              getString(record.action),
              getString(record.recommendation),
              getString(record.title),
              getString(record.summary)
            )
          )
        : toActiveSentence(getString(recommendation)),
      {
        citation: compactCitation(record ? getString(record.citationKey) : null),
        priority: record ? getString(record.priority) ?? undefined : undefined,
        timeline: record ? getString(record.timeline) ?? undefined : undefined,
        support: record ? getString(record.support) ?? undefined : undefined,
        expectedEffect: record
          ? getString(record.expectedDashboardEffect) ?? getString(record.expectedEffect) ?? undefined
          : undefined,
      }
    );
  }

  const limitations = asArray(firstValueForKeys(structured, ["dataLimitations", "limitations", "gaps", "constraints"]));
  for (const limitation of limitations) {
    pushAction(toActiveSentence(getString(limitation)), {
      priority: "HIGH",
      timeline: "immediate",
      support: "the latest dashboard data",
      expectedEffect: "Improves coverage and reduces blind spots in the dashboard.",
    });
  }

  if (actions.length === 0) {
    extractParagraphs(content).slice(0, 4).forEach((paragraph) => {
      const parsed = parseStructuredParagraph(paragraph);
      if (parsed) {
        actions.push(parsed);
      } else {
        pushAction(toActiveSentence(paragraph));
      }
    });
  }

  if (actions.length === 0) {
    const sourcesUsed = getStringList(dataContext?.sourcesUsed);
    pushAction("Use the latest dashboard signals to review current food-security pressure and plan the next action.", {
      support: sourcesUsed.length > 0 ? sourcesUsed.join(", ") : "the latest dashboard data",
      expectedEffect: "Keeps the dashboard aligned with the latest risk signals.",
    });
  }

  return dedupeActions(actions).slice(0, 6);
}

function normalizeItems(value: unknown) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value === null || value === undefined) return [];
  return [value];
}

function firstValueForKeys(root: Record<string, unknown> | null, keys: string[]) {
  if (!root) return null;
  for (const key of keys) {
    if (key in root) return root[key];
  }
  return null;
}

function firstString(...values: Array<string | null | undefined>) {
  return values.find((value) => value && value.trim()) ?? null;
}

function firstNonDuplicate(existing: string[], ...values: Array<string | null | undefined>) {
  for (const value of values) {
    const text = compactText(value ?? null);
    if (!text) continue;
    if (!existing.some((entry) => isDuplicateText(entry, text))) return text;
  }
  return "";
}

function compactState(value: string | null) {
  if (!value) return null;
  return compactText(
    value
      .replace(/^current state:\s*/i, "")
      .replace(/^the current overall food security risk is assessed as\s*/i, "")
      .replace(/\.$/, "")
  );
}

function firstParagraph(value: string) {
  return compactText(value.split(/\n\s*\n/)[0] ?? "");
}

function firstSentence(value: string) {
  const sentence = value.match(/(.+?[.!?])(\s|$)/)?.[1] ?? value.split("\n")[0] ?? "";
  return compactText(sentence);
}

function compactText(value: string | null | undefined) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text || null;
}

function isDuplicateText(value: string, ...candidates: Array<string | null | undefined>) {
  const normalized = normalizeText(value);
  return candidates.some((candidate) => normalizeText(candidate) === normalized);
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function humanizeKey(value: string) {
  return value
    .replace(/\./g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseStructuredParagraph(value: string): ActionBrief | null {
  const cleaned = compactText(value);
  if (!cleaned) return null;

  const priority = captureField(cleaned, "Priority");
  const timeline = captureField(cleaned, "Timeline");
  const support = captureField(cleaned, "Support");
  const expectedEffect = captureField(cleaned, "Expected dashboard effect");

  if (!priority && !timeline && !support && !expectedEffect) return null;

  const sentence = toActiveSentence(
    cleaned
      .replace(/Priority:\s*[^|.]+/i, "")
      .replace(/Timeline:\s*[^|.]+/i, "")
      .replace(/Support:\s*.*?(?=Expected dashboard effect:|$)/i, "")
      .replace(/Expected dashboard effect:\s*.*$/i, "")
      .replace(/\|\s*/g, " ")
  );

  return {
    sentence: sentence ?? cleaned,
    priority: priority ?? "MEDIUM",
    timeline: timeline ?? "next cycle",
    support: support ?? "the latest dashboard data",
    expectedEffect: expectedEffect ?? inferExpectedEffect(sentence ?? cleaned),
    citation: support && support.toLowerCase().includes("dashboard data") ? "the latest dashboard data" : null,
  };
}

function captureField(value: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = value.match(new RegExp(`${escaped}:\\s*(.*?)(?=\\s+(?:Priority|Timeline|Support|Expected dashboard effect):|$)`, "i"));
  return compactText(match?.[1] ?? null);
}

function toActiveSentence(value: string | null) {
  const text = compactText(value);
  if (!text) return null;
  const trimmed = text.replace(/^[\-\d.]+\s*/, "").replace(/\.$/, "");
  if (/^(the|this)\s+/i.test(trimmed)) return `${trimmed}.`;
  if (/^(address|improve|review|monitor|prioritise|prioritize|stabilise|stabilize|reduce|prepare|strengthen|track|watch)\b/i.test(trimmed)) {
    return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}.`;
  }
  return `Address ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}.`;
}

function inferPriority(value: string) {
  const lower = value.toLowerCase();
  if (/(critical|alarm|high|immediate|missing|gap|low coverage|shortage)/.test(lower)) return "HIGH";
  if (/(moderate|watch|elevated|monitor|review)/.test(lower)) return "MEDIUM";
  return "LOW";
}

function inferTimeline(value: string) {
  const lower = value.toLowerCase();
  if (/(immediate|today|urgent|critical|alarm)/.test(lower)) return "immediate";
  if (/(weekly|near term|soon|monitor|review)/.test(lower)) return "this week";
  return "next cycle";
}

function inferExpectedEffect(value: string) {
  const lower = value.toLowerCase();
  if (/(coverage|missing|gap)/.test(lower)) return "Improves coverage and strengthens dashboard confidence.";
  if (/(price|cost|volatility|dispersion)/.test(lower)) return "Sharpens visibility on price pressure across the dashboard.";
  if (/(news|media|attention|alert)/.test(lower)) return "Makes policy alerts easier to spot and act on quickly.";
  return "Keeps the dashboard easier to interpret and act on.";
}

function compactCitation(value: string | null) {
  const text = compactText(value);
  if (!text) return null;
  return text.startsWith("the latest dashboard data") ? text : humanizeKey(text);
}

function priorityTone(priority: string) {
  const normalized = priority.toUpperCase() as ActionPriority;
  if (normalized === "HIGH") {
    return {
      container: "border-amber-200 bg-[linear-gradient(180deg,rgba(255,251,235,0.96),rgba(255,255,255,0.96))]",
      priorityPill: "border border-amber-200 bg-amber-100 text-amber-800",
    };
  }
  if (normalized === "LOW") {
    return {
      container: "border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.96))]",
      priorityPill: "border border-slate-200 bg-slate-100 text-slate-700",
    };
  }
  return {
    container: "border-emerald-200 bg-[linear-gradient(180deg,rgba(236,253,245,0.96),rgba(255,255,255,0.96))]",
    priorityPill: "border border-emerald-200 bg-emerald-100 text-emerald-700",
  };
}

function MetaCard({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-[0_8px_20px_rgba(15,23,42,0.03)]">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
        {icon}
        <span>{title}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
}

function extractParagraphs(value: string) {
  return value
    .split(/\n\s*\n|\n(?=[A-Z][^:\n]{2,}:)/)
    .map((item) => compactText(item))
    .filter((item): item is string => Boolean(item));
}

function dedupeActions(actions: ActionBrief[]) {
  const seen = new Set<string>();
  return actions.filter((action) => {
    const key = normalizeText(action.sentence);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function formatRatioPercent(value: number) {
  const percent = Math.abs(value) <= 1 ? value * 100 : value;
  return `${percent.toFixed(0)}%`;
}

function getString(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function getStringList(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" || typeof item === "number" ? String(item) : ""))
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function getNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}
