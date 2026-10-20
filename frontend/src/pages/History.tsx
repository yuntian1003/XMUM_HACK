import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { Camera, Search, Trash2, CloudOff, Cloud, RefreshCw, Leaf } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ScannerFamilyNav from "@/components/ScannerFamilyNav";
import { getLocalScans, deleteScan, type LocalScan } from "@/lib/db";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SEVERITY_ORDER = ["severe", "moderate", "mild", "healthy"];

export default function History() {
  const [scans, setScans] = useState<LocalScan[]>([]);
  const [filtered, setFiltered] = useState<LocalScan[]>([]);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const syncMutation = trpc.scans.sync.useMutation({
    onSuccess: (data) => {
      toast.success(`Synced ${data.synced} scan(s) to cloud.`);
      loadScans();
    },
    onError: () => toast.error("Sync failed. Check your connection."),
    onSettled: () => setSyncing(false),
  });

  const loadScans = useCallback(async () => {
    const all = await getLocalScans(200);
    setScans(all);
    setLoading(false);
  }, []);

  useEffect(() => { loadScans(); }, [loadScans]);

  useEffect(() => {
    let result = [...scans];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.diseaseName?.toLowerCase().includes(q) ||
          s.fieldId?.toLowerCase().includes(q) ||
          s.cropVariety?.toLowerCase().includes(q)
      );
    }
    if (severityFilter !== "all") {
      result = result.filter((s) => s.severity === severityFilter);
    }
    setFiltered(result);
  }, [scans, search, severityFilter]);

  const handleDelete = async (localId: string) => {
    await deleteScan(localId);
    setScans((prev) => prev.filter((s) => s.localId !== localId));
    toast.success("Capture deleted.");
  };

  const handleSync = async () => {
    const unsynced = scans.filter((s) => !s.synced);
    if (unsynced.length === 0) { toast.info("All scans are already synced."); return; }
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
      }))
    });
  };

  const unsyncedCount = scans.filter((s) => !s.synced).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <section className="relative overflow-hidden bg-gradient-to-br from-[#163a24] via-[#1a4731] to-[#2d7a4f]">
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "url('/images/hero-bg.png')", backgroundSize: "cover", backgroundPosition: "center" }}
        />
        <div className="absolute inset-0 bg-[#163a24]/55" />
        <div className="relative mx-auto max-w-5xl px-4 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.25em] text-emerald-50">
                <Leaf className="h-3.5 w-3.5" />
                Crop Scanner
              </span>
              <h1 className="mt-4 text-3xl font-bold leading-tight text-white md:text-4xl">
                Crop Scanner History
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-emerald-50/85 md:text-base">
                Every capture, diagnosis, and sync status stays inside one scanner timeline so the field workflow feels like its own app surface.
              </p>
              <div className="mt-5 flex flex-wrap gap-3 text-sm">
                <span className="rounded-full bg-white px-3 py-2 font-semibold text-emerald-900">
                  {scans.length} total scan{scans.length === 1 ? "" : "s"}
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2 font-semibold text-white">
                  {unsyncedCount} waiting to sync
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/scan">
                <Button className="bg-white text-emerald-900 hover:bg-emerald-50">
                  <Camera className="mr-2 h-4 w-4" /> New Capture
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={syncing}
                className={cn(
                  "border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white",
                  unsyncedCount > 0 && "border-amber-300/70 text-amber-50"
                )}
              >
                {syncing ? (
                  <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
                ) : unsyncedCount > 0 ? (
                  <CloudOff className="mr-1.5 h-4 w-4" />
                ) : (
                  <Cloud className="mr-1.5 h-4 w-4" />
                )}
                {unsyncedCount > 0 ? `Sync (${unsyncedCount})` : "Synced"}
              </Button>
            </div>
          </div>

          <div className="mt-4">
            <ScannerFamilyNav active="history" />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by disease, field, variety..."
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {["all", ...SEVERITY_ORDER].map((s) => (
                <button
                  key={s}
                  onClick={() => setSeverityFilter(s)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                    severityFilter === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:bg-muted"
                  )}
                >
                  {s === "all" ? "All" : s}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <Camera className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground">No scans found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {scans.length === 0 ? "Start capturing crop issues to build your scanner history." : "Try adjusting your search or severity filter."}
              </p>
            </div>
            {scans.length === 0 && (
              <Link href="/scan">
                <Button><Camera className="mr-2 h-4 w-4" /> Start scanning</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((scan) => (
              <div key={scan.localId} className="group relative">
                <Link href={`/result/${scan.localId}`}>
                  <Card className="cursor-pointer transition-shadow hover:shadow-md">
                    <CardContent className="flex items-center gap-3 p-3">
                      {scan.imageDataUrl ? (
                        <img src={scan.imageDataUrl} alt="scan" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted">
                          <Camera className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">{scan.diseaseName ?? "Unknown"}</p>
                          {!scan.synced && <CloudOff className="h-3 w-3 shrink-0 text-amber-500" />}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs severity-${scan.severity ?? "healthy"}`}>
                            {scan.severity ?? "healthy"}
                          </span>
                          {scan.fieldId && (
                            <span className="truncate text-xs text-muted-foreground">Field: {scan.fieldId}</span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(scan.scannedAt).toLocaleDateString()}
                          </span>
                        </div>
                        {scan.confidence != null && (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${Math.round(scan.confidence * 100)}%` }}
                              />
                            </div>
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {Math.round(scan.confidence * 100)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                <button
                  onClick={(e) => { e.preventDefault(); handleDelete(scan.localId); }}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/10 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
