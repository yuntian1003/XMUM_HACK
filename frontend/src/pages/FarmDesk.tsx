import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Leaf,
  Loader2,
  Lock,
  MessageCircle,
  Package,
  RotateCcw,
  Send,
  ShieldCheck,
  ShoppingCart,
  Sprout,
  Upload,
  Users,
  Wheat,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { detectDiseaseForPlant } from "@/lib/multiPlantDetector";
import { useAuth } from "@/_core/hooks/useAuth";

type Role = "Worker" | "Manager" | "Owner";
type ReviewStatus = "not-started" | "needs-review" | "approved" | "rejected";
type OrderStatus = "not-created" | "pending" | "approved" | "rejected";
type DeskTab = "workflow" | "supplies" | "activity";
type SupplyKind = "Treatment stock" | "Fertiliser" | "Farm supply";

type SupplyItem = {
  id: string;
  name: string;
  kind: SupplyKind;
  unit: string;
  onHand: number;
  needed: number;
  reorderAt: number;
  supplier: string;
  unitPrice: number;
};

type ActivityEntry = {
  id: string;
  at: string;
  actor: Role | "System";
  action: string;
  detail: string;
};

type DeskState = {
  reviewStatus: ReviewStatus;
  orderStatus: OrderStatus;
  diagnosis: string;
  confidence: number | null;
  diagnosisSource: string;
  treatmentSteps: string[];
  treatmentNote: string;
  supplies: SupplyItem[];
  activity: ActivityEntry[];
};

const STORAGE_KEY = "farm-desk-demo-v1";

const INITIAL_SUPPLIES: SupplyItem[] = [
  {
    id: "treatment-kit",
    name: "Rice disease-control pack",
    kind: "Treatment stock",
    unit: "packs",
    onHand: 2,
    needed: 5,
    reorderAt: 3,
    supplier: "Kampung Tani Co-op",
    unitPrice: 48,
  },
  {
    id: "fertiliser",
    name: "Paddy fertiliser",
    kind: "Fertiliser",
    unit: "bags",
    onHand: 4,
    needed: 8,
    reorderAt: 5,
    supplier: "Kampung Tani Co-op",
    unitPrice: 32,
  },
  {
    id: "seedling-trays",
    name: "Seedling trays",
    kind: "Farm supply",
    unit: "units",
    onHand: 12,
    needed: 6,
    reorderAt: 4,
    supplier: "Kampung Tani Co-op",
    unitPrice: 8,
  },
];

const INITIAL_STATE: DeskState = {
  reviewStatus: "not-started",
  orderStatus: "not-created",
  diagnosis: "",
  confidence: null,
  diagnosisSource: "",
  treatmentSteps: [],
  treatmentNote: "",
  supplies: INITIAL_SUPPLIES,
  activity: [],
};

function readSavedState(): DeskState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    const saved: unknown = JSON.parse(raw);
    if (
      typeof saved !== "object" ||
      saved === null ||
      !("supplies" in saved) ||
      !Array.isArray(saved.supplies) ||
      !("activity" in saved) ||
      !Array.isArray(saved.activity)
    ) {
      console.warn("Saved Farm Desk demo data is invalid; starting a fresh demo.");
      return INITIAL_STATE;
    }
    return { ...INITIAL_STATE, ...saved } as DeskState;
  } catch (error) {
    console.error("Could not load saved Farm Desk demo data.", error);
    return INITIAL_STATE;
  }
}

function createActivity(actor: ActivityEntry["actor"], action: string, detail: string): ActivityEntry {
  return {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    actor,
    action,
    detail,
  };
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function shortageFor(item: SupplyItem) {
  return Math.max(0, item.needed - item.onHand);
}

function statusLabel(status: ReviewStatus | OrderStatus) {
  const labels: Record<ReviewStatus | OrderStatus, string> = {
    "not-started": "Not started",
    "needs-review": "Manager review",
    approved: "Approved",
    rejected: "Not approved",
    "not-created": "No order yet",
    pending: "Owner approval",
  };
  return labels[status];
}

export default function FarmDesk() {
  const [role, setRole] = useState<Role>("Worker");
  const [tab, setTab] = useState<DeskTab>("workflow");
  const [desk, setDesk] = useState<DeskState>(readSavedState);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [stockEdits, setStockEdits] = useState<Record<string, string>>({});
  // Auth — the logged-in user's openId doubles as the farmId for Telegram routing
  const { user, isAuthenticated } = useAuth();
  const farmId = user?.openId ?? null;
  // Worker-selected target owner
  const [selectedOwner, setSelectedOwner] = useState<{ openId: string; name: string } | null>(null);
  const [ownerSearch, setOwnerSearch] = useState("");
  // Fetch all registered users so the worker can pick an owner
  const ownersQuery = trpc.farmDesk.getAllOwners.useQuery(undefined, {
    refetchInterval: 15_000,
  });
  // Telegram PO send state
  const [telegramPoId, setTelegramPoId] = useState<string | null>(null);
  const [telegramStatus, setTelegramStatus] = useState<"idle" | "sending" | "sent" | "approved" | "rejected">("idle");
  const [telegramDecidedAt, setTelegramDecidedAt] = useState<string | null>(null);
  // Telegram link state (for Owner role)
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [linkCodeCopied, setLinkCodeCopied] = useState(false);
  const analyzeMutation = trpc.scans.analyze.useMutation();
  const sendPoMutation = trpc.farmDesk.sendPO.useMutation();
  // protectedProcedures — only work when user is logged in
  const generateLinkCodeMutation = trpc.farmDesk.generateLinkCode.useMutation();
  const unlinkMutation = trpc.farmDesk.unlinkTelegram.useMutation();
  const linkStatusQuery = trpc.farmDesk.getLinkStatus.useQuery(
    undefined,
    {
      enabled: isAuthenticated && role === "Owner",
      refetchInterval: linkCode ? 2000 : false,
    }
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(desk));
    } catch (error) {
      console.error("Could not save Farm Desk demo data.", error);
      toast.error("The demo state could not be saved in this browser.");
    }
  }, [desk]);

  useEffect(() => {
    if (!imageFile) {
      setImageUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const shortages = useMemo(
    () => desk.supplies.filter((item) => shortageFor(item) > 0),
    [desk.supplies]
  );
  const orderTotal = shortages.reduce(
    (total, item) => total + shortageFor(item) * item.unitPrice,
    0
  );
  const canReviewTreatment = role === "Manager";
  const canApproveOrder = role === "Owner";
  const canEditStock = role !== "Worker";

  // ── Telegram polling ────────────────────────────────────────────────────────
  const pollStatusQuery = trpc.farmDesk.pollStatus.useQuery(
    { poId: telegramPoId ?? "" },
    { enabled: !!telegramPoId && telegramStatus === "sent", refetchInterval: 3000 }
  );

  useEffect(() => {
    if (!pollStatusQuery.data) return;
    const { status, decidedAt } = pollStatusQuery.data;
    if (status === "approved" || status === "rejected") {
      setTelegramStatus(status);
      setTelegramDecidedAt(decidedAt ?? null);
      // Reflect in the main desk state so UI buttons also update
      setDesk((current) => ({
        ...current,
        orderStatus: status,
        activity: [
          createActivity(
            "Owner" as Role,
            status === "approved" ? "Purchase order approved via Telegram" : "Purchase order rejected via Telegram",
            status === "approved"
              ? `Owner approved the PO draft on Telegram at ${decidedAt}. No order was sent; confirm with supplier to proceed.`
              : `Owner rejected the PO draft on Telegram at ${decidedAt}. No order will be placed.`
          ),
          ...current.activity,
        ],
      }));
      toast[status === "approved" ? "success" : "error"](
        status === "approved" ? "✅ Owner approved the PO on Telegram!" : "❌ Owner rejected the PO on Telegram."
      );
    }
  }, [pollStatusQuery.data]);  // ── Auto-clear link code once linking is confirmed ──────────────────────────
  useEffect(() => {
    if (linkStatusQuery.data?.linked && linkCode) {
      setLinkCode(null);
      toast.success("✅ Telegram linked! You can now receive PO approvals.");
    }
  }, [linkStatusQuery.data?.linked, linkCode]);



  const handleImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file for the synthetic crop-anomaly demo.");
      event.target.value = "";
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Choose an image smaller than 8 MB.");
      event.target.value = "";
      return;
    }
    setImageFile(file);
  };

  const runDiagnosis = async () => {
    if (role !== "Worker") {
      toast.error("Switch to the Worker role to submit a field photo.");
      return;
    }
    if (!selectedOwner) {
      toast.error("Please select an owner account before submitting.");
      return;
    }
    if (!imageFile) {
      toast.error("Upload a synthetic crop-anomaly photo first.");
      return;
    }
    setIsClassifying(true);
    try {
      const local = await detectDiseaseForPlant(imageFile, "rice");
      if (!local) throw new Error("The local crop image check returned no result.");

      let diagnosis = local.diseaseName;
      let confidence = local.confidence;
      let source = "On-device visual screening; manager confirmation required";
      let treatmentSteps = [
        "Inspect nearby plants and mark the affected area for follow-up.",
        "Verify this diagnosis against the farm's current rice-disease SOP.",
        "Check product labels and local guidance before any treatment is used.",
      ];
      let logDetail = `${diagnosis} suggested from uploaded paddy image (${Math.round(confidence * 100)}% local confidence).`;

      if (navigator.onLine) {
        try {
          const imageBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error("Could not read the selected image."));
            reader.onload = () => {
              if (typeof reader.result !== "string") {
                reject(new Error("Image conversion returned an invalid result."));
                return;
              }
              resolve(reader.result);
            };
            reader.readAsDataURL(imageFile);
          });
          const result = await analyzeMutation.mutateAsync({
            imageBase64,
            diseaseKey: local.diseaseKey,
            diseaseName: local.diseaseName,
            confidence: local.confidence,
            severity: local.severity,
            plantType: "rice",
            notes: "Farm Desk synthetic paddy-farm demo; manager review required.",
          });
          if (!result.success || !result.analysis) {
            throw new Error("AI analysis returned no structured diagnosis.");
          }
          diagnosis = result.analysis.confirmedDisease || diagnosis;
          treatmentSteps = [
            result.analysis.treatmentPlan.cultural,
            result.analysis.treatmentPlan.biological,
          ].filter((step) => Boolean(step?.trim()));
          source = "AI-assisted review; manager confirmation required";
          logDetail = `${diagnosis} suggested by AI-assisted analysis; crop-specific treatment reference retrieved; local visual screening confidence was ${Math.round(confidence * 100)}%.`;
        } catch (error) {
          console.warn("Remote diagnosis unavailable; retaining on-device result.", error);
          source = "On-device visual screening (AI service unavailable); manager confirmation required";
        }
      }

      setDesk((current) => ({
        ...current,
        reviewStatus: "needs-review",
        orderStatus: "not-created",
        diagnosis,
        confidence,
        diagnosisSource: source,
        treatmentSteps,
        treatmentNote: "",
        activity: [
          createActivity(role, "Crop photo submitted", `${imageFile.name} — Owner: ${selectedOwner?.name ?? "(none)"}`),
          createActivity("System", "Diagnosis suggested", logDetail),
          ...current.activity,
        ],
      }));
      setTab("workflow");
      toast.success("Screening complete. The case is ready for manager review.");
    } catch (error) {
      console.error("Farm Desk image analysis failed.", error);
      toast.error(error instanceof Error ? error.message : "Could not analyze this photo.");
    } finally {
      setIsClassifying(false);
    }
  };

  const decideTreatment = (approved: boolean) => {
    if (!canReviewTreatment) {
      toast.error("Only the Manager role can decide on the treatment plan.");
      return;
    }
    const nextStatus: ReviewStatus = approved ? "approved" : "rejected";
    setDesk((current) => ({
      ...current,
      reviewStatus: nextStatus,
      orderStatus: approved && shortages.length > 0 ? "pending" : "not-created",
      treatmentNote: approved ? "" : current.treatmentNote,
      activity: [
        createActivity(
          role,
          approved ? "Treatment plan confirmed" : "Treatment plan not approved",
          approved
            ? `Manager confirmed the proposed plan for follow-up; verify the crop-specific SOP and product label before use.${desk.treatmentNote ? ` Note: ${desk.treatmentNote}` : ""}`
            : `Manager did not approve the proposed plan. No purchase order was created.${desk.treatmentNote ? ` Note: ${desk.treatmentNote}` : ""}`
        ),
        ...(approved
          ? [createActivity(
            "System",
            "Stock check complete",
            shortages.length > 0
              ? `Mock inventory shows ${shortages.length} item(s) below the planned requirement; draft purchase order prepared for owner review.`
              : "Mock inventory covers the planned requirements; no supplier order is needed."
          )]
          : []),
        ...current.activity,
      ],
    }));
  };

  const decideOrder = (approved: boolean) => {
    if (!canApproveOrder) {
      toast.error("Only the Owner role can approve or reject the purchase order.");
      return;
    }
    if (desk.orderStatus !== "pending") {
      toast.error("There is no purchase order awaiting approval.");
      return;
    }
    const nextStatus: OrderStatus = approved ? "approved" : "rejected";
    setDesk((current) => ({
      ...current,
      orderStatus: nextStatus,
      activity: [
        createActivity(
          role,
          approved ? "Purchase order approved" : "Purchase order rejected",
          approved
            ? "Owner approved a draft only. No order was sent and no payment was made."
            : "Owner rejected the draft. No order was sent and no payment was made."
        ),
        ...current.activity,
      ],
    }));
  };

  const sendPOToTelegram = async () => {
    if (!farmId) {
      toast.error("You must be logged in to send a PO.");
      return;
    }
    if (shortages.length === 0) {
      toast.error("No stock shortages to send.");
      return;
    }
    // Prefer the worker-selected owner; fall back to manager's own linked account
    const recipientId = selectedOwner?.openId ?? farmId;
    const isRecipientLinked = selectedOwner
      ? ownersQuery.data?.find((o) => o.openId === recipientId)?.telegramLinked
      : linkStatusQuery.data?.linked;
    if (!isRecipientLinked) {
      toast.error(
        selectedOwner
          ? `Owner "${selectedOwner.name}" has not linked their Telegram yet.`
          : "The Owner must link their Telegram first (switch to Owner role)."
      );
      return;
    }
    setTelegramStatus("sending");
    try {
      const poId = `PO-${Date.now()}`;
      await sendPoMutation.mutateAsync({
        poId,
        farmId,
        targetFarmId: recipientId,
        items: shortages.map((item) => ({
          name: item.name,
          qty: shortageFor(item),
          unit: item.unit,
          unitPrice: item.unitPrice,
        })),
      });
      setTelegramPoId(poId);
      setTelegramStatus("sent");
      setTelegramDecidedAt(null);
      setDesk((current) => ({
        ...current,
        activity: [
          createActivity(
            role,
            "PO sent to Telegram",
            `Draft PO ${poId} dispatched to ${selectedOwner?.name ?? "Owner"} on Telegram for approval.`
          ),
          ...current.activity,
        ],
      }));
      toast.success(`📨 PO draft sent to ${selectedOwner?.name ?? "owner"}'s Telegram!`);
    } catch (err) {
      setTelegramStatus("idle");
      toast.error("Failed to send PO to Telegram. Check bot configuration.");
      console.error("Telegram sendPO error:", err);
    }
  };

  const updateStock = (item: SupplyItem) => {
    if (!canEditStock) {
      toast.error("Stock adjustments are available to Manager and Owner roles.");
      return;
    }
    const newAmount = Number(stockEdits[item.id]);
    if (!Number.isFinite(newAmount) || newAmount < 0 || !Number.isInteger(newAmount)) {
      toast.error("Enter a whole-number stock quantity of zero or more.");
      return;
    }
    setDesk((current) => ({
      ...current,
      supplies: current.supplies.map((entry) =>
        entry.id === item.id ? { ...entry, onHand: newAmount } : entry
      ),
      activity: [
        createActivity(role, "Stock updated", `${item.name}: ${item.onHand} → ${newAmount} ${item.unit}.`),
        ...current.activity,
      ],
    }));
    setStockEdits((current) => ({ ...current, [item.id]: "" }));
  };

  const makeOrderMessage = () => {
    const lines = shortages
      .map(
        (item) =>
          `• ${item.name}: ${shortageFor(item)} ${item.unit} (mock estimate RM ${(shortageFor(item) * item.unitPrice).toFixed(2)})`
      )
      .join("\n");
    return [
      "Hi Kampung Tani Co-op,",
      "Please prepare this draft restock request for our paddy farm:",
      lines || "No stock shortage is currently identified.",
      `Estimated demo total: RM ${orderTotal.toFixed(2)}`,
      "Please confirm availability and final pricing before we place any order.",
      "This message was prepared in the Farm Desk demo and has not been sent.",
    ].join("\n");
  };

  const copyOrderMessage = async () => {
    try {
      await navigator.clipboard.writeText(makeOrderMessage());
      toast.success("WhatsApp order template copied. Review it before sending.");
      setDesk((current) => ({
        ...current,
        activity: [
          createActivity(role, "WhatsApp template copied", "Draft copied to clipboard; it was not sent."),
          ...current.activity,
        ],
      }));
    } catch (error) {
      console.error("Could not copy the WhatsApp order template.", error);
      toast.error("Could not copy the template. Check clipboard permissions.");
    }
  };

  const resetDemo = () => {
    setDesk({
      ...INITIAL_STATE,
      supplies: INITIAL_SUPPLIES.map((item) => ({ ...item })),
      activity: [
        createActivity(role, "Demo reset", "Synthetic paddy-farm stock and workflow were restored."),
      ],
    });
    setImageFile(null);
    setStockEdits({});
    setSelectedOwner(null);
    setOwnerSearch("");
    setTab("workflow");
    toast.success("Demo reset to the synthetic starting data.");
  };

  const setTreatmentNote = (value: string) => {
    setDesk((current) => ({ ...current, treatmentNote: value }));
  };

  return (
    <div className="min-h-screen bg-[#f1f7f2] text-slate-900 pb-16">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8">
        <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 p-6 text-white shadow-lg md:p-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                <Wheat className="h-4 w-4" /> FARM DESK · PADDY FARM TEMPLATE
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
                Field response, with people in control.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-emerald-50/85 md:text-base">
                Turn a crop-anomaly photo into a reviewed treatment plan, a stock check, and an owner-approved supplier order draft.
                Synthetic demo data only.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Label htmlFor="role-switch" className="text-xs font-bold uppercase tracking-wide text-emerald-100">
                Demo role
              </Label>
              <select
                id="role-switch"
                aria-label="Choose simulated demo role"
                className="h-10 rounded-xl border border-white/20 bg-emerald-950/50 px-3 text-sm font-semibold text-white outline-none focus:ring-2 focus:ring-emerald-300"
                value={role}
                onChange={(event) => setRole(event.target.value as Role)}
              >
                <option className="text-slate-900" value="Worker">Worker</option>
                <option className="text-slate-900" value="Manager">Manager</option>
                <option className="text-slate-900" value="Owner">Owner</option>
              </select>
              <Button
                type="button"
                variant="outline"
                className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                onClick={resetDemo}
              >
                <RotateCcw /> Reset demo
              </Button>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-white/10 px-3 py-1.5"><Users className="mr-1 inline h-3.5 w-3.5" /> Worker uploads</span>
            <span className="rounded-full bg-white/10 px-3 py-1.5"><ClipboardCheck className="mr-1 inline h-3.5 w-3.5" /> Manager reviews treatment</span>
            <span className="rounded-full bg-white/10 px-3 py-1.5"><ShieldCheck className="mr-1 inline h-3.5 w-3.5" /> Owner approves purchase</span>
            <span className="rounded-full bg-white/10 px-3 py-1.5"><Activity className="mr-1 inline h-3.5 w-3.5" /> Every action logged</span>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          <ProgressCard step="1" title="Photo & diagnosis" state={desk.reviewStatus === "not-started" ? "Current step" : "Submitted"} active={desk.reviewStatus === "not-started"} />
          <ProgressCard step="2" title="Manager treatment decision" state={statusLabel(desk.reviewStatus)} active={desk.reviewStatus === "needs-review"} />
          <ProgressCard step="3" title="Owner purchase approval" state={statusLabel(desk.orderStatus)} active={desk.orderStatus === "pending"} />
        </section>

        <nav className="flex flex-wrap gap-2 rounded-2xl border border-emerald-100 bg-white p-2 shadow-sm" aria-label="Farm Desk sections">
          {([
            ["workflow", "Workflow", ClipboardCheck],
            ["supplies", "Stock & fertiliser", Package],
            ["activity", `Activity log (${desk.activity.length})`, Activity],
          ] as const).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${tab === value ? "bg-emerald-700 text-white" : "text-slate-600 hover:bg-emerald-50"}`}
              aria-current={tab === value ? "page" : undefined}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </nav>

        {tab === "workflow" && (
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
            <div className="space-y-5">
              <Card className="border-emerald-100 shadow-sm">
                <CardContent className="space-y-4 p-5 md:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <SectionHeading icon={Camera} title="1. Worker submits a crop photo" subtitle="Upload a synthetic paddy anomaly image to start the demo workflow." />
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Worker step</span>
                  </div>
                  {desk.reviewStatus === "not-started" ? (
                    <>
                      {/* ── Owner selector (Worker must pick before submitting) ── */}
                      <div className="space-y-2">
                        <Label htmlFor="owner-search" className="text-sm font-bold text-slate-700">
                          Select owner account <span className="text-rose-500">*</span>
                        </Label>
                        {selectedOwner ? (
                          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
                            <div>
                              <p className="text-sm font-bold text-emerald-900">{selectedOwner.name}</p>
                              <p className="text-xs text-emerald-700">Telegram linked ✓</p>
                            </div>
                            <button
                              type="button"
                              className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-emerald-100"
                              onClick={() => { setSelectedOwner(null); setOwnerSearch(""); }}
                              disabled={role !== "Worker"}
                            >
                              Change
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="relative">
                              <input
                                id="owner-search"
                                type="text"
                                placeholder="Search owner name…"
                                value={ownerSearch}
                                onChange={(e) => setOwnerSearch(e.target.value)}
                                disabled={role !== "Worker"}
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
                              />
                            </div>
                            {ownersQuery.isLoading && (
                              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                                <Loader2 className="h-3 w-3 animate-spin" /> Loading owners…
                              </p>
                            )}
                            {ownersQuery.data && (() => {
                              const filtered = ownersQuery.data.filter(
                                (o) =>
                                  ownerSearch.trim() === "" ||
                                  o.name.toLowerCase().includes(ownerSearch.toLowerCase()) ||
                                  o.email.toLowerCase().includes(ownerSearch.toLowerCase())
                              );
                              return filtered.length > 0 ? (
                                <ul className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-md">
                                  {filtered.map((owner) => (
                                    <li key={owner.openId}>
                                      <button
                                        type="button"
                                        className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-emerald-50 disabled:opacity-50"
                                        disabled={role !== "Worker"}
                                        onClick={() => {
                                          setSelectedOwner({ openId: owner.openId, name: owner.name });
                                          setOwnerSearch(owner.name);
                                        }}
                                      >
                                        <span className="text-sm font-semibold text-slate-800">{owner.name}</span>
                                        {owner.telegramLinked
                                          ? <span className="text-xs font-semibold text-emerald-600">✓ Telegram linked</span>
                                          : <span className="text-xs font-semibold text-amber-500">⚠ No Telegram</span>}
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              ) : ownerSearch.trim() !== "" ? (
                                <p className="rounded-xl border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">
                                  No owner matching "{ownerSearch}".
                                </p>
                              ) : (
                                <p className="rounded-xl border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">
                                  No registered accounts found.
                                </p>
                              );
                            })()}
                          </>
                        )}
                      </div>

                      <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/60 p-5 text-center hover:bg-emerald-50">
                        <Upload className="mb-2 h-7 w-7 text-emerald-700" />
                        <span className="text-sm font-bold text-emerald-950">{imageFile ? imageFile.name : "Choose synthetic crop-anomaly photo"}</span>
                        <span className="mt-1 text-xs text-slate-500">PNG, JPG or WebP · max 8 MB · image stays in this browser</span>
                        <input className="sr-only" type="file" accept="image/*" onChange={handleImage} disabled={role !== "Worker" || isClassifying} />
                      </label>
                      {imageUrl && (
                        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <img src={imageUrl} alt="Selected synthetic crop anomaly" className="h-20 w-20 rounded-lg object-cover" />
                          <div className="text-sm">
                            <p className="font-semibold">{imageFile?.name}</p>
                            <p className="text-xs text-slate-500">Preview is temporary and is not saved with demo data.</p>
                          </div>
                        </div>
                      )}
                      <Button onClick={runDiagnosis} disabled={!imageFile || !selectedOwner || role !== "Worker" || isClassifying} className="w-full sm:w-auto">
                        <Leaf /> {isClassifying ? "Checking image…" : "Run crop screening"} <ArrowRight />
                      </Button>
                      {!selectedOwner && role === "Worker" && <p className="text-xs font-medium text-rose-600">Select an owner account above before submitting.</p>}
                      {role !== "Worker" && <p className="text-xs font-medium text-amber-700">Switch to Worker to submit the field photo.</p>}
                    </>
                  ) : (
                    <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                      <div>
                        <p className="font-bold text-emerald-950">Field photo submitted</p>
                        <p className="mt-1 text-sm text-emerald-900">{desk.diagnosis} · {desk.confidence === null ? "Confidence unavailable" : `${Math.round(desk.confidence * 100)}% screening confidence`}</p>
                        <p className="mt-1 text-xs text-emerald-800">{desk.diagnosisSource}</p>
                      </div>
                    </div>
                  )}
                  <p className="text-xs leading-relaxed text-slate-500">
                    Screening is advisory, not a confirmed diagnosis. The AI-assisted endpoint is tried when online; if it is unavailable, the local visual screen is shown as a fallback. The manager must verify the crop and applicable SOP.
                  </p>
                </CardContent>
              </Card>

              {desk.reviewStatus !== "not-started" && (
                <Card className="border-amber-100 shadow-sm">
                  <CardContent className="space-y-4 p-5 md:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <SectionHeading icon={ClipboardCheck} title="2. Manager reviews the treatment plan" subtitle="Confirm or decline the suggested plan before any stock order is prepared." />
                      <StatusPill status={desk.reviewStatus} />
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Crop treatment reference · draft only</p>
                      <ul className="mt-2 space-y-2 text-sm text-slate-700">
                        {desk.treatmentSteps.map((step) => (
                          <li key={step} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-700" /> {step}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manager-note">Manager note (optional)</Label>
                      <Textarea
                        id="manager-note"
                        value={desk.treatmentNote}
                        onChange={(event) => setTreatmentNote(event.target.value)}
                        placeholder="Record why the plan is approved or what needs checking…"
                        disabled={!canReviewTreatment || desk.reviewStatus !== "needs-review"}
                      />
                    </div>
                    {desk.reviewStatus === "needs-review" ? (
                      canReviewTreatment ? (
                        <div className="flex flex-wrap gap-2">
                          <Button onClick={() => decideTreatment(true)}><CheckCircle2 /> Confirm treatment plan</Button>
                          <Button variant="outline" onClick={() => decideTreatment(false)}><XCircle /> Do not approve</Button>
                        </div>
                      ) : (
                        <p className="rounded-lg bg-amber-50 p-3 text-sm font-medium text-amber-900">Awaiting Manager. Switch the simulated role to Manager to confirm or decline this plan.</p>
                      )
                    ) : (
                      <p className={`rounded-lg p-3 text-sm font-bold ${desk.reviewStatus === "approved" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
                        {desk.reviewStatus === "approved" ? "Manager confirmed the plan. A stock check is ready for owner review." : "Plan not approved. No supplier order was created."}
                        {desk.treatmentNote ? ` Note: ${desk.treatmentNote}` : ""}
                      </p>
                    )}
                    <p className="text-xs text-slate-500">Demo guidance is not a pesticide prescription. No chemical rate is generated by this prototype.</p>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-5">
              {desk.reviewStatus === "approved" && (
                <Card className="border-sky-100 shadow-sm">
                  <CardContent className="space-y-4 p-5 md:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <SectionHeading icon={ShoppingCart} title="3. Stock check & owner decision" subtitle="Mock stock needs are calculated from this demo field plan." />
                      <StatusPill status={desk.orderStatus} />
                    </div>
                    {shortages.length > 0 ? (
                      <>
                        <div className="overflow-hidden rounded-xl border border-slate-200">
                          <div className="grid grid-cols-[1fr_auto_auto] gap-3 bg-slate-50 px-3 py-2 text-[11px] font-bold uppercase text-slate-500">
                            <span>Item</span><span>Gap</span><span>Est. cost</span>
                          </div>
                          {shortages.map((item) => (
                            <div key={item.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-t px-3 py-3 text-sm">
                              <div><p className="font-bold">{item.name}</p><p className="text-xs text-slate-500">{item.onHand} on hand · {item.needed} planned</p></div>
                              <span className="font-bold text-amber-700">{shortageFor(item)} {item.unit}</span>
                              <span className="font-semibold">RM {(shortageFor(item) * item.unitPrice).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
                          <span className="font-semibold text-slate-600">Estimated demo total</span>
                          <span className="text-lg font-black">RM {orderTotal.toFixed(2)}</span>
                        </div>
                        {desk.orderStatus === "pending" ? (
                          canApproveOrder ? (
                            <div className="space-y-3">
                              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                                <strong>Owner approval required.</strong> Approval only records a demo decision; no order is sent and no payment is made.
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button onClick={() => decideOrder(true)}><ShieldCheck /> Approve draft PO</Button>
                                <Button variant="outline" onClick={() => decideOrder(false)}><X /> Reject draft</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <p className="rounded-lg bg-amber-50 p-3 text-sm font-medium text-amber-900">Awaiting Owner approval. Switch to Owner to approve or reject the draft.</p>
                              {/* ── Telegram PO Panel ───────────────────────────────────── */}
                              {telegramStatus === "idle" && (
                                <div className="rounded-xl border border-sky-100 bg-sky-50 p-4 space-y-3">
                                  <p className="text-sm font-semibold text-sky-900">📱 Send PO to Owner via Telegram
                                    {selectedOwner && (
                                      <span className="ml-2 rounded-full bg-sky-200 px-2 py-0.5 text-xs font-bold text-sky-900">
                                        → {selectedOwner.name}
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-xs text-sky-700">The owner will receive an interactive Telegram message with ✅ Approve and ❌ Reject buttons. The Farm Desk will update automatically when a decision is made.</p>
                                  <Button
                                    size="sm"
                                    className="bg-sky-600 hover:bg-sky-700 text-white gap-2"
                                    onClick={sendPOToTelegram}
                                  >
                                    <Send className="h-4 w-4" /> Send PO to{selectedOwner ? ` ${selectedOwner.name}` : " Telegram"}
                                  </Button>
                                </div>
                              )}
                              {telegramStatus === "sending" && (
                                <div className="flex items-center gap-2 rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-700">
                                  <Loader2 className="h-4 w-4 animate-spin" /> Sending PO to Telegram…
                                </div>
                              )}
                              {telegramStatus === "sent" && (
                                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 space-y-1">
                                  <p className="text-sm font-semibold text-emerald-900">📨 PO sent — awaiting owner decision on Telegram</p>
                                  <p className="text-xs text-emerald-700 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Polling for response every 3 seconds…</p>
                                </div>
                              )}
                              {telegramStatus === "approved" && (
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-1">
                                  <p className="text-sm font-bold text-emerald-800">✅ Owner approved the PO on Telegram</p>
                                  {telegramDecidedAt && <p className="text-xs text-emerald-600">Decided at {telegramDecidedAt}</p>}
                                </div>
                              )}
                              {telegramStatus === "rejected" && (
                                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-1">
                                  <p className="text-sm font-bold text-rose-800">❌ Owner rejected the PO on Telegram</p>
                                  {telegramDecidedAt && <p className="text-xs text-rose-600">Decided at {telegramDecidedAt}</p>}
                                </div>
                              )}
                            </div>
                          )
                        ) : (
                          <p className={`rounded-lg p-3 text-sm font-bold ${desk.orderStatus === "approved" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
                            {desk.orderStatus === "approved" ? "Owner approved the draft. Please proceed to send the draft to the supplier." : "Owner rejected the draft. Please do not send the draft to the supplier."}
                          </p>
                        )}
                        <div className="space-y-2 border-t pt-4">
                          <div className="flex items-center gap-2 text-sm font-bold"><MessageCircle className="h-4 w-4 text-emerald-700" /> WhatsApp ordering template</div>
                          <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-3 text-xs leading-relaxed text-emerald-50">{makeOrderMessage()}</pre>
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={copyOrderMessage}><Copy /> Copy message</Button>
                            <a
                              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-700 px-3 text-xs font-semibold text-white hover:bg-emerald-800"
                              href={`https://wa.me/?text=${encodeURIComponent(makeOrderMessage())}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => setDesk((current) => ({
                                ...current,
                                activity: [createActivity(role, "WhatsApp draft opened", "Prepared message opened in WhatsApp; user must review and send it."), ...current.activity],
                              }))}
                            >
                              <MessageCircle className="h-4 w-4" /> Open WhatsApp
                            </a>
                          </div>
                          <p className="text-xs text-slate-500">Opening WhatsApp does not send the message automatically. Review supplier details and pricing before sending.</p>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                        <CheckCircle2 className="mr-2 inline h-4 w-4" /> No shortages against the mock field plan. No purchase order is needed.
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              <Card className="border-emerald-100 shadow-sm">
                <CardContent className="space-y-3 p-5">
                  <SectionHeading icon={ShieldCheck} title="Human control points" subtitle="Actions are simulated by role for this demo, not production access control." />
                  <RoleRow roleName="Worker" active={role === "Worker"} detail="Upload field photo" />
                  <RoleRow roleName="Manager" active={role === "Manager"} detail="Review and decide on treatment plan" />
                  <RoleRow roleName="Owner" active={role === "Owner"} detail="Approve or reject supplier PO draft" />
                </CardContent>
              </Card>

              {/* ── Owner Telegram Linking Card ─────────────────────────────── */}
              {role === "Owner" && (
                <Card className="border-sky-100 shadow-sm">
                  <CardContent className="space-y-4 p-5">
                    <SectionHeading
                      icon={Send}
                      title="Link Owner Telegram"
                      subtitle="Link your Telegram account so you can approve or reject PO drafts directly from Telegram."
                    />
                    {!isAuthenticated ? (
                      /* ── Not logged in ── */
                      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                        <div>
                          <p className="text-sm font-semibold text-amber-900">Login required</p>
                          <p className="text-xs text-amber-700 mt-0.5">
                            Only registered AgriGuard accounts can link Telegram. Please{" "}
                            <a href="/profile" className="underline font-medium">sign in or create an account</a>{" "}
                            first.
                          </p>
                        </div>
                      </div>
                    ) : linkStatusQuery.data?.linked && !linkCode ? (
                      /* ── Already linked ── */
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm font-semibold text-emerald-800">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          Telegram linked! PO drafts will be sent to your Telegram for approval.
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-rose-600 border-rose-200 hover:bg-rose-50"
                          onClick={async () => {
                            await unlinkMutation.mutateAsync();
                            setTelegramStatus("idle");
                            setTelegramPoId(null);
                            toast.success("Telegram unlinked. You can link a different account.");
                          }}
                        >
                          <X className="h-3.5 w-3.5 mr-1" /> Unlink Telegram
                        </Button>
                      </div>
                    ) : linkCode ? (
                      /* ── Code shown, waiting for user to send /link ── */
                      <div className="space-y-3">
                        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 space-y-2">
                          <p className="text-sm font-semibold text-sky-900">Step 1 — Open <strong>@AgriGuard_Farm_bot</strong> on Telegram</p>
                          <p className="text-sm font-semibold text-sky-900">Step 2 — Send this command:</p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-lg font-bold tracking-widest text-emerald-300 text-center">
                              /link {linkCode}
                            </code>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                await navigator.clipboard.writeText(`/link ${linkCode}`);
                                setLinkCodeCopied(true);
                                setTimeout(() => setLinkCodeCopied(false), 2000);
                              }}
                            >
                              {linkCodeCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                          <p className="text-xs text-sky-600 flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" /> Waiting for you to send the command…
                          </p>
                          <p className="text-xs text-slate-500">
                            💡 This code is permanent — it will always be the same for your account.
                          </p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => setLinkCode(null)}>Cancel</Button>
                      </div>
                    ) : (
                      /* ── Not yet linked ── */
                      <div className="space-y-3">
                        <p className="text-sm text-slate-600">
                          Generate your personal link code, then send it to <strong>@AgriGuard_Farm_bot</strong> on Telegram.
                          Your code is always the same — <em>one account, one code</em>.
                        </p>
                        <Button
                          size="sm"
                          className="bg-sky-600 hover:bg-sky-700 text-white gap-2"
                          onClick={async () => {
                            const result = await generateLinkCodeMutation.mutateAsync();
                            setLinkCode(result.code);
                          }}
                          disabled={generateLinkCodeMutation.isPending}
                        >
                          {generateLinkCodeMutation.isPending
                            ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                            : <><Send className="h-4 w-4" /> Get My Link Code</>}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {tab === "supplies" && (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <MetricCard icon={Package} label="Tracked stock items" value={`${desk.supplies.length}`} detail="Synthetic inventory" />
              <MetricCard icon={AlertTriangle} label="Below planned needs" value={`${shortages.length}`} detail="Items to review before ordering" warning={shortages.length > 0} />
            </div>
            <Card className="border-emerald-100 shadow-sm">
              <CardContent className="p-5 md:p-6">
                <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                  <SectionHeading icon={Sprout} title="Stock & fertiliser management" subtitle="Review on-hand stock, planned needs, reorder thresholds, and synthetic supplier estimates." />
                  <span className="w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">All quantities and prices are mock data</span>
                </div>
                <div className="space-y-3">
                  {desk.supplies.map((item) => {
                    const gap = shortageFor(item);
                    return (
                      <div key={item.id} className="grid gap-4 rounded-2xl border border-slate-200 p-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold">{item.name}</h3>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${item.kind === "Fertiliser" ? "bg-lime-100 text-lime-800" : item.kind === "Treatment stock" ? "bg-violet-100 text-violet-800" : "bg-slate-100 text-slate-700"}`}>{item.kind}</span>
                            {gap > 0 && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">Short by {gap}</span>}
                          </div>
                          <p className="mt-1 text-sm text-slate-600">
                            <strong>{item.onHand} {item.unit}</strong> on hand · {item.needed} planned for field work · reorder threshold {item.reorderAt} · {item.supplier}
                          </p>
                          {item.kind === "Fertiliser" && <p className="mt-1 text-xs text-slate-500">Fertiliser quantity is a synthetic planning assumption; confirm the farm plan and product label before use.</p>}
                        </div>
                        <div className="text-sm font-semibold text-slate-600">RM {item.unitPrice.toFixed(2)} / {item.unit}</div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Label className="sr-only" htmlFor={`stock-${item.id}`}>New {item.name} stock count</Label>
                          <Input
                            id={`stock-${item.id}`}
                            type="number"
                            min="0"
                            step="1"
                            value={stockEdits[item.id] ?? ""}
                            onChange={(event) => setStockEdits((current) => ({ ...current, [item.id]: event.target.value }))}
                            placeholder={`${item.onHand}`}
                            disabled={!canEditStock}
                            className="w-24"
                          />
                          <Button size="sm" variant="outline" disabled={!canEditStock || !stockEdits[item.id]} onClick={() => updateStock(item)}>
                            Update count
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {!canEditStock && <p className="mt-3 text-xs font-medium text-amber-700">Switch to Manager or Owner to record an inventory count. Each update is added to the activity log.</p>}
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "activity" && (
          <Card className="border-emerald-100 shadow-sm">
            <CardContent className="p-5 md:p-6">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <SectionHeading icon={Activity} title="Activity log" subtitle="A local demo record of decisions and actions, newest first." />
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{desk.activity.length} entries</span>
              </div>
              {desk.activity.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                  <Activity className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-2 font-bold text-slate-700">No actions recorded yet</p>
                  <p className="mt-1 text-sm text-slate-500">Upload a synthetic field photo to begin the approval journey.</p>
                </div>
              ) : (
                <ol className="space-y-0">
                  {desk.activity.map((entry, index) => (
                    <li key={entry.id} className="relative flex gap-4 pb-5 last:pb-0">
                      {index < desk.activity.length - 1 && <span className="absolute left-[15px] top-8 h-full w-px bg-emerald-100" />}
                      <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${entry.actor === "System" ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-800"}`}>
                        {entry.actor === "System" ? <Activity className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0 flex-1 border-b border-slate-100 pb-4 last:border-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-bold">{entry.action}</p>
                          <time className="text-xs text-slate-500">{formatDate(entry.at)}</time>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{entry.detail}</p>
                        <p className="mt-1 text-xs font-semibold text-emerald-800">{entry.actor}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              <p className="mt-5 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                This is a local browser activity record for a prototype. It is not a tamper-proof audit log, and role selection is simulated rather than secure authorization.
              </p>
            </CardContent>
          </Card>
        )}

        <footer className="flex flex-col justify-between gap-2 rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center">
          <span><strong className="text-slate-700">Orbyte-ready concept:</strong> inventory, field workflow, and supplier messaging as reusable connected business modules.</span>
          <span>Prototype only · synthetic farm data · no real purchases or treatment advice</span>
        </footer>
      </div>
    </div>
  );
}

function ProgressCard({ step, title, state, active }: { step: string; title: string; state: string; active: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${active ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black ${active ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-600"}`}>{step}</span>
        <div className="min-w-0"><p className="text-sm font-bold">{title}</p><p className="mt-0.5 text-xs text-slate-500">{state}</p></div>
      </div>
    </div>
  );
}

function SectionHeading({ icon: Icon, title, subtitle }: { icon: typeof Leaf; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800"><Icon className="h-5 w-5" /></span>
      <div><h2 className="text-lg font-black text-slate-900">{title}</h2><p className="mt-1 text-sm leading-relaxed text-slate-600">{subtitle}</p></div>
    </div>
  );
}

function StatusPill({ status }: { status: ReviewStatus | OrderStatus }) {
  const style = status === "approved"
    ? "bg-emerald-100 text-emerald-800"
    : status === "rejected"
      ? "bg-rose-100 text-rose-800"
      : status === "pending" || status === "needs-review"
        ? "bg-amber-100 text-amber-900"
        : "bg-slate-100 text-slate-600";
  return <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${style}`}>{statusLabel(status)}</span>;
}

function RoleRow({ roleName, active, detail }: { roleName: Role; active: boolean; detail: string }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${active ? "border-emerald-300 bg-emerald-50" : "border-slate-100 bg-white"}`}>
      <div><p className="text-sm font-bold">{roleName}</p><p className="text-xs text-slate-500">{detail}</p></div>
      {active && <span className="rounded-full bg-emerald-700 px-2.5 py-1 text-[10px] font-bold uppercase text-white">Active demo role</span>}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, detail, warning = false }: { icon: typeof Leaf; label: string; value: string; detail: string; warning?: boolean }) {
  return (
    <Card className="border-emerald-100 shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${warning ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}><Icon className="h-6 w-6" /></span>
        <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p><p className="text-xs text-slate-500">{detail}</p></div>
      </CardContent>
    </Card>
  );
}
