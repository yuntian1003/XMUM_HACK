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
import { saveScan, generateLocalId, type LocalScan } from "@/lib/db";
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
    navigate,
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

  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden bg-gradient-to-br from-[#163a24] via-[#1a4731] to-[#2d7a4f]">
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "url('/images/hero-bg.png')", backgroundSize: "cover", backgroundPosition: "center" }}
        />
        <div className="absolute inset-0 bg-[#163a24]/55" />
        <div className="relative mx-auto max-w-6xl px-4 pt-6 pb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Badge className="border-0 bg-white/12 text-white hover:bg-white/12">
                <Leaf className="mr-1 h-3.5 w-3.5" />
                Field Layer
              </Badge>
              <h1 className="mt-4 text-3xl font-bold leading-tight text-white md:text-5xl">
                Crop Scanner
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-emerald-50/85 md:text-base">
                {step === "idle" && "Open the camera, upload a crop image, and keep the whole diagnosis flow inside one scanner app."}
                {step === "preview" && "Review the captured leaf before analysis so the diagnosis starts from a clean image."}
                {step === "analyzing" && "The scanner is running local diagnosis first, then cloud follow-up when the connection is available."}
                {step === "done" && "The result is ready and the scanner is moving you into the full report view."}
              </p>
            </div>

            <div className="flex flex-col items-start gap-2 lg:items-end">
              <Badge className={cn("border-0", isOnline ? "bg-emerald-300/20 text-emerald-50" : "bg-amber-300/20 text-amber-50")}>
                {isOnline ? <Wifi className="mr-1 h-3.5 w-3.5" /> : <WifiOff className="mr-1 h-3.5 w-3.5" />}
                {isOnline ? "Online AI follow-up" : "Offline local mode"}
              </Badge>
              <Badge
                className={cn(
                  "border-0",
                  freshness.state === "fresh"
                    ? "bg-white/12 text-white"
                    : freshness.state === "failed"
                      ? "bg-red-400/20 text-red-50"
                      : "bg-amber-300/20 text-amber-50"
                )}
              >
                <Cloud className="mr-1 h-3.5 w-3.5" />
                {freshness.label}
              </Badge>
              <p className="max-w-sm text-sm text-emerald-50/75 lg:text-right">
                Capture, result, and history stay grouped as one product family instead of being buried inside the dashboards.
              </p>
            </div>
          </div>

          <div className="mt-4">
            <ScannerFamilyNav active="capture" />
          </div>
        </div>
      </div>

      <div className="px-4 py-6">
        {/* ── IDLE ── */}
        {step === "idle" && (
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(20rem,0.88fr)]">
            <div className="space-y-4">
              <div
                className="relative overflow-hidden rounded-[28px] bg-gray-900 shadow-[0_20px_60px_rgba(6,78,59,0.18)]"
                style={{ aspectRatio: "4/3" }}
              >
                {cameraActive || cameraStarting ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      disablePictureInPicture
                      className="h-full w-full object-cover"
                      style={{
                        transform: facingMode === "user" ? "scaleX(-1)" : "scaleX(1)",
                        WebkitTransform: facingMode === "user" ? "scaleX(-1)" : "scaleX(1)",
                      }}
                    />
                    {cameraStarting && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="relative h-52 w-52">
                        <div className="absolute inset-0 rounded-xl border border-white/30" />
                        <div className="absolute left-0 top-0 h-7 w-7 rounded-tl-xl border-l-2 border-t-2 border-white" />
                        <div className="absolute right-0 top-0 h-7 w-7 rounded-tr-xl border-r-2 border-t-2 border-white" />
                        <div className="absolute bottom-0 left-0 h-7 w-7 rounded-bl-xl border-b-2 border-l-2 border-white" />
                        <div className="absolute bottom-0 right-0 h-7 w-7 rounded-br-xl border-b-2 border-r-2 border-white" />
                      </div>
                    </div>
                    <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-white/70">
                      Position the leaf in frame
                    </p>
                    <button
                      onClick={flipCamera}
                      className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </>
                ) : cameraError ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
                    <AlertCircle className="h-10 w-10 text-amber-400" />
                    <p className="text-sm text-gray-300">{cameraError}</p>
                  </div>
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3">
                    <Camera className="h-14 w-14 text-gray-600" />
                    <p className="text-sm text-gray-400">Camera not started</p>
                  </div>
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />

              {cameraActive ? (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={capturePhoto}
                    size="lg"
                    className="h-14 bg-primary text-base font-bold text-white shadow-lg shadow-primary/25"
                  >
                    <Camera className="mr-2 h-5 w-5" /> Capture
                  </Button>
                  <Button onClick={stopCamera} variant="outline" size="lg" className="h-14">
                    <X className="mr-2 h-5 w-5" /> Cancel
                  </Button>
                </div>
              ) : cameraStarting ? (
                <div className="grid grid-cols-2 gap-3">
                  <Button disabled size="lg" className="h-14 bg-primary text-base font-bold text-white opacity-80">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Starting…
                  </Button>
                  <Button onClick={stopCamera} variant="outline" size="lg" className="h-14">
                    <X className="mr-2 h-5 w-5" /> Cancel
                  </Button>
                </div>
              ) : cameraError ? (
                <div className="space-y-3">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    size="lg"
                    className="h-14 w-full bg-primary text-base font-bold text-white shadow-lg shadow-primary/25"
                  >
                    <Upload className="mr-2 h-5 w-5" /> Upload Photo Instead
                  </Button>
                  <Button onClick={startCamera} variant="outline" size="lg" className="h-14 w-full">
                    <RotateCcw className="mr-2 h-5 w-5" /> Try Camera Again
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={startCamera}
                    size="lg"
                    className="h-14 bg-primary text-base font-bold text-white shadow-lg shadow-primary/25"
                  >
                    <Camera className="mr-2 h-5 w-5" /> Open Camera
                  </Button>
                  <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="lg" className="h-14">
                    <Upload className="mr-2 h-5 w-5" /> Upload Photo
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

            <div className="space-y-4">
              <Card className="border-emerald-200 bg-emerald-50">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Scanner Mode</p>
                      <h2 className="mt-2 text-lg font-semibold text-emerald-950">
                        {isOnline ? "Hybrid local + cloud analysis" : "Offline local analysis"}
                      </h2>
                    </div>
                    <Badge className="border-0 bg-white text-emerald-800 hover:bg-white">
                      {isOnline ? "Cloud ready" : "Offline ready"}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    Start with a clean capture. The scanner handles diagnosis first, then improves the report later when AI follow-up is available.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-emerald-100 bg-white p-3">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Cloud history</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {isAuthenticated
                          ? cloudStatsQuery.isLoading
                            ? "Checking your account..."
                            : `${cloudScanCount} cloud scan${cloudScanCount === 1 ? "" : "s"}`
                          : "Sign in to sync"}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {isAuthenticated
                          ? severeCloudCount > 0
                            ? `${severeCloudCount} severe case${severeCloudCount === 1 ? "" : "s"} already synced for follow-up.`
                            : "New captures can sync into your backend history as soon as you save them."
                          : "Crop Scanner still works offline first, then pushes history to the backend when your account is connected."}
                      </p>
                    </div>
                    <div className="rounded-xl border border-emerald-100 bg-white p-3">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Field watch</p>
                      <p className="mt-2 text-sm font-semibold leading-5 text-slate-900">
                        {latestFieldAlert?.title ?? "Producer alert feed is ready"}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {latestFieldAlert?.publishedAt
                          ? `Published ${toRelativeTime(latestFieldAlert.publishedAt)} from the backend news feed.`
                          : "Latest producer-side alerts from FoodMonitor will appear here when they are available."}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Link href="/history" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800">
                      <History className="h-4 w-4" />
                      Open scan history
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-dashed bg-white">
                <CardContent className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Best Capture Checklist
                  </p>
                  <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
                    <li>Keep one leaf, fruit, stem, or flower as the main subject.</li>
                    <li>Use even lighting and avoid deep shadows or harsh glare.</li>
                    <li>Stay about 20-30 cm away so spots and lesions stay sharp.</li>
                    <li>Offline mode still works, then syncs cloud insights later.</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-emerald-900 bg-[#163a24] text-white">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-300" />
                    <p className="text-sm font-semibold">What happens next</p>
                  </div>
                  <div className="mt-4 space-y-3">
                    {[
                      "Detect crop type and likely disease from the image.",
                      "Add severity, symptoms, and treatment guidance.",
                      isAuthenticated
                        ? "Save locally, then sync the result into your cloud history and follow-up workflow."
                        : "Save the result locally now, then connect your account later to sync it to the backend.",
                    ].map((item, index) => (
                      <div key={item} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-emerald-50/90">
                        <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-300/20 text-xs font-bold text-emerald-100">
                          {index + 1}
                        </span>
                        {item}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {step !== "idle" && (
          <div className="mx-auto max-w-3xl space-y-4">
            {/* ── PREVIEW ── */}
            {step === "preview" && capturedImage && (
              <>
                {isValidating && (
                  <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="flex items-center gap-3 p-4">
                      <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
                      <div className="text-sm font-medium text-amber-900">
                        Validating image...
                      </div>
                    </CardContent>
                  </Card>
                )}
                <ValidationPreview
                  imageDataUrl={capturedImage.dataUrl}
                  validationResult={validationResult}
                  isValidating={isValidating}
                  selectedPlant={detectedPlant || "Auto-detect"}
                  beforeActions={
                    <div className="overflow-hidden rounded-xl border border-border">
                      <button
                        onClick={() => setShowMeta((v) => !v)}
                        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
                      >
                        <span>Add symptoms details (optional)</span>
                        {showMeta ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                      {showMeta && (
                        <div className="space-y-3 border-t border-border bg-muted/20 px-4 pb-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="cropVariety" className="text-xs font-medium">
                              Crop Variety
                            </Label>
                            <Input
                              id="cropVariety"
                              value={cropVariety}
                              onChange={(e) => setCropVariety(e.target.value)}
                              placeholder="e.g. MR219, IR64, Basmati..."
                              className="h-9 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="notes" className="text-xs font-medium">
                              Symptoms / Notes
                            </Label>
                            <Input
                              id="notes"
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Describe symptoms observed on the plant..."
                              className="h-9 text-sm"
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
              </>
            )}

            {/* ── ANALYZING ── */}
            {step === "analyzing" && (
              <div className="flex flex-col items-center justify-center space-y-6 py-8">
                {capturedImage && (
                  <div className="relative h-44 w-44 overflow-hidden rounded-2xl shadow-xl">
                    <img
                      src={capturedImage.dataUrl}
                      alt="Analyzing"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="h-14 w-14 animate-spin rounded-full border-4 border-white/20 border-t-primary" />
                    </div>
                  </div>
                )}

                <div className="w-full space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{analysisStatus}</span>
                    <span className="font-mono font-bold text-primary">
                      {Math.round(analysisProgress)}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${analysisProgress}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1 text-center">
                  <p className="flex items-center justify-center gap-2 text-sm font-medium text-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    Analyzing crop image...
                  </p>
                  <p className="text-xs text-muted-foreground">{analysisStatus}</p>
                </div>
              </div>
            )}

            {/* ── DONE ── */}
            {step === "done" && (
              <div className="flex flex-col items-center justify-center space-y-4 py-16">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-lg font-bold text-foreground">
                  Analysis complete
                </p>
                <p className="text-sm text-muted-foreground">
                  Redirecting to the Crop Scanner result...
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
