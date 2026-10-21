import { useCallback, useEffect, useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import {
  ArrowLeft,
  Share2,
  FileDown,
  CheckCircle2,
  AlertTriangle,
  Leaf,
  MapPin,
  Calendar,
  Repeat,
  Zap,
  Shield,
  TrendingUp,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getScan, type LocalScan } from "@/lib/db";
import { DISEASE_INFO } from "@/lib/detector";
import { PLANT_TYPES } from "@/lib/aseanCropDiseases";
import { cn } from "@/lib/utils";
import { generatePDF } from "@/lib/pdf";
import { toast } from "sonner";
import ScannerFamilyNav from "@/components/ScannerFamilyNav";

const SEVERITY_CONFIG = {
  healthy: {
    label: "Healthy",
    icon: CheckCircle2,
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
    badge: "bg-green-100 text-green-700",
  },
  mild: {
    label: "Mild",
    icon: AlertCircle,
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    badge: "bg-yellow-100 text-yellow-700",
  },
  moderate: {
    label: "Moderate",
    icon: AlertTriangle,
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
    badge: "bg-orange-100 text-orange-700",
  },
  severe: {
    label: "Severe",
    icon: AlertTriangle,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    badge: "bg-red-100 text-red-700",
  },
};

const URGENCY_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: string }
> = {
  monitor: {
    label: "Monitor",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    icon: "👁️",
  },
  treat_soon: {
    label: "Treat Soon",
    color: "text-orange-700",
    bg: "bg-orange-50 border-orange-200",
    icon: "⚠️",
  },
  treat_immediately: {
    label: "Treat Immediately",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    icon: "🚨",
  },
};

const SPREAD_RISK_STYLE: Record<string, string> = {
  low: "text-green-700 bg-green-100",
  medium: "text-orange-700 bg-orange-100",
  high: "text-red-700 bg-red-100",
};

function findDiseaseInfoByKey(diseaseKey: string | null | undefined) {
  if (!diseaseKey) return null;
  for (const plant of Object.values(PLANT_TYPES)) {
    const match = plant.diseases[diseaseKey];
    if (match) return match;
  }
  return null;
}

function ConfidenceRing({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 75 ? "#16a34a" : pct >= 50 ? "#d97706" : "#dc2626";
  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg width="96" height="96" className="-rotate-90">
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="8"
        />
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-foreground">{pct}%</span>
        <span className="text-[10px] text-muted-foreground">confidence</span>
      </div>
    </div>
  );
}

export default function Result() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [scan, setScan] = useState<LocalScan | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshScan = useCallback(async () => {
    if (!id) return null;
    const current = await getScan(id);
    setScan(current ?? null);
    setLoading(false);
    return current ?? null;
  }, [id]);

  useEffect(() => {
    void refreshScan();
  }, [refreshScan]);

  useEffect(() => {
    if (!id || !scan?.aiPending || scan.llmAnalysis) return;

    let cancelled = false;
    const interval = window.setInterval(async () => {
      if (cancelled) return;
      const latest = await getScan(id);
      if (cancelled) return;
      setScan(latest ?? null);
      if (latest && (!latest.aiPending || latest.llmAnalysis)) {
        window.clearInterval(interval);
      }
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [id, scan?.aiPending, scan?.llmAnalysis]);

  const handleExportPDF = async () => {
    if (!scan) return;
    try {
      await generatePDF(scan);
      toast.success("PDF report downloaded!");
    } catch {
      toast.error("Failed to generate PDF.");
    }
  };

  const handleShare = async () => {
    if (!scan) return;
    const plantType = scan.plantType || "Plant";
    const text = `🌾 Crop Scanner Diagnosis\nPlant: ${plantType}\nDisease: ${scan.diseaseName}\nSeverity: ${scan.severity}\nConfidence: ${Math.round((scan.confidence ?? 0) * 100)}%\nDate: ${new Date(scan.scannedAt).toLocaleDateString()}`;
    if (navigator.share) {
      await navigator.share({ title: `${plantType} Crop Scanner Result`, text });
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Result copied to clipboard!");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="container py-8 text-center max-w-lg mx-auto">
        <p className="text-muted-foreground mb-4">Crop Scanner result not found.</p>
        <Link href="/scan">
          <Button>New Capture</Button>
        </Link>
      </div>
    );
  }

  const severity = scan.severity ?? "mild";
  const sev = SEVERITY_CONFIG[severity];
  const SevIcon = sev.icon;
  const diseaseInfo =
    DISEASE_INFO[scan.diseaseKey ?? "healthy"] ??
    findDiseaseInfoByKey(scan.diseaseKey);
  const llm = scan.llmAnalysis;
  const urgency = llm?.urgency ? URGENCY_CONFIG[llm.urgency] : null;

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900 pb-16">
      {/* ── Top Header Strip ── */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/history")}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors"
                title="Back to history"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-100 text-emerald-800">
                    <Leaf className="h-3 w-3" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                    AgriGuard Diagnosis Report
                  </span>
                </div>
                <h1 className="text-xl md:text-2xl font-black text-slate-900 mt-0.5">
                  Crop Health Analysis
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 h-9 text-xs font-semibold"
              >
                <Share2 className="mr-1.5 h-3.5 w-3.5" /> Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 h-9 text-xs font-semibold"
              >
                <FileDown className="mr-1.5 h-3.5 w-3.5" /> Export PDF
              </Button>
              <Link href="/scan">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9">
                  <Repeat className="mr-1.5 h-3.5 w-3.5" /> New Scan
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100">
            <ScannerFamilyNav active="result" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        {/* ── Diagnosis Hero Card ── */}
        <div className={cn("rounded-3xl border bg-white p-6 shadow-sm", sev.border)}>
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              {scan.imageDataUrl ? (
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl shadow-sm border border-slate-200">
                  <img
                    src={scan.imageDataUrl}
                    alt="Scanned crop leaf"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <Leaf className="h-8 w-8" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <Badge className={cn("border-0 text-xs font-bold px-2.5 py-0.5", sev.badge)}>
                    <SevIcon className="mr-1.5 h-3.5 w-3.5" />
                    {sev.label}
                  </Badge>
                  {llm && (
                    <Badge
                      variant="outline"
                      className="border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-800"
                    >
                      <Zap className="mr-1 h-3 w-3 text-emerald-600" /> Cloud AI Enhanced
                    </Badge>
                  )}
                  <span className="text-xs font-semibold text-slate-400">
                    {scan.synced ? "✓ Synced" : "⏳ Offline cache"}
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">
                  {scan.diseaseName ?? "Unknown Condition"}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  {scan.fieldId && (
                    <span className="font-semibold text-slate-700">Field: {scan.fieldId}</span>
                  )}
                  {scan.latitude && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      {scan.latitude.toFixed(4)}, {scan.longitude?.toFixed(4)}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    {new Date(scan.scannedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex md:flex-col items-center justify-between md:justify-center border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
              <ConfidenceRing confidence={scan.confidence ?? 0} />
            </div>
          </div>

          {urgency && (
            <div
              className={cn(
                "mt-5 flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-xs md:text-sm font-semibold",
                urgency.bg,
                urgency.color
              )}
            >
              <span className="text-base">{urgency.icon}</span>
              <span>Action Protocol: {urgency.label}</span>
            </div>
          )}
        </div>

        {/* AI status banner */}
        {llm?.confidenceAdjustment && (
          <Card className="border border-emerald-200 bg-emerald-50/70 shadow-sm">
            <CardContent className="p-3.5 flex items-start gap-2.5">
              <Zap className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-emerald-950">
                {llm.confidenceAdjustment}
              </p>
            </CardContent>
          </Card>
        )}

        {scan.aiPending && !llm && (
          <Card className="border border-amber-200 bg-amber-50 shadow-sm">
            <CardContent className="p-3.5 flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900">
                Cloud AI is refining this report. The view will auto-refresh once neural LLM validation finishes.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── 2-Column Report Arrangement ── */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] items-start">
          {/* Left Column: Diagnostics & Treatment Details */}
          <div className="space-y-5">
            {/* Observed Symptoms */}
            {(llm?.symptoms ?? diseaseInfo?.symptoms) && (
              <Card className="border border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-3 pt-5 px-5 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-emerald-600" /> Observed Leaf Symptoms
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-2.5">
                  {(llm?.symptoms ?? diseaseInfo?.symptoms ?? []).map(
                    (s: string, i: number) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs md:text-sm text-slate-700">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-2 shrink-0" />
                        <span>{s}</span>
                      </div>
                    )
                  )}
                </CardContent>
              </Card>
            )}

            {/* Treatment Plan */}
            {llm?.treatmentPlan ? (
              <Card className="border border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-3 pt-5 px-5 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-600" /> Multi-Tier Treatment Protocol
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  {[
                    {
                      label: "Chemical Control",
                      value: llm.treatmentPlan.chemical,
                      style: "text-red-800 bg-red-50 border-red-200",
                    },
                    {
                      label: "Biological & Organic",
                      value: llm.treatmentPlan.biological,
                      style: "text-emerald-800 bg-emerald-50 border-emerald-200",
                    },
                    {
                      label: "Cultural & Agronomic",
                      value: llm.treatmentPlan.cultural,
                      style: "text-blue-800 bg-blue-50 border-blue-200",
                    },
                  ].map(({ label, value, style }) => (
                    <div key={label} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
                      <span className={cn("inline-block text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border mb-1.5", style)}>
                        {label}
                      </span>
                      <p className="text-xs md:text-sm text-slate-700 leading-relaxed">{value}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              severity !== "healthy" &&
              diseaseInfo?.treatments && (
                <Card className="border border-slate-200 bg-white shadow-sm">
                  <CardHeader className="pb-3 pt-5 px-5 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-600" /> Treatment Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-2.5">
                    {diseaseInfo.treatments.map((t: string, i: number) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs md:text-sm text-slate-700">
                        <div className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </div>
                        <span className="mt-0.5">{t}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )
            )}

            {/* Disease Description */}
            {!llm && diseaseInfo?.description && (
              <Card className="border border-slate-200 bg-white shadow-sm">
                <CardContent className="p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Pathogen Background
                  </p>
                  <p className="text-xs md:text-sm text-slate-700 leading-relaxed">
                    {diseaseInfo.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Additional Notes */}
            {llm?.additionalNotes && (
              <Card className="border border-slate-200 bg-white shadow-sm">
                <CardContent className="p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Agronomist Field Notes
                  </p>
                  <p className="text-xs md:text-sm text-slate-700 leading-relaxed">{llm.additionalNotes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Immediate Actions, Risk Metrics & Prevention */}
          <div className="space-y-5">
            {/* Impact & Spread Risk */}
            {llm && (
              <div className="grid grid-cols-2 gap-3">
                <Card className="border border-slate-200 bg-white shadow-sm p-4">
                  <div className="flex items-center gap-1.5 mb-1 text-slate-400">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      Yield Impact
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-900">
                    {llm.yieldImpact}
                  </p>
                </Card>
                <Card className="border border-slate-200 bg-white shadow-sm p-4">
                  <div className="flex items-center gap-1.5 mb-1 text-slate-400">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      Spread Risk
                    </span>
                  </div>
                  <span
                    className={cn(
                      "inline-block text-xs font-bold px-2 py-0.5 rounded capitalize",
                      SPREAD_RISK_STYLE[llm.spreadRisk] ?? "text-slate-800 bg-slate-100"
                    )}
                  >
                    {llm.spreadRisk}
                  </span>
                </Card>
              </div>
            )}

            {/* Immediate Actions */}
            {llm?.immediateActions && llm.immediateActions.length > 0 && (
              <Card className="border border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-3 pt-5 px-5 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" /> Immediate Steps (24–48h)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-2.5">
                  {llm.immediateActions.map((a, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-slate-700">
                      <div className="w-5 h-5 rounded-md bg-amber-50 text-amber-800 flex items-center justify-center text-xs font-bold shrink-0">
                        {i + 1}
                      </div>
                      <span className="mt-0.5">{a}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Prevention */}
            {(llm?.preventionTips ?? diseaseInfo?.prevention) && (
              <Card className="border border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-3 pt-5 px-5 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-600" /> Prevention & Best Practice
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-2.5">
                  {(llm?.preventionTips ?? diseaseInfo?.prevention ?? []).map(
                    (tip: string, i: number) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{tip}</span>
                      </div>
                    )
                  )}
                </CardContent>
              </Card>
            )}

            {/* Action Bar */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-2.5">
              <Button variant="outline" className="w-full h-11 text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50" onClick={handleExportPDF}>
                <FileDown className="w-4 h-4 mr-2 text-slate-600" /> Download PDF Field Dossier
              </Button>
              <Link href="/scan" className="block">
                <Button className="w-full h-11 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white">
                  <Repeat className="w-4 h-4 mr-2" /> Start Another Diagnosis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
