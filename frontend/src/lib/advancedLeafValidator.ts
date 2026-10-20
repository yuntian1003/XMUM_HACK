/**
 * Advanced Leaf Validator
 * Uses shape and texture analysis to detect plants vs non-plants
 * Works offline, no ML models needed, more accurate than color-based detection
 */

export interface AdvancedValidationResult {
  isPlant: boolean;
  confidence: number;
  reason: string;
  details: {
    edgeDensity: number;
    textureVariation: number;
    organicShapeScore: number;
    contrastRatio: number;
    leafLikeScore: number;
  };
}

/**
 * Advanced leaf validation using multiple heuristics:
 * 1. Edge density - Plants have many natural edges, plastic/fabric don't
 * 2. Texture variation - Natural leaves have organic texture, not uniform
 * 3. Organic shape - Leaves have irregular, natural shapes
 * 4. Contrast ratio - Natural leaves have varied brightness
 */
export async function validateLeafImageAdvanced(blob: Blob): Promise<AdvancedValidationResult> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return {
      isPlant: false,
      confidence: 0,
      reason: "Cannot process image",
      details: {
        edgeDensity: 0,
        textureVariation: 0,
        organicShapeScore: 0,
        contrastRatio: 0,
        leafLikeScore: 0,
      },
    };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      canvas.width = 256;
      canvas.height = 256;
      ctx.drawImage(img, 0, 0, 256, 256);

      const imageData = ctx.getImageData(0, 0, 256, 256);
      const data = imageData.data;

      // Analyze image characteristics
      const edgeDensity = analyzeEdgeDensity(data);
      const textureVariation = analyzeTextureVariation(data);
      const organicShapeScore = analyzeOrganicShape(data);
      const contrastRatio = analyzeContrast(data);

      // Calculate overall leaf-like score
      const leafLikeScore = calculateLeafScore({
        edgeDensity,
        textureVariation,
        organicShapeScore,
        contrastRatio,
      });

      const isPlant = leafLikeScore > 0.45; // 45% threshold
      const confidence = Math.min(leafLikeScore, 1.0);

      let reason = "";
      if (isPlant) {
        reason = `Plant/leaf detected with ${(confidence * 100).toFixed(0)}% confidence`;
      } else {
        if (edgeDensity < 0.15) {
          reason = "Image has too few edges - likely a smooth, uniform surface (plastic, fabric, etc.)";
        } else if (textureVariation < 0.1) {
          reason = "Image texture is too uniform - not characteristic of natural plants";
        } else if (organicShapeScore < 0.2) {
          reason = "Image shows geometric/uniform patterns - not a natural plant leaf";
        } else {
          reason = "Image does not match plant leaf characteristics";
        }
      }

      resolve({
        isPlant,
        confidence,
        reason,
        details: {
          edgeDensity,
          textureVariation,
          organicShapeScore,
          contrastRatio,
          leafLikeScore,
        },
      });
    };

    img.onerror = () => {
      resolve({
        isPlant: false,
        confidence: 0,
        reason: "Cannot load image",
        details: {
          edgeDensity: 0,
          textureVariation: 0,
          organicShapeScore: 0,
          contrastRatio: 0,
          leafLikeScore: 0,
        },
      });
    };

    img.src = URL.createObjectURL(blob);
  });
}

/**
 * Analyzes edge density - plants have many natural edges
 */
function analyzeEdgeDensity(data: Uint8ClampedArray): number {
  const width = 256;
  const height = 256;
  let edgeCount = 0;
  let totalPixels = 0;

  // Sobel edge detection
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;

      // Get 3x3 neighborhood
      const tl = data[((y - 1) * width + (x - 1)) * 4]; // top-left
      const tm = data[((y - 1) * width + x) * 4]; // top-middle
      const tr = data[((y - 1) * width + (x + 1)) * 4]; // top-right
      const ml = data[(y * width + (x - 1)) * 4]; // middle-left
      const mr = data[(y * width + (x + 1)) * 4]; // middle-right
      const bl = data[((y + 1) * width + (x - 1)) * 4]; // bottom-left
      const bm = data[((y + 1) * width + x) * 4]; // bottom-middle
      const br = data[((y + 1) * width + (x + 1)) * 4]; // bottom-right

      // Sobel operators
      const gx = -tl + tr - 2 * ml + 2 * mr - bl + br;
      const gy = -tl - 2 * tm - tr + bl + 2 * bm + br;
      const magnitude = Math.sqrt(gx * gx + gy * gy);

      if (magnitude > 50) {
        edgeCount++;
      }
      totalPixels++;
    }
  }

  return edgeCount / totalPixels;
}

/**
 * Analyzes texture variation - natural leaves have varied texture
 */
function analyzeTextureVariation(data: Uint8ClampedArray): number {
  const width = 256;
  const height = 256;
  let variationSum = 0;
  let patchCount = 0;

  // Divide image into 8x8 patches and analyze variation
  const patchSize = 32;
  for (let py = 0; py < height; py += patchSize) {
    for (let px = 0; px < width; px += patchSize) {
      const patchEnd = Math.min(py + patchSize, height);
      const patchEndX = Math.min(px + patchSize, width);

      let patchMean = 0;
      let pixelCount = 0;

      // Calculate mean brightness in patch
      for (let y = py; y < patchEnd; y++) {
        for (let x = px; x < patchEndX; x++) {
          const idx = (y * width + x) * 4;
          const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          patchMean += brightness;
          pixelCount++;
        }
      }
      patchMean /= pixelCount;

      // Calculate variance in patch
      let variance = 0;
      for (let y = py; y < patchEnd; y++) {
        for (let x = px; x < patchEndX; x++) {
          const idx = (y * width + x) * 4;
          const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          variance += Math.pow(brightness - patchMean, 2);
        }
      }
      variance /= pixelCount;

      variationSum += Math.sqrt(variance);
      patchCount++;
    }
  }

  return Math.min(variationSum / (patchCount * 255), 1.0);
}

/**
 * Analyzes organic shape - leaves have irregular, natural shapes
 */
function analyzeOrganicShape(data: Uint8ClampedArray): number {
  const width = 256;
  const height = 256;

  // Find contours and analyze their complexity
  let contourLength = 0;
  let boundingArea = 0;

  // Simple contour detection
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const current = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

      // Check if this is an edge pixel
      const neighbors = [
        (data[((y - 1) * width + x) * 4] + data[((y - 1) * width + x) * 4 + 1] + data[((y - 1) * width + x) * 4 + 2]) / 3,
        (data[((y + 1) * width + x) * 4] + data[((y + 1) * width + x) * 4 + 1] + data[((y + 1) * width + x) * 4 + 2]) / 3,
        (data[(y * width + (x - 1)) * 4] + data[(y * width + (x - 1)) * 4 + 1] + data[(y * width + (x - 1)) * 4 + 2]) / 3,
        (data[(y * width + (x + 1)) * 4] + data[(y * width + (x + 1)) * 4 + 1] + data[(y * width + (x + 1)) * 4 + 2]) / 3,
      ];

      const maxDiff = Math.max(...neighbors.map((n) => Math.abs(n - current)));
      if (maxDiff > 30) {
        contourLength++;
      }
    }
  }

  // Organic shapes have high perimeter-to-area ratio
  boundingArea = width * height;
  const complexityScore = Math.min(contourLength / (boundingArea * 0.1), 1.0);

  return complexityScore;
}

/**
 * Analyzes contrast ratio - natural leaves have good contrast variation
 */
function analyzeContrast(data: Uint8ClampedArray): number {
  let minBrightness = 255;
  let maxBrightness = 0;

  for (let i = 0; i < data.length; i += 4) {
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
    minBrightness = Math.min(minBrightness, brightness);
    maxBrightness = Math.max(maxBrightness, brightness);
  }

  const contrastRatio = (maxBrightness - minBrightness) / 255;
  return Math.min(contrastRatio, 1.0);
}

/**
 * Calculates overall leaf-like score from multiple metrics
 */
function calculateLeafScore(metrics: {
  edgeDensity: number;
  textureVariation: number;
  organicShapeScore: number;
  contrastRatio: number;
}): number {
  let score = 0;

  // Edge density: 30% weight (most important for distinguishing plants)
  score += Math.min(metrics.edgeDensity * 3, 1) * 0.3;

  // Texture variation: 25% weight
  score += Math.min(metrics.textureVariation * 2, 1) * 0.25;

  // Organic shape: 25% weight
  score += Math.min(metrics.organicShapeScore * 1.5, 1) * 0.25;

  // Contrast ratio: 20% weight
  score += Math.min(metrics.contrastRatio * 1.2, 1) * 0.2;

  return Math.max(0, Math.min(score, 1));
}
