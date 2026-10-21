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
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900 pb-16">
      {/* ── Top Header Strip ── */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                  <Leaf className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  AgriGuard Scanner History
                </span>
              </div>
              <h1 className="mt-1.5 text-2xl md:text-3xl font-black text-slate-900">
                Diagnosis Records & Timeline
              </h1>
              <p className="mt-1 text-xs md:text-sm text-slate-500">
                Review past field captures, neural predictions, and synchronize local offline records with cloud intelligence.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link href="/scan">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9">
                  <Camera className="mr-1.5 h-3.5 w-3.5" /> New Capture
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={syncing}
                className={cn(
                  "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 h-9 text-xs font-semibold",
                  unsyncedCount > 0 && "border-amber-300 bg-amber-50 text-amber-800"
                )}
              >
                {syncing ? (
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : unsyncedCount > 0 ? (
                  <CloudOff className="mr-1.5 h-3.5 w-3.5 text-amber-600" />
                ) : (
                  <Cloud className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                )}
                {unsyncedCount > 0 ? `Sync (${unsyncedCount})` : "All Synced"}
              </Button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <ScannerFamilyNav active="history" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-5 px-4 py-6">
        {/* ── Summary KPI Strip ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Records</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{scans.length}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Captures logged</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Cloud Synced</p>
            <p className="mt-1 text-2xl font-black text-emerald-800">{scans.length - unsyncedCount}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Secured on server</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Pending Sync</p>
            <p className="mt-1 text-2xl font-black text-amber-700">{unsyncedCount}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{unsyncedCount > 0 ? "Ready to push" : "Up to date"}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Storage Mode</p>
            <p className="mt-1 text-lg font-bold text-slate-800">IndexedDB</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Local Edge + Cloud</p>
          </div>
        </div>

        {/* ── Search & Filter Controls ── */}
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardContent className="space-y-3 p-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search scans by disease name, crop variety, field note..."
                className="pl-10 bg-slate-50 border-slate-200 text-sm h-10 rounded-xl"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-bold text-slate-400 mr-1 uppercase">Filter:</span>
              {["all", ...SEVERITY_ORDER].map((s) => (
                <button
                  key={s}
                  onClick={() => setSeverityFilter(s)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize transition-all",
                    severityFilter === s
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {s === "all" ? "All Severity" : s}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── History Records Grid ── */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center rounded-3xl border border-dashed border-slate-200 bg-white p-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Camera className="h-8 w-8" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-base">No scan records found</p>
              <p className="mt-1 text-xs text-slate-500 max-w-sm">
                {scans.length === 0 ? "You haven't scanned any crops yet. Take a photo of a plant leaf to start diagnosis." : "No records match your active search or severity filter."}
              </p>
            </div>
            {scans.length === 0 && (
              <Link href="/scan">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9">
                  <Camera className="mr-2 h-4 w-4" /> Start First Scan
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-3.5 md:grid-cols-2">
            {filtered.map((scan) => (
              <div key={scan.localId} className="group relative">
                <Link href={`/result/${scan.localId}`}>
                  <Card className="cursor-pointer border border-slate-200 bg-white transition-all hover:shadow-md hover:border-emerald-300">
                    <CardContent className="flex items-center gap-3.5 p-3.5">
                      {scan.imageDataUrl ? (
                        <img src={scan.imageDataUrl} alt="scan" className="h-16 w-16 shrink-0 rounded-xl object-cover border border-slate-100" />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                          <Camera className="h-6 w-6" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1 pr-6">
                        <div className="mb-1 flex items-center gap-2">
                          <p className="truncate text-sm font-bold text-slate-900">{scan.diseaseName ?? "Unknown Diagnosis"}</p>
                          {!scan.synced && (
                            <span title="Offline record">
                              <CloudOff className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          <span className={cn(
                            "rounded-md px-2 py-0.5 text-[11px] font-bold capitalize",
                            scan.severity === "healthy" ? "bg-emerald-50 text-emerald-700" :
                            scan.severity === "mild" ? "bg-amber-50 text-amber-700" :
                            scan.severity === "moderate" ? "bg-orange-50 text-orange-700" :
                            "bg-red-50 text-red-700"
                          )}>
                            {scan.severity ?? "healthy"}
                          </span>
                          {scan.fieldId && (
                            <span className="truncate text-[11px] text-slate-500 font-medium">Field: {scan.fieldId}</span>
                          )}
                          <span className="text-[11px] text-slate-400">
                            • {new Date(scan.scannedAt).toLocaleDateString()}
                          </span>
                        </div>
                        {scan.confidence != null && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${Math.round(scan.confidence * 100)}%` }}
                              />
                            </div>
                            <span className="shrink-0 text-[10px] font-bold text-slate-500">
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
                  className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-100"
                  title="Delete record"
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
