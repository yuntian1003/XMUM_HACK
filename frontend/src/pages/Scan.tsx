import { useRef, useState, useCallback, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Camera,
  Cloud,
  Upload,
  X,
  Zap,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  History,
  Leaf,
  ShieldCheck,
  Wifi,
  WifiOff,
  Search,
  Trash2,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { coerceNumber, getLiveFreshness, type LiveDataStatusLike } from "@/lib/backendSignals";
import { toRelativeTime } from "@/lib/dashboardStyle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { saveScan, getLocalScans, deleteScan, generateLocalId, type LocalScan } from "@/lib/db";
import { detectDiseaseForPlant } from "@/lib/multiPlantDetector";
import { validateLeafImageTF } from "@/lib/tfLeafValidator";

import { ValidationPreview } from "@/components/ValidationPreview";
import ScannerFamilyNav from "@/components/ScannerFamilyNav";
import { cn } from "@/lib/utils";

type ScanStep = "idle" | "preview" | "analyzing" | "done";

type AnalyzeMutationResult = {
  success: boolean;
  analysis?: LocalScan["llmAnalysis"];
};

type NewsRow = {
  title?: string | null;
  publishedAt?: string | null;
  isAlert?: boolean | null;
};

type NewsResponse = {
  data?: NewsRow[] | null;
};

type ScanStatsResponse = {
  total: number;
  byDisease: Record<string, number>;
  bySeverity: Record<string, number>;
};

function compressImage(
  file: Blob,
  maxDim = 1024
): Promise<{ dataUrl: string; blob: Blob }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        blob => {
          if (!blob) {
            reject(new Error("Canvas toBlob failed"));
            return;
          }
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          URL.revokeObjectURL(url);
          resolve({ dataUrl, blob });
        },
        "image/jpeg",
        0.85
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function Scan() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<ScanStep>("idle");
  const [capturedImage, setCapturedImage] = useState<{
    dataUrl: string;
    blob: Blob;
  } | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment"
  );
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState("Initializing...");
  const [cropVariety, setCropVariety] = useState("");
  const [notes, setNotes] = useState("");
  const [showMeta, setShowMeta] = useState(false);
  const [detectedPlant, setDetectedPlant] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [skipValidation, setSkipValidation] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  const [activeTab, setActiveTab] = useState<"scan" | "history">("scan");
  const [localScans, setLocalScans] = useState<LocalScan[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const [historySeverity, setHistorySeverity] = useState<string>("all");
  const [syncing, setSyncing] = useState(false);

  const analyzeMutation = trpc.scans.analyze.useMutation();
  const liveDataQuery = trpc.liveData.getStatus.useQuery(undefined, {
    refetchInterval: 5 * 60_000,
  });
  const producerNewsQuery = trpc.news.getLatest.useQuery(
    { limit: 3, side: "producer" },
    { refetchInterval: 60 * 60_000 }
  );
  const cloudStatsQuery = trpc.scans.stats.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 60 * 60_000,
  });

  const loadScans = useCallback(async () => {
    try {
      const all = await getLocalScans(200);
      setLocalScans(all);
    } catch (e) {
      console.error("Failed to load local scans:", e);
    }
  }, []);

  useEffect(() => {
    loadScans();
  }, [loadScans]);

  const syncMutation = trpc.scans.sync.useMutation({
    onSuccess: (data) => {
      toast.success(`Synced ${data.synced} scan(s) to cloud.`);
      loadScans();
    },
    onError: () => toast.error("Sync failed. Check your connection."),
    onSettled: () => setSyncing(false),
  });

  const handleSync = async () => {
    const unsynced = localScans.filter((s) => !s.synced);
    if (unsynced.length === 0) {
      toast.info("All scans are already synced.");
      return;
    }
    setSyncing(true);
    syncMutation.mutate({
      scans: unsynced.map((s) => ({
        localId: s.localId,
        diseaseName: s.diseaseName ?? "",
        diseaseKey: s.diseaseKey ?? "",
        confidence: s.confidence ?? 0,
        severity: (s.severity ?? "healthy") as "healthy" | "mild" | "moderate" | "severe",
        cropVariety: s.cropVariety,
        fieldId: s.fieldId,
        latitude: s.latitude,
        longitude: s.longitude,
        notes: s.notes,
        scannedAt: new Date(s.scannedAt),
      })),
    });
  };

  const handleDeleteScan = async (localId: string) => {
    try {
      await deleteScan(localId);
      setLocalScans((prev) => prev.filter((s) => s.localId !== localId));
      toast.success("Scan deleted.");
    } catch {
      toast.error("Failed to delete scan.");
    }
  };

  const liveData = liveDataQuery.data as LiveDataStatusLike | undefined;
  const producerNews = (producerNewsQuery.data as NewsResponse | undefined)?.data ?? [];
  const cloudStats = cloudStatsQuery.data as ScanStatsResponse | undefined;
  const freshness = getLiveFreshness(liveData);
  const latestFieldAlert = producerNews.find((item) => item.isAlert) ?? producerNews[0];
  const cloudScanCount = cloudStats?.total ?? 0;
  const severeCloudCount = coerceNumber(cloudStats?.bySeverity?.severe) ?? 0;

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const startCamera = useCallback(async () => {
    console.log("[Camera] Starting camera with facingMode:", facingMode);
    setCameraError(null);
    setCameraActive(false);
    setCameraStarting(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          "Camera is not supported in this browser. Try using the latest Chrome/Edge, or upload an image instead."
        );
        return;
      }
      // Camera requires a secure context (HTTPS) except for localhost/127.0.0.1.
      if (typeof window !== "undefined" && !window.isSecureContext) {
        setCameraError(
          "Camera is blocked because this page is not a secure context. Open the app using http://localhost:3000 (or https) instead of a LAN IP."
        );
        return;
      }
      if (streamRef.current) {
        console.log("[Camera] Stopping existing stream");
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      console.log("[Camera] Requesting getUserMedia");
      const getStream = navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      const stream = await Promise.race([
        getStream,
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(new Error("Camera request timed out. Please try again.")),
            10000
          )
        ),
      ]);
      console.log("[Camera] Got stream:", stream);
      streamRef.current = stream;
      if (videoRef.current) {
        console.log("[Camera] Setting srcObject");
        videoRef.current.srcObject = stream;

        const playPromise = videoRef.current.play();
        await Promise.race([
          playPromise,
          new Promise<never>((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    "Camera started but playback did not begin. Please try again or upload an image."
                  )
                ),
              8000
            )
          ),
        ]);

        setCameraActive(true);
        setCameraStarting(false);
        console.log("[Camera] Playback started");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      console.error("[Camera] getUserMedia error:", e);
      setCameraError(
        msg.includes("denied") || msg.includes("Permission")
          ? "Camera permission denied. Please allow camera access in your browser settings."
          : msg.includes("NotFound") || msg.includes("not found")
            ? "No camera found on this device. Please upload an image instead."
            : `Camera error: ${msg || "Unable to access camera"}`
      );
      setCameraActive(false);
      setCameraStarting(false);
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
    setCameraStarting(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      async blob => {
        if (!blob) return;
        try {
          const compressed = await compressImage(blob);
          setCapturedImage(compressed);
          setStep("preview");
          stopCamera();
          setIsValidating(true);
          const validation = await validateLeafImageTF(compressed.blob);
          setValidationResult(validation);
          setIsValidating(false);
        } catch {
          toast.error("Failed to process image.");
        }
      },
      "image/jpeg",
      0.92
    );
  }, [stopCamera]);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file.");
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error("Image too large. Max 20MB.");
        return;
      }
      try {
        const compressed = await compressImage(file);
        setCapturedImage(compressed);
        setStep("preview");
        stopCamera();
        setIsValidating(true);
        const validation = await validateLeafImageTF(compressed.blob);
        setValidationResult(validation);
        setIsValidating(false);
      } catch {
        toast.error("Failed to process image.");
      }
      e.target.value = "";
    },
    [stopCamera]
  );

  const runAnalysis = useCallback(async () => {
    if (!capturedImage) return;
    // Skip validation check if user chose to skip
    if (
      !skipValidation &&
      validationResult &&
      validationResult.isPlant === false
    ) {
      toast.error(validationResult.reason);
      return;
    }
    setStep("analyzing");
    setAnalysisProgress(0);
    setAnalysisStatus("Running local detection...");

    const progressInterval = setInterval(() => {
      setAnalysisProgress(p => {
        if (p < 35) return p + 8;
        if (p < 75) return p + 3;
        if (p < 88) return p + 1;
        return p;
      });
    }, 350);

    try {
      // Step 1: Fast local pixel analysis
      // Step 1: Local disease detection (use detected plant or auto-detect)
      const localResult = await detectDiseaseForPlant(
        capturedImage.blob,
        detectedPlant || undefined
      );
      if (!localResult) {
        toast.error("Failed to analyze image. Please try again.");
        setStep("preview");
        clearInterval(progressInterval);
        return;
      }
      setDetectedPlant(localResult.plantType);

      setAnalysisProgress(38);
      setAnalysisStatus(
        isOnline
          ? "AI deep analysis in progress..."
          : "Offline mode: using local analysis..."
      );

      // Step 2: LLM-powered deep analysis
      let llmAnalysis = null;
      if (isOnline) {
        const llmResult = await analyzeMutation.mutateAsync({
          imageBase64: capturedImage.dataUrl,
          diseaseKey: localResult.diseaseKey,
          diseaseName: localResult.diseaseName,
          confidence: localResult.confidence,
          severity: localResult.severity,
          plantType: localResult.plantType || detectedPlant || undefined,
          cropVariety: cropVariety.trim() || undefined,
          notes: notes.trim() || undefined,
        });

        if (llmResult.success && llmResult.analysis) {
          llmAnalysis = llmResult.analysis;
        } else {
          throw new Error("AI analysis returned no structured result.");
        }
      }

      setAnalysisProgress(92);
      setAnalysisStatus("Saving results...");

      const localId = generateLocalId();
      const finalDisease =
        llmAnalysis?.confirmedDisease ?? localResult.diseaseName;
      const finalDiseaseKey =
        llmAnalysis?.confirmedDiseaseKey ?? localResult.diseaseKey;
      const finalSeverity = (llmAnalysis?.confirmedSeverity ??
        localResult.severity) as LocalScan["severity"];

      const scan: LocalScan = {
        localId,
        imageDataUrl: capturedImage.dataUrl,
        imageFile: capturedImage.blob,
        diseaseName: finalDisease,
        diseaseKey: finalDiseaseKey,
        confidence: localResult.confidence,
        severity: finalSeverity,
        plantType: localResult.plantType || detectedPlant || undefined,
        cropVariety: cropVariety.trim() || undefined,
        notes: notes.trim() || undefined,
        synced: false,
        scannedAt: Date.now(),
        llmAnalysis: llmAnalysis ?? undefined,
      };

      await saveScan(scan);
      loadScans();

      clearInterval(progressInterval);
      setAnalysisProgress(100);
      setAnalysisStatus("Complete!");
      setStep("done");
      setTimeout(() => navigate(`/result/${localId}`), 600);
    } catch (e) {
      clearInterval(progressInterval);
      console.error("Analysis failed:", e);
      const msg =
        e instanceof Error ? e.message : "Analysis failed. Please try again.";
      toast.error(msg);
      setStep("preview");
    }
  }, [
    capturedImage,
    skipValidation,
    validationResult,
    detectedPlant,
    analyzeMutation,
    cropVariety,
    notes,
    navigate,
    loadScans,
  ]);

  const reset = useCallback(() => {
    setCapturedImage(null);
    setStep("idle");
    setCameraActive(false);
    setCameraError(null);
    setValidationResult(null);
  }, []);

  const flipCamera = useCallback(() => {
    setFacingMode(f => (f === "environment" ? "user" : "environment"));
    if (cameraActive) {
      stopCamera();
      setTimeout(() => startCamera(), 100);
    }
  }, [cameraActive, stopCamera, startCamera]);

  const unsyncedCount = localScans.filter((s) => !s.synced).length;

  const filteredHistory = localScans.filter((s) => {
    const q = historySearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (s.diseaseName?.toLowerCase().includes(q) ?? false) ||
      (s.plantType?.toLowerCase().includes(q) ?? false) ||
      (s.cropVariety?.toLowerCase().includes(q) ?? false) ||
      (s.notes?.toLowerCase().includes(q) ?? false);
    const matchesSeverity =
      historySeverity === "all" || s.severity === historySeverity;
    return matchesSearch && matchesSeverity;
  });

  const getSeverityBadgeClass = (severity?: string | null) => {
    switch (severity) {
      case "severe":
        return "border-red-200 bg-red-50 text-red-700";
      case "moderate":
        return "border-amber-200 bg-amber-50 text-amber-700";
      case "mild":
        return "border-yellow-200 bg-yellow-50 text-yellow-700";
      case "healthy":
        return "border-emerald-200 bg-emerald-50 text-emerald-700";
      default:
        return "border-slate-200 bg-slate-50 text-slate-700";
    }
  };

  return (
    <div className="min-h-screen bg-[#edf6f0] text-[#0f2417] pb-16">
      {/* ── Top Sticky Header Bar (Like Government Page) ── */}
      <header className="sticky top-14 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:px-8">
        <div className="mx-auto max-w-[1550px] flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
              <Camera className="h-5 w-5 text-emerald-700" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-black text-slate-900">AgriGuard</p>
                <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                  Crop Scanner Station
                </span>
                <span
                  className={cn(
                    "rounded-lg px-2.5 py-0.5 text-xs font-bold border",
                    isOnline
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                  )}
                >
                  {isOnline ? "Online Cloud LLM" : "Edge-Only Offline AI"}
                </span>
                <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                  {localScans.length} Scans ({unsyncedCount} Unsynced)
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Autonomous leaf neural diagnostics & treatment protocols · 17 ASEAN crops
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("scan")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-semibold transition-colors",
                activeTab === "scan"
                  ? "border-emerald-200 bg-emerald-100 text-emerald-800 font-bold shadow-sm"
                  : "border-transparent bg-white text-slate-600 hover:border-slate-200 hover:bg-emerald-50"
              )}
            >
              <Camera className="h-4 w-4" />
              Live Scanner
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-semibold transition-colors",
                activeTab === "history"
                  ? "border-emerald-200 bg-emerald-100 text-emerald-800 font-bold shadow-sm"
                  : "border-transparent bg-white text-slate-600 hover:border-slate-200 hover:bg-emerald-50"
              )}
            >
              <History className="h-4 w-4" />
              Scan History ({localScans.length})
            </button>
            <Badge className="border border-emerald-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 rounded-lg shadow-sm">
              <Cloud className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
              {freshness.label}
            </Badge>
          </div>
        </div>
      </header>

      <div className="w-full max-w-[1550px] mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* ── TAB 1: LIVE SCANNER ── */}
        {activeTab === "scan" && (
          <div className="space-y-6">
            {/* Quick Engine Telemetry Strip */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[#d8e8dd] bg-white p-3.5 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Neural Engine</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">TensorFlow Edge MobileNet</p>
                </div>
                <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold">
                  100% Offline
                </span>
              </div>

              <div className="rounded-xl border border-[#d8e8dd] bg-white p-3.5 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Diagnostic Coverage</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">17 ASEAN Plant Varieties</p>
                </div>
                <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold">
                  80+ Pathogens
                </span>
              </div>

              <div className="rounded-xl border border-[#d8e8dd] bg-white p-3.5 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Storage & Pipeline</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{localScans.length} Local Scans Cached</p>
                </div>
                <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold border", unsyncedCount > 0 ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>
                  {unsyncedCount > 0 ? `${unsyncedCount} Unsynced` : "Synced"}
                </span>
              </div>
            </div>

            {/* IDLE VIEWPORT & PROTOCOLS */}
            {step === "idle" && (
              <div className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)] items-stretch">
                  {/* Viewfinder Card */}
                  <div className="rounded-2xl border border-[#d8e8dd] bg-white p-5 shadow-sm flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between pb-3 shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                          Optical Leaf Viewport
                        </h2>
                      </div>
                      <Badge className="border border-slate-200 bg-slate-50 text-slate-700 text-[11px]">
                        {cameraActive ? "Camera Live" : "Standby"}
                      </Badge>
                    </div>

                    <div className="relative flex-1 min-h-[280px] overflow-hidden rounded-[18px] bg-slate-950 border border-slate-800 shadow-inner flex items-center justify-center">
                      {cameraActive || cameraStarting ? (
                        <>
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            disablePictureInPicture
                            className="absolute inset-0 h-full w-full object-cover"
                            style={{
                              transform: facingMode === "user" ? "scaleX(-1)" : "scaleX(1)",
                              WebkitTransform: facingMode === "user" ? "scaleX(-1)" : "scaleX(1)",
                            }}
                          />
                          {cameraStarting && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                              <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-emerald-400" />
                            </div>
                          )}
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <div className="relative h-44 w-44 sm:h-48 sm:w-48">
                              <div className="absolute inset-0 rounded-2xl border border-emerald-400/40" />
                              <div className="absolute left-0 top-0 h-7 w-7 rounded-tl-2xl border-l-4 border-t-4 border-emerald-400" />
                              <div className="absolute right-0 top-0 h-7 w-7 rounded-tr-2xl border-r-4 border-t-4 border-emerald-400" />
                              <div className="absolute bottom-0 left-0 h-7 w-7 rounded-bl-2xl border-b-4 border-l-4 border-emerald-400" />
                              <div className="absolute bottom-0 right-0 h-7 w-7 rounded-br-2xl border-b-4 border-r-4 border-emerald-400" />
                            </div>
                          </div>
                          <p className="absolute bottom-3 left-0 right-0 text-center text-xs font-semibold text-white/90 drop-shadow">
                            Align the diseased leaf section inside the targeting square
                          </p>
                          <button
                            onClick={flipCamera}
                            className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl bg-black/60 text-white backdrop-blur hover:bg-black/80 transition-colors"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        </>
                      ) : cameraError ? (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center bg-slate-900">
                          <AlertCircle className="h-10 w-10 text-amber-400" />
                          <p className="text-sm font-semibold text-slate-200">{cameraError}</p>
                          <p className="text-xs text-slate-400 max-w-sm">
                            You can continue seamlessly by selecting an existing photo from your device.
                          </p>
                        </div>
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center bg-slate-900">
                          <div className="w-16 h-16 rounded-2xl bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center">
                            <Camera className="h-8 w-8 text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">Live Camera Standby</p>
                            <p className="text-xs text-slate-400 mt-0.5 max-w-xs">
                              Click Open Camera to start leaf diagnosis or upload an existing photo.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    <canvas ref={canvasRef} className="hidden" />

                    {cameraActive ? (
                      <div className="grid grid-cols-2 gap-3 pt-3 shrink-0">
                        <Button
                          onClick={capturePhoto}
                          size="lg"
                          className="h-12 bg-emerald-600 hover:bg-emerald-700 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 rounded-xl"
                        >
                          <Camera className="mr-2 h-4 w-4" /> Capture Photo
                        </Button>
                        <Button onClick={stopCamera} variant="outline" size="lg" className="h-12 rounded-xl border-slate-300 bg-white hover:bg-slate-50 font-bold text-sm">
                          <X className="mr-2 h-4 w-4" /> Cancel
                        </Button>
                      </div>
                    ) : cameraStarting ? (
                      <div className="grid grid-cols-2 gap-3 pt-3 shrink-0">
                        <Button disabled size="lg" className="h-12 bg-emerald-600 text-sm font-bold text-white opacity-80 rounded-xl">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Initializing…
                        </Button>
                        <Button onClick={stopCamera} variant="outline" size="lg" className="h-12 rounded-xl border-slate-300 bg-white font-bold text-sm">
                          <X className="mr-2 h-4 w-4" /> Cancel
                        </Button>
                      </div>
                    ) : cameraError ? (
                      <div className="space-y-2 pt-3 shrink-0">
                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          size="lg"
                          className="h-12 w-full bg-emerald-600 hover:bg-emerald-700 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 rounded-xl"
                        >
                          <Upload className="mr-2 h-4 w-4" /> Upload Photo Instead
                        </Button>
                        <Button onClick={startCamera} variant="outline" size="lg" className="h-12 w-full rounded-xl border-slate-300 bg-white font-bold text-sm">
                          <RotateCcw className="mr-2 h-4 w-4" /> Try Camera Again
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 pt-3 shrink-0">
                        <Button
                          onClick={startCamera}
                          size="lg"
                          className="h-12 bg-emerald-600 hover:bg-emerald-700 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 rounded-xl"
                        >
                          <Camera className="mr-2 h-4 w-4" /> Open Camera
                        </Button>
                        <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="lg" className="h-12 rounded-xl border-slate-300 bg-white hover:bg-slate-50 font-bold text-slate-800 text-sm">
                          <Upload className="mr-2 h-4 w-4 text-emerald-600" /> Upload Photo
                        </Button>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </div>

                  {/* Right Column: Two stacked boxes with equal aligned total height */}
                  <div className="flex flex-col justify-between gap-4 h-full">
                    {/* Box 1: Field Capture Quality Protocol */}
                    <div className="rounded-2xl border border-[#d8e8dd] bg-white p-5 shadow-sm flex-1 flex flex-col justify-between">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <h3 className="text-sm font-bold text-slate-900">Field Capture Quality Protocol</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 text-xs">
                        <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                          <strong className="text-slate-900 block mb-0.5">Focus Leaf</strong>
                          Center a single diseased leaf or visible lesion.
                        </div>
                        <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                          <strong className="text-slate-900 block mb-0.5">Natural Light</strong>
                          Use diffused daylight; avoid harsh glare or shadows.
                        </div>
                        <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                          <strong className="text-slate-900 block mb-0.5">20–30 cm Distance</strong>
                          Hold lens close enough for crisp vein details.
                        </div>
                        <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                          <strong className="text-slate-900 block mb-0.5">Zero Data Needed</strong>
                          Fully operational in deep jungle offline.
                        </div>
                      </div>
                    </div>

                    {/* Box 2: 3-Step Neural Diagnosis Workflow */}
                    <div className="rounded-2xl border border-[#d8e8dd] bg-white p-5 shadow-sm flex-1 flex flex-col justify-between">
                      <div className="flex items-center gap-2 mb-3">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        <h3 className="text-sm font-bold text-slate-900">3-Step Neural Diagnosis Workflow</h3>
                      </div>
                      <div className="space-y-2 text-xs">
                        {[
                          { step: "01", title: "Image Crop & Quality Check", desc: "TensorFlow verifies leaf presence, angle, and blur resistance." },
                          { step: "02", title: "Multi-Plant Edge Inference", desc: "Identifies crop family and specific disease pathogen." },
                          { step: "03", title: "Severity & Treatment Protocol", desc: "Generates localized chemical, organic, and preventive actions." },
                        ].map((item) => (
                          <div key={item.step} className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-[10px] font-black text-emerald-800">
                              {item.step}
                            </span>
                            <div>
                              <p className="font-bold text-slate-900">{item.title}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Captures Quick Access Bar */}
                <div className="rounded-2xl border border-[#d8e8dd] bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <History className="h-5 w-5 text-emerald-600" />
                      <h3 className="text-base font-bold text-slate-900">
                        Recent Field Scans ({localScans.length})
                      </h3>
                    </div>
                    {localScans.length > 0 && (
                      <button
                        onClick={() => setActiveTab("history")}
                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
                      >
                        Open Full Scan History <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {localScans.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center text-slate-500 text-xs">
                      No previous captures found. Open camera above to generate your first diagnostic scan.
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                      {localScans.slice(0, 4).map((scan) => (
                        <Link
                          key={scan.localId}
                          href={`/result/${scan.localId}`}
                          className="group rounded-xl border border-slate-100 bg-slate-50/80 p-3 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all block"
                        >
                          <div className="flex gap-3 items-center">
                            {scan.imageDataUrl ? (
                              <img
                                src={scan.imageDataUrl}
                                alt={scan.diseaseName ?? "Scan"}
                                className="w-14 h-14 rounded-lg object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                                <Leaf className="h-6 w-6" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-900 truncate group-hover:text-emerald-700">
                                {scan.diseaseName ?? "Unknown condition"}
                              </p>
                              <p className="text-[11px] text-slate-500 capitalize">
                                {scan.plantType ?? "Plant"} {scan.cropVariety ? `(${scan.cropVariety})` : ""}
                              </p>
                              <div className="mt-1 flex items-center gap-2">
                                <span className={cn("text-[10px] font-bold px-1.5 py-0.2 rounded border", getSeverityBadgeClass(scan.severity))}>
                                  {scan.severity ?? "Diagnosed"}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {toRelativeTime(new Date(scan.scannedAt))}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PREVIEW VIEWPORT */}
            {step === "preview" && capturedImage && (
              <div className="mx-auto max-w-4xl space-y-4">
                {isValidating && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
                    <div className="text-sm font-semibold text-amber-900">
                      Validating leaf clarity and focal quality via TensorFlow…
                    </div>
                  </div>
                )}
                <div className="rounded-[24px] border border-[#d8e8dd] bg-white p-6 shadow-sm">
                  <ValidationPreview
                    imageDataUrl={capturedImage.dataUrl}
                    validationResult={validationResult}
                    isValidating={isValidating}
                    selectedPlant={detectedPlant || "Auto-detect"}
                    beforeActions={
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                        <button
                          onClick={() => setShowMeta((v) => !v)}
                          className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100"
                        >
                          <span>Add symptoms or crop variety details (optional)</span>
                          {showMeta ? (
                            <ChevronUp className="h-4 w-4 text-slate-500" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-500" />
                          )}
                        </button>
                        {showMeta && (
                          <div className="space-y-3 border-t border-slate-200 bg-white px-4 py-4">
                            <div className="space-y-1.5">
                              <Label htmlFor="cropVariety" className="text-xs font-semibold text-slate-700">
                                Crop Variety
                              </Label>
                              <Input
                                id="cropVariety"
                                value={cropVariety}
                                onChange={(e) => setCropVariety(e.target.value)}
                                placeholder="e.g. MR219, IR64, Basmati..."
                                className="h-10 text-xs rounded-xl border-slate-200"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="notes" className="text-xs font-semibold text-slate-700">
                                Symptoms / Notes
                              </Label>
                              <Input
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Describe symptoms observed on the plant..."
                                className="h-10 text-xs rounded-xl border-slate-200"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    }
                    onConfirm={runAnalysis}
                    onRetake={reset}
                    onSkip={() => {
                      setSkipValidation(true);
                      runAnalysis();
                    }}
                  />
                </div>
              </div>
            )}

            {/* ANALYZING VIEWPORT */}
            {step === "analyzing" && (
              <div className="mx-auto max-w-2xl rounded-[26px] border border-[#d8e8dd] bg-white p-8 md:p-12 shadow-sm text-center space-y-6">
                {capturedImage && (
                  <div className="relative mx-auto h-48 w-48 overflow-hidden rounded-2xl shadow-xl border-2 border-emerald-500">
                    <img
                      src={capturedImage.dataUrl}
                      alt="Analyzing leaf"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                      <div className="h-14 w-14 animate-spin rounded-full border-4 border-white/20 border-t-emerald-400" />
                    </div>
                  </div>
                )}

                <div className="w-full space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-slate-600">{analysisStatus}</span>
                    <span className="font-mono font-black text-emerald-700">
                      {Math.round(analysisProgress)}%
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                      style={{ width: `${analysisProgress}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1 text-center">
                  <p className="flex items-center justify-center gap-2 text-base font-bold text-slate-900">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                    Diagnosing Crop Leaf via Edge AI…
                  </p>
                  <p className="text-xs text-slate-500">{analysisStatus}</p>
                </div>
              </div>
            )}

            {/* DONE VIEWPORT */}
            {step === "done" && (
              <div className="mx-auto max-w-md rounded-[26px] border border-[#d8e8dd] bg-white p-10 shadow-sm text-center space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  Diagnosis Complete!
                </h3>
                <p className="text-xs text-slate-500">
                  Transferring to complete prescription and treatment protocol…
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: SCAN HISTORY ── */}
        {activeTab === "history" && (
          <div className="space-y-6">
            {/* Top Search & Filter Toolbar */}
            <div className="rounded-2xl border border-[#d8e8dd] bg-white p-5 shadow-sm space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by disease name, plant type, variety..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="pl-9 h-10 text-xs rounded-xl border-slate-200 bg-slate-50"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={handleSync}
                    disabled={syncing || unsyncedCount === 0}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-4 rounded-xl"
                  >
                    <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", syncing && "animate-spin")} />
                    Sync {unsyncedCount > 0 ? `(${unsyncedCount})` : ""} to Cloud
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab("scan")}
                    className="border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs h-10 px-4 rounded-xl"
                  >
                    <Camera className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                    New Scan
                  </Button>
                </div>
              </div>

              {/* Severity Filter Pills */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-500 mr-1">Severity:</span>
                {["all", "severe", "moderate", "mild", "healthy"].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setHistorySeverity(sev)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold capitalize transition-colors",
                      historySeverity === sev
                        ? "bg-emerald-700 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {sev}
                  </button>
                ))}
                <span className="text-xs text-slate-400 ml-auto font-medium">
                  Showing {filteredHistory.length} of {localScans.length} scans
                </span>
              </div>
            </div>

            {/* Scans Grid */}
            {filteredHistory.length === 0 ? (
              <div className="rounded-2xl border border-[#d8e8dd] bg-white p-12 text-center shadow-sm space-y-3">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Leaf className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">No Scan Records Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {historySearch || historySeverity !== "all"
                    ? "No records matched your search filters. Try clearing your search term."
                    : "No field scans captured yet. Point your camera at a crop leaf to generate a report."}
                </p>
                <div className="pt-2">
                  <Button
                    onClick={() => setActiveTab("scan")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-xl"
                  >
                    <Camera className="mr-1.5 h-4 w-4" /> Open Live Scanner
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredHistory.map((scan) => (
                  <div
                    key={scan.localId}
                    className="group rounded-2xl border border-[#d8e8dd] bg-white overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                      {scan.imageDataUrl ? (
                        <img
                          src={scan.imageDataUrl}
                          alt={scan.diseaseName ?? "Crop Leaf"}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-emerald-50 text-emerald-600">
                          <Leaf className="h-10 w-10 opacity-50" />
                        </div>
                      )}
                      <span className={cn("absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm", getSeverityBadgeClass(scan.severity))}>
                        {scan.severity ? scan.severity.toUpperCase() : "DIAGNOSED"}
                      </span>
                      {scan.confidence && (
                        <span className="absolute top-3 right-3 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur">
                          {Math.round(scan.confidence * 100)}%
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                          {scan.plantType ?? "Plant Leaf"} {scan.cropVariety ? `· ${scan.cropVariety}` : ""}
                        </p>
                        <h4 className="text-sm font-bold text-slate-900 mt-0.5 line-clamp-1">
                          {scan.diseaseName ?? "Unknown Condition"}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Scanned {toRelativeTime(new Date(scan.scannedAt))}
                        </p>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <Link
                          href={`/result/${scan.localId}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
                        >
                          View Report <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDeleteScan(scan.localId)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete scan"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

