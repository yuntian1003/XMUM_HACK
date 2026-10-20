import { formatDateTime, formatScoreMeta, stateBadgeClass } from "@/lib/dashboardStyle";

export type CfsrAnalysisDriver = {
  claim?: string | null;
  citationKey?: string | null;
};

export type CfsrAnalysisResponse = {
  id?: string | null;
  type?: string | null;
  generatedAt?: string | null;
  content?: string | null;
  structuredOutput?: {
    coverageNotice?: string | null;
    currentState?: string | null;
    dataLimitations?: string[] | null;
    outlook?: string | null;
    primaryDrivers?: CfsrAnalysisDriver[] | null;
  } | null;
  promptHash?: string | null;
  dataContext?: Record<string, unknown> | null;
  model?: string | null;
  confidence?: number | null;
  commodity?: string | null;
  _meta?: {
    source?: string | null;
  } | null;
};

type CitationNotebookProps = {
  analysis: CfsrAnalysisResponse | null;
  loading: boolean;
  errorMessage?: string | null;
};

const CITATION_LABELS: Record<string, string> = {
  "dashboardIndices.newsAttention.score": "News attention score",
  "dashboardIndices.inputCostStress.score": "Input cost stress score",
  "dashboardIndices.statePriceDispersion.score": "State price dispersion score",
  "dashboardIndices.retailPriceStress.score": "Retail price stress score",
  "dashboardIndices.globalCommodityStress.score": "Global commodity stress score",
  "cfsr.componentMeta.n1ImportDependency.confidence": "Import dependency confidence",
  "cfsr.componentMeta.n2SupplyChainHealth.confidence": "Supply chain confidence",
  "cfsr.componentMeta.n3FertilizerAvailability.confidence": "Fertilizer availability confidence",
  "cfsr.componentMeta.n4GeopoliticalRisk.confidence": "Geopolitical risk confidence",
  "cfsr.componentMeta.n5PriceVolatility.confidence": "Price volatility confidence",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function getPathValue(root: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (current === undefined || current === null) return undefined;
    if (Array.isArray(current)) {
      const index = Number(segment);
      return Number.isInteger(index) ? current[index] : undefined;
    }
    return isRecord(current) ? current[segment] : undefined;
  }, root);
}

export function getNumberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
}

export function getStringValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

export function getStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" || typeof item === "number" ? String(item) : ""))
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

export function getAnalysisResponse(value: unknown): CfsrAnalysisResponse | null {
  return isRecord(value) ? (value as CfsrAnalysisResponse) : null;
}

function parentPath(path: string) {
  const parts = path.split(".");
  parts.pop();
  return parts.join(".");
}

function humanize(value: string) {
  return value
    .replace(/^n(\d)/i, "N$1 ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function titleForCitation(key: string | null | undefined) {
  if (!key) return "Uncited claim";
  if (CITATION_LABELS[key]) return CITATION_LABELS[key];
  const parts = key.split(".");
  return humanize(parts.at(-2) ?? key);
}

function resolveCitation(dataContext: Record<string, unknown> | null | undefined, citationKey: string | null | undefined) {
  if (!dataContext || !citationKey) return null;

  const direct = getPathValue(dataContext, citationKey);
  if (direct !== undefined) {
    return { value: direct, path: citationKey, parent: parentPath(citationKey) };
  }

  const componentMatch = citationKey.match(/^cfsr\.componentMeta\.([^.]+)\.([^.]+)$/);
  if (componentMatch) {
    const fallbackPath = `componentStatuses.${componentMatch[1]}.${componentMatch[2]}`;
    const fallbackValue = getPathValue(dataContext, fallbackPath);
    if (fallbackValue !== undefined) {
      return { value: fallbackValue, path: fallbackPath, parent: `componentStatuses.${componentMatch[1]}` };
    }
  }

  return { value: undefined, path: citationKey, parent: parentPath(citationKey) };
}

function formatCitationValue(path: string, value: unknown) {
  const numeric = getNumberValue(value);
  if (numeric !== null) {
    const lower = path.toLowerCase();
    if (lower.includes("confidence") || lower.includes("coverage")) return `${(numeric * 100).toFixed(1)}%`;
    if (lower.endsWith(".score") || lower.includes("cfsr")) return `${numeric.toFixed(2)} / 100`;
    return numeric.toFixed(2);
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && value.trim()) return value;
  if (Array.isArray(value)) return `${value.length} entries`;
  if (isRecord(value)) return "Structured object";
  return "Not returned by API";
}

export default function CitationNotebook({ analysis, loading, errorMessage }: CitationNotebookProps) {
  const dataContext = analysis?.dataContext ?? null;
  const drivers = (analysis?.structuredOutput?.primaryDrivers ?? []).filter((driver) => driver.claim || driver.citationKey);
  const limitations = (analysis?.structuredOutput?.dataLimitations ?? []).filter(Boolean);
  const scoreConfidence = getNumberValue(getPathValue(dataContext, "scoreConfidence"));
  const scoreCoverage = getNumberValue(getPathValue(dataContext, "scoreCoverage"));
  const sourcesUsed = getStringList(getPathValue(dataContext, "sourcesUsed"));
  const model = analysis?.model ?? getStringValue(getPathValue(dataContext, "llmModel"));
  const source = analysis?._meta?.source ?? "live response";

  return (
    <section className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Evidence notebook</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">Cited CFSR Analysis</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Each answer line keeps its citation key visible, then opens into the underlying data value, source, quality, and rows.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${stateBadgeClass(source)}`}>{source}</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
            ai.getAnalysis
          </span>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Loading cited CFSR analysis...</div>
      ) : errorMessage ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">CFSR analysis unavailable: {errorMessage}</div>
      ) : !analysis ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">No cited CFSR analysis returned yet.</div>
      ) : (
        <>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Answer</p>
              {analysis.structuredOutput?.currentState && (
                <p className="mt-2 text-base font-semibold leading-7 text-slate-950">{analysis.structuredOutput.currentState}</p>
              )}
              {analysis.structuredOutput?.coverageNotice && (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-950">
                  {analysis.structuredOutput.coverageNotice}
                </p>
              )}
              {analysis.structuredOutput?.outlook && (
                <p className="mt-3 text-sm leading-6 text-slate-700">{analysis.structuredOutput.outlook}</p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Source trail</p>
              <div className="mt-3 grid gap-2 text-xs text-slate-700">
                <SourceRow label="Generated" value={formatDateTime(analysis.generatedAt)} />
                <SourceRow label="Model" value={model ?? "-"} />
                <SourceRow label="Confidence" value={formatScoreMeta(scoreConfidence)} />
                <SourceRow label="Coverage" value={formatScoreMeta(scoreCoverage)} />
                <SourceRow label="Record ID" value={analysis.id ?? "-"} mono />
                <SourceRow label="Prompt Hash" value={analysis.promptHash ?? "-"} mono />
              </div>
              {sourcesUsed.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {sourcesUsed.map((item) => (
                    <span key={item} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {drivers.map((driver, index) => {
              const citation = resolveCitation(dataContext, driver.citationKey);
              const parent = citation ? getPathValue(dataContext, citation.parent) : undefined;
              const parentRecord = isRecord(parent) ? parent : null;
              const status = getStringValue(parentRecord?.status);
              const sourceList = getStringList(parentRecord?.sources ?? parentRecord?.source);
              const confidence = getNumberValue(parentRecord?.confidence);
              const coverage = getNumberValue(parentRecord?.coverage);
              const rows = getNumberValue(parentRecord?.observedRows);
              const notes = getStringList(parentRecord?.notes);

              return (
                <details key={`${driver.citationKey ?? "citation"}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3 open:bg-white">
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-white">[{index + 1}]</span>
                          <span className="text-sm font-bold text-slate-950">{titleForCitation(driver.citationKey)}</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-700">{driver.claim ?? "Claim text was not returned."}</p>
                      </div>
                      {status && <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${stateBadgeClass(status)}`}>{status}</span>}
                    </div>
                  </summary>

                  <div className="mt-3 grid gap-2 border-t border-slate-200 pt-3 sm:grid-cols-2 lg:grid-cols-4">
                    <MiniEvidence label="Value" value={citation ? formatCitationValue(citation.path, citation.value) : "No citation key"} />
                    <MiniEvidence label="Source" value={sourceList.length ? sourceList.join(", ") : "Not specified"} />
                    <MiniEvidence label="Quality" value={confidence !== null ? `Confidence ${formatScoreMeta(confidence)}` : coverage !== null ? `Coverage ${formatScoreMeta(coverage)}` : "Not specified"} />
                    <MiniEvidence label="Rows" value={rows === null ? "Not specified" : rows.toLocaleString()} />
                  </div>
                  <div className="mt-3 grid gap-2 lg:grid-cols-2">
                    <MiniEvidence label="API citation" value={driver.citationKey ?? "No citation key"} mono />
                    <MiniEvidence label="Resolved path" value={citation?.path ?? "-"} mono />
                  </div>
                  {notes.length > 0 && <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950">{notes[0]}</p>}
                </details>
              );
            })}
          </div>

          {limitations.length > 0 && (
            <details className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-amber-900">Data limitations</summary>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-amber-950">
                {limitations.map((item) => <li key={item}>- {item}</li>)}
              </ul>
            </details>
          )}

          <details className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-slate-700">Full API payload</summary>
            <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950 p-3 text-[11px] leading-5 text-slate-100">
              {JSON.stringify(analysis, null, 2)}
            </pre>
          </details>
        </>
      )}
    </section>
  );
}

function SourceRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className={`max-w-[16rem] break-all text-right font-semibold text-slate-900 ${mono ? "font-mono text-[11px]" : ""}`}>{value}</span>
    </div>
  );
}

function MiniEvidence({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 break-words text-xs font-semibold text-slate-900 ${mono ? "font-mono text-[11px]" : ""}`}>{value}</p>
    </div>
  );
}
