/**
 * ASEAN Multi-Plant Disease Detector
 * Supports detection across 10 ASEAN crop types with 50+ diseases
 * Uses pixel color analysis for offline detection
 */

import { PLANT_TYPES, DiseaseInfo, getPlantDiseases } from "./aseanCropDiseases";

export interface DetectionResult {
  plantType: string;
  diseaseKey: string;
  diseaseName: string;
  confidence: number;
  severity: "healthy" | "mild" | "moderate" | "severe";
  pixelAnalysis: {
    green: number;
    brown: number;
    yellow: number;
    white: number;
    red: number;
    total: number;
  };
  diseaseInfo: DiseaseInfo;
}

/**
 * Classify pixel color
 */
function classifyPixel(r: number, g: number, b: number): "green" | "brown" | "yellow" | "white" | "red" | "other" {
  // Green: high green channel
  if (g > 80 && g > r * 1.2 && g > b * 1.1) {
    return "green";
  }

  // Brown: high red, low green and blue
  if (r > 100 && g < 100 && b < 80 && r > g * 1.3) {
    return "brown";
  }

  // Yellow: high red and green, low blue
  if (r > 150 && g > 130 && b < 80) {
    return "yellow";
  }

  // White: all channels high
  if (r > 180 && g > 180 && b > 160) {
    return "white";
  }

  // Red: high red, lower green and blue
  if (r > 150 && g < 150 && b < 150 && r > g && r > b) {
    return "red";
  }

  return "other";
}

/**
 * Analyze image pixels and extract color distribution
 */
function analyzePixels(imageData: ImageData): {
  green: number;
  brown: number;
  yellow: number;
  white: number;
  red: number;
  total: number;
} {
  const data = imageData.data;
  let green = 0,
    brown = 0,
    yellow = 0,
    white = 0,
    red = 0;

  // Process every 4th pixel for performance (skip alpha channel)
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const color = classifyPixel(r, g, b);

    if (color === "green") green++;
    else if (color === "brown") brown++;
    else if (color === "yellow") yellow++;
    else if (color === "white") white++;
    else if (color === "red") red++;
  }

  const total = green + brown + yellow + white + red;

  return {
    green: total > 0 ? green / total : 0,
    brown: total > 0 ? brown / total : 0,
    yellow: total > 0 ? yellow / total : 0,
    white: total > 0 ? white / total : 0,
    red: total > 0 ? red / total : 0,
    total,
  };
}

/**
 * Calculate confidence for a disease based on pixel signatures
 */
function calculateDiseaseConfidence(
  pixelAnalysis: ReturnType<typeof analyzePixels>,
  diseaseSignature: {
    green: number;
    brown: number;
    yellow: number;
    white: number;
    red: number;
  }
): number {
  // Calculate similarity using weighted sum
  const greenDiff = Math.abs(pixelAnalysis.green - diseaseSignature.green);
  const brownDiff = Math.abs(pixelAnalysis.brown - diseaseSignature.brown);
  const yellowDiff = Math.abs(pixelAnalysis.yellow - diseaseSignature.yellow);
  const whiteDiff = Math.abs(pixelAnalysis.white - diseaseSignature.white);
  const redDiff = Math.abs(pixelAnalysis.red - diseaseSignature.red);

  // Total difference (0 = perfect match, 5 = worst match)
  const totalDiff = greenDiff + brownDiff + yellowDiff + whiteDiff + redDiff;

  // Convert to confidence (0-1)
  // If totalDiff is 0, confidence is 1.0
  // If totalDiff is 5, confidence is 0.0
  const confidence = Math.max(0, 1 - totalDiff / 5);

  return confidence;
}

/**
 * Detect disease for a specific plant type
 */
export async function detectDiseaseForPlant(
  blob: Blob,
  plantId?: string
): Promise<DetectionResult | null> {
  try {
    // Load image
    const url = URL.createObjectURL(blob);
    const img = new Image();

    return new Promise((resolve) => {
      img.onload = () => {
        // Create canvas
        const canvas = document.createElement("canvas");
        const maxSize = 1024;
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));

        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }

        // Draw image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Get pixel data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixelAnalysis = analyzePixels(imageData);

        // Build candidate disease pools.
        // If plantId is provided, score only that crop.
        // Otherwise, score diseases across all supported crops.
        const candidatePlants = plantId ? [plantId] : Object.keys(PLANT_TYPES);

        // Calculate confidence for each disease candidate
        let bestMatch: DetectionResult | null = null;
        let highestConfidence = 0;

        for (const candidatePlantId of candidatePlants) {
          const diseases = getPlantDiseases(candidatePlantId);
          if (!diseases || Object.keys(diseases).length === 0) {
            continue;
          }

          for (const [diseaseKey, diseaseInfo] of Object.entries(diseases)) {
            const confidence = calculateDiseaseConfidence(pixelAnalysis, diseaseInfo.pixelSignatures);

            if (confidence > highestConfidence) {
              highestConfidence = confidence;

              // Determine severity
              let severity: "healthy" | "mild" | "moderate" | "severe" = "healthy";
              if (diseaseKey !== "healthy") {
                if (confidence < 0.5) severity = "mild";
                else if (confidence < 0.75) severity = "moderate";
                else severity = "severe";
              }

              bestMatch = {
                plantType: candidatePlantId,
                diseaseKey,
                diseaseName: diseaseInfo.diseaseName,
                confidence,
                severity,
                pixelAnalysis,
                diseaseInfo,
              };
            }
          }
        }

        // Clean up
        URL.revokeObjectURL(url);

        resolve(bestMatch);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };

      img.src = url;
    });
  } catch (error) {
    console.error("Disease detection error:", error);
    return null;
  }
}

/**
 * Detect disease (generic - tries to identify plant type first)
 * Runs across all supported crops when no plant is provided
 */
export async function detectDisease(blob: Blob, plantId?: string): Promise<DetectionResult | null> {
  return detectDiseaseForPlant(blob, plantId);
}

/**
 * Get all supported plants
 */
export function getSupportedPlants() {
  return Object.values(PLANT_TYPES).map((plant) => ({
    id: plant.id,
    name: plant.name,
    icon: plant.icon,
    color: plant.color,
    diseaseCount: Object.keys(plant.diseases).length,
  }));
}

/**
 * Get disease count for a plant
 */
export function getDiseaseCountForPlant(plantId: string): number {
  const diseases = getPlantDiseases(plantId);
  return Object.keys(diseases).length;
}

/**
 * Format confidence as percentage
 */
export function formatConfidence(confidence: number): string {
  return (confidence * 100).toFixed(1);
}

/**
 * Get severity color
 */
export function getSeverityColor(severity: string): string {
  switch (severity) {
    case "healthy":
      return "emerald";
    case "mild":
      return "yellow";
    case "moderate":
      return "orange";
    case "severe":
      return "red";
    default:
      return "gray";
  }
}

/**
 * Get severity label
 */
export function getSeverityLabel(severity: string): string {
  switch (severity) {
    case "healthy":
      return "Healthy";
    case "mild":
      return "Mild";
    case "moderate":
      return "Moderate";
    case "severe":
      return "Severe";
    default:
      return "Unknown";
  }
}
