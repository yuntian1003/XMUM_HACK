import CfsrHistoryChart from "@/components/CfsrHistoryChart";
import { formatScoreMeta, normalizeRiskBand, riskBadgeClass, stateBadgeClass, type RiskBand } from "@/lib/dashboardStyle";

export type CfsrChartPoint = {
  date: string;
  cfsr: number;
  riskBand: RiskBand;
  confidence?: number | null;
  coverage?: number | null;
};

export type CfsrComponentStatus = {
  key: string;
  short: string;
  label: string;
  color: string;
  confidence: number | null;
  coverage: number | null;
  observedRows: number | null;
  status: string | null;
  sources: string[];
  notes: string[];
};

type CfsrDecisionRecordProps = {
  loading: boolean;
  currentScore: number | null;
  currentBand: string | null | undefined;
  sourceLabel: string;
  scoreAtGeneration: number | null;
  confidence: number | null;
  coverage: number | null;
  chartData: CfsrChartPoint[];
  trendDelta: number | null;
  componentRows: CfsrComponentStatus[];
};

export default function CfsrDecisionRecord({
  loading,
  currentScore,
  currentBand,
  sourceLabel,
  scoreAtGeneration,
  confidence,
  coverage,
  chartData,
  trendDelta,
  componentRows,
}: CfsrDecisionRecordProps) {
  const displayScore = currentScore ?? scoreAtGeneration;
  const band = currentBand ? normalizeRiskBand(currentBand) : null;

  return (
    <section className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Primary policy metric</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">CFSR Decision Record</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            National food risk over time, with the N1-N5 breakdown beside the chart for immediate interpretation.
          </p>
        </div>
        <div className="grid min-w-[260px] grid-cols-3 gap-2 text-right">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">CFSR</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{displayScore === null ? "-" : displayScore.toFixed(0)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Band</p>
            {band ? (
              <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${riskBadgeClass(band)}`}>
                {band}
              </span>
            ) : (
              <p className="mt-1 text-sm font-bold text-slate-500">-</p>
            )}
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">30 days</p>
            <p className={`mt-1 text-lg font-black ${trendDelta === null ? "text-slate-500" : trendDelta >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {trendDelta === null ? "-" : `${trendDelta >= 0 ? "+" : ""}${trendDelta.toFixed(1)}`}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.45fr_0.85fr]">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">CFSR line chart</p>
              <p className="mt-1 text-xs text-slate-500">Green is low risk, amber is moderate, red is high risk.</p>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
              Source: {sourceLabel}
            </span>
          </div>
          {loading ? (
            <div className="mt-3 flex h-[360px] items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500">
              Loading real CFSR history...
            </div>
          ) : chartData.length > 0 ? (
            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
              <CfsrHistoryChart data={chartData} height={360} />
            </div>
          ) : (
            <div className="mt-3 flex h-[360px] items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500">
              No real CFSR history found.
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">N1-N5 breakdown</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Component confidence, row coverage, and source status.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
              coverage {formatScoreMeta(coverage)}
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {componentRows.map((row) => (
              <details key={row.key} className="group rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 open:bg-white">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${row.color}`} />
                    <span className="text-xs font-bold text-slate-900">{row.short} {row.label}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {row.status && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${stateBadgeClass(row.status)}`}>
                        {row.status}
                      </span>
                    )}
                    <span className="text-[11px] font-semibold text-slate-600">{formatScoreMeta(row.confidence)}</span>
                  </div>
                </summary>
                <div className="mt-2 grid gap-2 border-t border-slate-200 pt-2 text-[11px] text-slate-600">
                  <div className="flex justify-between gap-3">
                    <span className="font-semibold text-slate-500">Observed rows</span>
                    <span className="font-semibold text-slate-900">{row.observedRows === null ? "-" : row.observedRows.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="font-semibold text-slate-500">Sources</span>
                    <span className="text-right font-semibold text-slate-900">{row.sources.length ? row.sources.join(", ") : "-"}</span>
                  </div>
                  {row.notes[0] && <p className="leading-5 text-slate-600">{row.notes[0]}</p>}
                </div>
              </details>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
            <span>Confidence {formatScoreMeta(confidence)}</span>
            <span className="text-right">Coverage {formatScoreMeta(coverage)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
