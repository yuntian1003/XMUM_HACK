/**
 * PlantNet API Integration Service
 * Provides plant species identification and validation using PlantNet API
 */

// Use native fetch + native FormData (Node 18+). This is more compatible with PlantNet than the
// legacy `form-data` package when used with undici fetch.

const PLANTNET_BASE_URL = "https://my-api.plantnet.org/v2";
const PLANTNET_DISEASE_ENDPOINT =
  process.env.PLANTNET_DISEASE_ENDPOINT || "identify/health/all";

function getPlantNetApiKey(): string {
  return process.env.PLANTNET_API_KEY ?? "";
}

/**
 * PlantNet species identification result
 */
export interface PlantNetResult {
  bestMatch: string;
  confidence: number;
  scientificName: string;
  commonNames: string[];
  genus: string;
  family: string;
  organ: string;
  allResults: Array<{
    score: number;
    scientificName: string;
    commonNames: string[];
    genus: string;
    family: string;
  }>;
  remainingRequests: number;
}

export interface PlantNetDiseaseResult {
  diseaseName: string;
  confidence: number;
  scientificName?: string;
  allResults: Array<{
    score: number;
    diseaseName: string;
    scientificName?: string;
  }>;
}

type DiseaseCandidate = {
  diseaseName: string;
  scientificName?: string;
  score: number;
};

function extractDiseaseCandidate(entry: any): DiseaseCandidate | null {
  const score = typeof entry?.score === "number" ? entry.score : 0;
  const diseaseName =
    entry?.disease?.commonName ||
    entry?.disease?.name ||
    entry?.disease?.scientificNameWithoutAuthor ||
    entry?.species?.commonNames?.[0] ||
    entry?.species?.scientificNameWithoutAuthor ||
    entry?.name;
  const scientificName =
    entry?.disease?.scientificNameWithoutAuthor ||
    entry?.species?.scientificNameWithoutAuthor;

  if (!diseaseName || typeof diseaseName !== "string") {
    return null;
  }
  return { diseaseName, scientificName, score };
}

function toBlobCompatibleBytes(input: Buffer | Uint8Array): ArrayBuffer {
  const source = input instanceof Uint8Array ? input : new Uint8Array(input);
  const copied = new Uint8Array(new ArrayBuffer(source.byteLength));
  copied.set(source);
  return copied.buffer;
}

/**
 * Identify plant species from image using PlantNet API
 * @param imageBuffer - Image file buffer (JPG or PNG)
 * @param organ - Plant organ type: 'leaf', 'flower', 'fruit', 'bark', or 'auto'
 * @returns PlantNet identification result
 */
export async function identifyPlantSpecies(
  imageBuffer: Buffer | Uint8Array,
  organ: string = "auto"
): Promise<PlantNetResult | null> {
  const apiKey = getPlantNetApiKey();
  if (!apiKey) {
    console.warn("PlantNet API key not configured");
    return null;
  }

  try {
    const formData = new FormData();
    const bytes = toBlobCompatibleBytes(imageBuffer);
    formData.append(
      "images",
      new Blob([bytes], { type: "image/jpeg" }),
      "image.jpg"
    );
    formData.append("organs", organ);
    // PlantNet expects nb-results as a query parameter (it is rejected in payload).
    const nbResults = 5;

    const response = await fetch(
      `${PLANTNET_BASE_URL}/identify/all?api-key=${apiKey}&nb-results=${nbResults}`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error(
        `PlantNet API error: ${response.status} ${response.statusText}${
          errorText ? ` – ${errorText}` : ""
        }`
      );
      return null;
    }

    const data = (await response.json()) as any;

    if (!data.results || data.results.length === 0) {
      console.warn("No plant species identified by PlantNet");
      return null;
    }

    const topResult = data.results[0];
    const species = topResult.species;

    return {
      bestMatch: species.scientificName,
      confidence: topResult.score,
      scientificName: species.scientificNameWithoutAuthor,
      commonNames: species.commonNames || [],
      genus: species.genus?.scientificNameWithoutAuthor || "",
      family: species.family?.scientificNameWithoutAuthor || "",
      organ: data.predictedOrgans?.[0]?.organ || organ,
      allResults: data.results.map((r: any) => ({
        score: r.score,
        scientificName: r.species.scientificName,
        commonNames: r.species.commonNames || [],
        genus: r.species.genus?.scientificNameWithoutAuthor || "",
        family: r.species.family?.scientificNameWithoutAuthor || "",
      })),
      remainingRequests: data.remainingIdentificationRequests || 0,
    };
  } catch (error) {
    console.error("PlantNet identification error:", error);
    return null;
  }
}

/**
 * Try PlantNet disease identification endpoint(s).
 * The endpoint path can differ by plan/version, so we support override via
 * PLANTNET_DISEASE_ENDPOINT and fall back to likely defaults.
 */
export async function identifyPlantDisease(
  imageBuffer: Buffer | Uint8Array,
  organ: string = "auto"
): Promise<PlantNetDiseaseResult | null> {
  const apiKey = getPlantNetApiKey();
  if (!apiKey) {
    console.warn("PlantNet API key not configured");
    return null;
  }

  const endpointCandidates = [
    PLANTNET_DISEASE_ENDPOINT,
    "identify/health/all",
    "identify/disease/all",
  ];

  for (const endpointPath of endpointCandidates) {
    try {
      const formData = new FormData();
      const bytes = toBlobCompatibleBytes(imageBuffer);
      formData.append(
        "images",
        new Blob([bytes], { type: "image/jpeg" }),
        "image.jpg"
      );
      formData.append("organs", organ);
      // PlantNet expects nb-results as a query parameter (it is rejected in payload).
      const nbResults = 5;

      const response = await fetch(
        `${PLANTNET_BASE_URL}/${endpointPath}?api-key=${apiKey}&nb-results=${nbResults}`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        continue;
      }

      const data = (await response.json()) as any;
      if (!Array.isArray(data?.results) || data.results.length === 0) {
        continue;
      }

      const parsed = (data.results as unknown[])
        .map((entry) => extractDiseaseCandidate(entry))
        .filter((item): item is DiseaseCandidate => item !== null);

      if (parsed.length === 0) {
        continue;
      }

      const top = parsed[0];
      return {
        diseaseName: top.diseaseName,
        scientificName: top.scientificName,
        confidence: top.score,
        allResults: parsed.map((item) => ({
          score: item.score,
          diseaseName: item.diseaseName,
          scientificName: item.scientificName,
        })),
      };
    } catch {
      // try next candidate
    }
  }

  return null;
}

/**
 * Map PlantNet scientific name to our crop types
 * @param scientificName - Scientific name from PlantNet
 * @returns Mapped crop type from our 17 crops, or null if no match
 */
export function mapPlantNetToCropType(scientificName: string): string | null {
  const mappings: Record<string, string> = {
    // Rice
    "oryza sativa": "rice",
    oryza: "rice",

    // Cassava
    "manihot esculenta": "cassava",
    manihot: "cassava",

    // Corn
    "zea mays": "corn",
    zea: "corn",

    // Coconut
    "cocos nucifera": "coconut",
    cocos: "coconut",

    // Pineapple
    "ananas comosus": "pineapple",
    ananas: "pineapple",

    // Tomato
    "solanum lycopersicum": "tomato",
    lycopersicum: "tomato",

    // Cabbage
    "brassica oleracea": "cabbage",
    brassica: "cabbage",

    // Cacao
    "theobroma cacao": "cacao",
    theobroma: "cacao",

    // Coffee
    "coffea arabica": "coffee",
    "coffea robusta": "coffee",
    coffea: "coffee",

    // Rubber
    "hevea brasiliensis": "rubber",
    hevea: "rubber",

    // Sugarcane
    "saccharum officinarum": "sugarcane",
    saccharum: "sugarcane",

    // Banana
    "musa acuminata": "banana",
    "musa balbisiana": "banana",
    musa: "banana",

    // Mango
    "mangifera indica": "mango",
    mangifera: "mango",

    // Chili/Pepper
    "capsicum annuum": "chili",
    "capsicum frutescens": "chili",
    capsicum: "chili",

    // Soybean
    "glycine max": "soybean",
    glycine: "soybean",

    // Sweet Potato
    "ipomoea batatas": "sweet_potato",
    ipomoea: "sweet_potato",

    // Taro
    "colocasia esculenta": "taro",
    colocasia: "taro",
  };

  const lowerName = scientificName.toLowerCase();

  // Try exact match first
  if (mappings[lowerName]) {
    return mappings[lowerName];
  }

  // Try genus match (first word)
  const genus = lowerName.split(" ")[0];
  if (mappings[genus]) {
    return mappings[genus];
  }

  return null;
}

/**
 * Validate if image contains a plant (not human, object, etc.)
 * @param imageBuffer - Image file buffer
 * @returns true if plant detected, false otherwise
 */
export async function validatePlantImage(imageBuffer: Buffer): Promise<boolean> {
  const result = await identifyPlantSpecies(imageBuffer, "auto");
  return result !== null && result.confidence > 0.3;
}

/**
 * Get PlantNet API quota status
 * @returns Remaining identification requests
 */
export async function getQuotaStatus(): Promise<number | null> {
  const apiKey = getPlantNetApiKey();
  if (!apiKey) {
    console.warn("PlantNet API key not configured");
    return null;
  }

  try {
    const response = await fetch(`${PLANTNET_BASE_URL}/quota?api-key=${apiKey}`, {
      method: "GET",
    });

    if (!response.ok) {
      console.error(`PlantNet quota check error: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as any;
    return data.remainingIdentificationRequests || 0;
  } catch (error) {
    console.error("PlantNet quota check error:", error);
    return null;
  }
}
