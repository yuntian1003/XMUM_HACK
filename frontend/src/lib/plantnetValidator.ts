/**
 * PlantNet Validation Helper
 * Calls server-side PlantNet API to validate and identify plants
 */

export interface PlantNetValidationResult {
  isPlant: boolean;
  confidence: number;
  cropType: string | null;
  scientificName: string;
  commonNames: string[];
  organ: string;
  reason: string;
  allResults: Array<{
    score: number;
    scientificName: string;
    commonNames: string[];
  }>;
}

/**
 * Validate plant image using PlantNet API (server-side)
 * @param imageBase64 - Base64 encoded image
 * @returns PlantNet validation result
 */
export async function validatePlantWithPlantNet(
  imageBase64: string
): Promise<PlantNetValidationResult> {
  try {
    const response = await fetch("/api/trpc/system.validatePlantImage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageBase64,
      }),
    });

    if (!response.ok) {
      return {
        isPlant: false,
        confidence: 0,
        cropType: null,
        scientificName: "",
        commonNames: [],
        organ: "",
        reason: "PlantNet API error - please try again",
        allResults: [],
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("PlantNet validation error:", error);
    return {
      isPlant: false,
      confidence: 0,
      cropType: null,
      scientificName: "",
      commonNames: [],
      organ: "",
      reason: "PlantNet validation failed - check your connection",
      allResults: [],
    };
  }
}

/**
 * Format PlantNet result for display
 */
export function formatPlantNetResult(result: PlantNetValidationResult): string {
  if (!result.isPlant) {
    return result.reason;
  }

  const parts = [];
  if (result.cropType) {
    parts.push(`Crop: ${result.cropType}`);
  }
  if (result.scientificName) {
    parts.push(`Species: ${result.scientificName}`);
  }
  if (result.commonNames.length > 0) {
    parts.push(`Common names: ${result.commonNames.join(", ")}`);
  }
  if (result.organ) {
    parts.push(`Organ: ${result.organ}`);
  }
  parts.push(`Confidence: ${(result.confidence * 100).toFixed(0)}%`);

  return parts.join(" • ");
}
