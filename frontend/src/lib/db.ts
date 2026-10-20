import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "rice-scan-db";
const DB_VERSION = 1;
const STORE = "scans";

export interface LLMAnalysis {
  confirmedDisease: string;
  confirmedDiseaseKey: string;
  confirmedSeverity: string;
  confidenceAdjustment: string;
  symptoms: string[];
  immediateActions: string[];
  treatmentPlan: {
    chemical: string;
    biological: string;
    cultural: string;
  };
  preventionTips: string[];
  yieldImpact: string;
  spreadRisk: string;
  urgency: string;
  additionalNotes: string;
}

export interface LocalScan {
  localId: string;
  imageDataUrl?: string;
  imageFile?: Blob;
  diseaseName: string | null;
  diseaseKey: string | null;
  confidence: number | null;
  severity: "healthy" | "mild" | "moderate" | "severe" | null;
  plantType?: string; // e.g., "rice", "corn", "tomato"
  cropVariety?: string;
  fieldId?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  synced: boolean;
  scannedAt: number;
  serverId?: number;
  llmAnalysis?: LLMAnalysis;
  aiPending?: boolean;
  aiError?: string;
}

let _db: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "localId" });
        store.createIndex("scannedAt", "scannedAt");
        store.createIndex("synced", "synced");
      }
    },
  });
  return _db;
}

export async function saveScan(scan: LocalScan): Promise<void> {
  const db = await getDB();
  await db.put(STORE, scan);
}

export async function getScan(localId: string): Promise<LocalScan | undefined> {
  const db = await getDB();
  return db.get(STORE, localId);
}

export async function getLocalScans(limit = 50): Promise<LocalScan[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex(STORE, "scannedAt");
  return all.reverse().slice(0, limit);
}

export async function getUnsyncedScans(): Promise<LocalScan[]> {
  const db = await getDB();
  return db.getAllFromIndex(STORE, "synced", IDBKeyRange.only(false));
}

export async function markSynced(
  localId: string,
  serverId: number
): Promise<void> {
  const db = await getDB();
  const scan = await db.get(STORE, localId);
  if (scan) {
    await db.put(STORE, { ...scan, synced: true, serverId });
  }
}

export async function deleteScan(localId: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE, localId);
}

export function generateLocalId(): string {
  return `scan_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// Alias for backward compatibility
export const getScanByLocalId = getScan;
