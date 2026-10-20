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
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden bg-gradient-to-br from-[#163a24] via-[#1a4731] to-[#2d7a4f] px-4 pt-6 pb-8 text-white">
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "url('/images/hero-bg.png')", backgroundSize: "cover", backgroundPosition: "center" }}
        />
        <div className="absolute inset-0 bg-[#163a24]/55" />
        <div className="relative mx-auto max-w-5xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.25em] text-emerald-50">
                <Leaf className="h-3.5 w-3.5" />
                Crop Scanner
              </span>
              <h1 className="mt-4 text-3xl font-bold leading-tight md:text-4xl">
                Diagnosis Result
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-emerald-50/85 md:text-base">
                Review the diagnosis, act on the treatment guidance, and keep the report inside the same scanner workflow as capture and history.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate("/history")}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/15"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <button
                onClick={handleShare}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/15"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-4">
            <ScannerFamilyNav active="result" />
          </div>

          <div className={cn("mt-6 rounded-[28px] border bg-white/92 p-5 text-slate-900 backdrop-blur", sev.border)}>
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-4">
                {scan.imageDataUrl && (
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl shadow-md">
                    <img
                      src={scan.imageDataUrl}
                      alt="Scanned leaf"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge className={cn("border-0 text-xs font-semibold", sev.badge)}>
                      <SevIcon className="mr-1 h-3 w-3" />
                      {sev.label}
                    </Badge>
                    {llm && (
                      <Badge
                        variant="outline"
                        className="border-primary/30 bg-primary/5 text-xs text-primary"
                      >
                        <Zap className="mr-1 h-3 w-3" /> AI Enhanced
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold leading-tight text-slate-950">
                    {scan.diseaseName ?? "Unknown"}
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    {scan.latitude && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {scan.latitude.toFixed(4)}, {scan.longitude?.toFixed(4)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(scan.scannedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <ConfidenceRing confidence={scan.confidence ?? 0} />
            </div>

            {urgency && (
              <div
                className={cn(
                  "mt-5 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium",
                  urgency.bg,
                  urgency.color
                )}
              >
                <span>{urgency.icon}</span>
                <span>Action Required: {urgency.label}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 space-y-4">
        {/* AI confidence note */}
        {llm?.confidenceAdjustment && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-3 flex items-start gap-2">
              <Zap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-foreground">
                {llm.confidenceAdjustment}
              </p>
            </CardContent>
          </Card>
        )}

        {scan.aiPending && !llm && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-3 flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-foreground">
                Cloud AI is still refining this diagnosis. The page will update
                automatically when the fused PlantNet + LLM result arrives.
              </p>
            </CardContent>
          </Card>
        )}

        {!scan.aiPending && !llm && scan.aiError && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs text-foreground">
                AI enhancement failed, so this result is local-only. Reason:{" "}
                {scan.aiError}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Disease description (fallback) */}
        {!llm && diseaseInfo?.description && (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-1">
                About this disease
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                {diseaseInfo.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Symptoms */}
        {(llm?.symptoms ?? diseaseInfo?.symptoms) && (
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Leaf className="w-4 h-4 text-primary" /> Observed Symptoms
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {(llm?.symptoms ?? diseaseInfo?.symptoms ?? []).map(
                (s: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span className="text-foreground">{s}</span>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        )}

        {/* Immediate Actions (LLM only) */}
        {llm?.immediateActions && llm.immediateActions.length > 0 && (
          <Card className={cn("border", sev.border)}>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" /> Immediate Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {llm.immediateActions.map((a, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold shrink-0">
                    {i + 1}
                  </div>
                  <span className="text-foreground">{a}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Treatment Plan */}
        {llm?.treatmentPlan ? (
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" /> Treatment Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {[
                {
                  label: "Chemical",
                  value: llm.treatmentPlan.chemical,
                  style: "text-red-700 bg-red-50",
                },
                {
                  label: "Biological",
                  value: llm.treatmentPlan.biological,
                  style: "text-green-700 bg-green-50",
                },
                {
                  label: "Cultural",
                  value: llm.treatmentPlan.cultural,
                  style: "text-blue-700 bg-blue-50",
                },
              ].map(({ label, value, style }) => (
                <div key={label}>
                  <span
                    className={cn(
                      "inline-block text-xs font-semibold px-2 py-0.5 rounded mb-1",
                      style
                    )}
                  >
                    {label}
                  </span>
                  <p className="text-sm text-foreground">{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          severity !== "healthy" &&
          diseaseInfo?.treatments && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" /> Treatment
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {diseaseInfo.treatments.map((t: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <div className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </div>
                    <span className="text-foreground">{t}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )
        )}

        {/* Impact & Risk */}
        {llm && (
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-semibold text-muted-foreground">
                    Yield Impact
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground">
                  {llm.yieldImpact}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-semibold text-muted-foreground">
                    Spread Risk
                  </span>
                </div>
                <span
                  className={cn(
                    "text-sm font-semibold px-2 py-0.5 rounded capitalize",
                    SPREAD_RISK_STYLE[llm.spreadRisk] ??
                      "text-foreground bg-muted"
                  )}
                >
                  {llm.spreadRisk}
                </span>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Prevention */}
        {(llm?.preventionTips ?? diseaseInfo?.prevention) && (
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-600" /> Prevention Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {(llm?.preventionTips ?? diseaseInfo?.prevention ?? []).map(
                (tip: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-foreground">{tip}</span>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        )}

        {/* Additional Notes */}
        {llm?.additionalNotes && (
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-1">
                Additional Notes
              </p>
              <p className="text-sm text-foreground">{llm.additionalNotes}</p>
            </CardContent>
          </Card>
        )}

        {/* Sync status */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            {scan.synced ? "✓ Synced to cloud" : "⏳ Pending cloud sync"}
          </span>
          {scan.fieldId && <span>Field: {scan.fieldId}</span>}
        </div>

        <Separator />

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 pb-2">
          <Button variant="outline" className="h-12" onClick={handleExportPDF}>
            <FileDown className="w-4 h-4 mr-2" /> Export PDF
          </Button>
          <Link href="/scan">
            <Button className="w-full h-12">
              <Repeat className="w-4 h-4 mr-2" /> New Capture
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
