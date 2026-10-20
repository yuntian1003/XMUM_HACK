/**
 * Leaf Validator
 * Validates if an image contains a plant leaf before disease detection
 * Prevents false positives from plastic, dirt, fabric, etc.
 */

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  reason: string;
  details: {
    greenRatio: number;
    brownRatio: number;
    yellowRatio: number;
    whiteRatio: number;
    redRatio: number;
    colorVariance: number;
    edgeDetection: number;
    leafLikeScore: number;
  };
}

/**
 * Validates if image contains a plant leaf
 * Uses multiple heuristics:
 * 1. Green color presence (leaves are typically green)
 * 2. Color variance (natural leaves have varied colors, not uniform)
 * 3. Edge detection (leaves have natural edges, not uniform surfaces)
 * 4. Texture analysis (leaves have natural texture patterns)
 */
export async function validateLeafImage(blob: Blob): Promise<ValidationResult> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return {
      isValid: false,
      confidence: 0,
      reason: "Cannot process image",
      details: {
        greenRatio: 0,
        brownRatio: 0,
        yellowRatio: 0,
        whiteRatio: 0,
        redRatio: 0,
        colorVariance: 0,
        edgeDetection: 0,
        leafLikeScore: 0,
      },
    };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // Resize to 256x256 for analysis
      canvas.width = 256;
      canvas.height = 256;
      ctx.drawImage(img, 0, 0, 256, 256);

      const imageData = ctx.getImageData(0, 0, 256, 256);
      const data = imageData.data;

      const details = analyzePixels(data);
      const leafLikeScore = calculateLeafLikeScore(details);

      const isValid = leafLikeScore > 0.5; // 50% threshold
      const confidence = Math.min(leafLikeScore, 1.0);

      let reason = "";
      if (isValid) {
        reason = `Leaf detected with ${(confidence * 100).toFixed(0)}% confidence`;
      } else {
        if (details.greenRatio < 0.15) {
          reason = "Not enough green color - may not be a plant leaf";
        } else if (details.colorVariance < 0.15) {
          reason = "Image too uniform - may be plastic, fabric, or solid material";
        } else if (details.edgeDetection < 0.2) {
          reason = "No natural edges detected - may not be a plant leaf";
        } else {
          reason = "Image does not match plant leaf characteristics";
        }
      }

      resolve({
        isValid,
        confidence,
        reason,
        details: {
          ...details,
          leafLikeScore,
        },
      });
    };

    img.onerror = () => {
      resolve({
        isValid: false,
        confidence: 0,
        reason: "Cannot load image",
        details: {
          greenRatio: 0,
          brownRatio: 0,
          yellowRatio: 0,
          whiteRatio: 0,
          redRatio: 0,
          colorVariance: 0,
          edgeDetection: 0,
          leafLikeScore: 0,
        },
      });
    };

    img.src = URL.createObjectURL(blob);
  });
}

/**
 * Analyzes pixel data to extract color ratios and texture metrics
 */
function analyzePixels(data: Uint8ClampedArray) {
  const pixelCount = data.length / 4;
  let greenCount = 0;
  let brownCount = 0;
  let yellowCount = 0;
  let whiteCount = 0;
  let redCount = 0;
  let colorValues: number[] = [];

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Skip transparent pixels
    if (a < 128) continue;

    // Classify pixel by color
    // Green: high green, low red/blue
    if (g > 80 && g > r * 1.2 && g > b * 1.1) {
      greenCount++;
    }
    // Brown: high red, moderate green, low blue
    else if (r > 100 && g < 100 && b < 80 && r > g * 1.3) {
      brownCount++;
    }
    // Yellow: high red and green, low blue
    else if (r > 150 && g > 130 && b < 80) {
      yellowCount++;
    }
    // White: all channels high
    else if (r > 180 && g > 180 && b > 160) {
      whiteCount++;
    }
    // Red: high red, low green/blue
    else if (r > 150 && g < 100 && b < 100) {
      redCount++;
    }

    // Track color values for variance calculation
    const brightness = (r + g + b) / 3;
    colorValues.push(brightness);
  }

  const greenRatio = greenCount / pixelCount;
  const brownRatio = brownCount / pixelCount;
  const yellowRatio = yellowCount / pixelCount;
  const whiteRatio = whiteCount / pixelCount;
  const redRatio = redCount / pixelCount;

  // Calculate color variance (higher = more natural variation)
  const mean = colorValues.reduce((a, b) => a + b, 0) / colorValues.length;
  const variance =
    colorValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    colorValues.length;
  const colorVariance = Math.sqrt(variance) / 255; // Normalize to 0-1

  // Edge detection: look for sharp transitions between pixels
  const edgeDetection = detectEdges(data);

  return {
    greenRatio,
    brownRatio,
    yellowRatio,
    whiteRatio,
    redRatio,
    colorVariance,
    edgeDetection,
  };
}

/**
 * Detects edges in image (natural leaves have edges, uniform materials don't)
 */
function detectEdges(data: Uint8ClampedArray): number {
  const width = 256;
  const height = 256;
  let edgeCount = 0;
  let totalPixels = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Get neighboring pixels
      const neighbors = [
        data[((y - 1) * width + x) * 4], // top
        data[((y + 1) * width + x) * 4], // bottom
        data[(y * width + (x - 1)) * 4], // left
        data[(y * width + (x + 1)) * 4], // right
      ];

      // Calculate difference from neighbors
      const avgNeighbor = neighbors.reduce((a, b) => a + b, 0) / 4;
      const currentBrightness = (r + g + b) / 3;
      const diff = Math.abs(currentBrightness - avgNeighbor);

      // If difference is significant, it's likely an edge
      if (diff > 30) {
        edgeCount++;
      }
      totalPixels++;
    }
  }

  return edgeCount / totalPixels;
}

/**
 * Calculates overall "leaf-like" score (0-1)
 * Combines multiple heuristics to determine if image looks like a plant leaf
 */
function calculateLeafLikeScore(details: {
  greenRatio: number;
  brownRatio: number;
  yellowRatio: number;
  whiteRatio: number;
  redRatio: number;
  colorVariance: number;
  edgeDetection: number;
}): number {
  let score = 0;

  // 1. Green presence (leaves are typically green)
  // Weight: 35% - Most important indicator
  const greenScore = Math.min(details.greenRatio * 2, 1); // 0.5+ green = 1.0
  score += greenScore * 0.35;

  // 2. Color variance (natural leaves have variation, not uniform)
  // Weight: 20% - Less strict than before
  const varianceScore = Math.min(details.colorVariance * 1.5, 1); // 0.67+ variance = 1.0
  score += varianceScore * 0.2;

  // 3. Edge detection (leaves have natural edges)
  // Weight: 15%
  const edgeScore = Math.min(details.edgeDetection * 3, 1); // 0.33+ edges = 1.0
  score += edgeScore * 0.15;

  // 4. Color diversity (leaves have multiple colors: green, brown, yellow, red)
  // Weight: 20% - Increased importance
  const colorDiversity =
    (details.greenRatio > 0.05 ? 1 : 0) +
    (details.brownRatio > 0.02 ? 1 : 0) +
    (details.yellowRatio > 0.02 ? 1 : 0) +
    (details.redRatio > 0.02 ? 1 : 0);
  const diversityScore = Math.min(colorDiversity / 3, 1); // 0-1
  score += diversityScore * 0.2;

  // 5. Avoid white/uniform (plastic, fabric often very white/uniform)
  // Weight: 10% - More lenient threshold
  const uniformityPenalty = Math.max(0, details.whiteRatio - 0.5); // Penalize if >50% white
  score -= uniformityPenalty * 0.1;

  // Clamp score to 0-1
  return Math.max(0, Math.min(score, 1));
}

/**
 * Get validation feedback message for UI
 */
export function getValidationFeedback(result: ValidationResult): {
  icon: string;
  title: string;
  message: string;
  color: string;
  action: string;
} {
  if (result.isValid) {
        return {
          icon: "✓",
          title: "Valid Plant Leaf",
          message: `Leaf detected with ${(result.confidence * 100).toFixed(0)}% confidence. Ready for disease detection.`,
          color: "emerald",
          action: "Proceed",
        };
      }

      // Determine specific rejection reason
      if (result.details.greenRatio < 0.08) {
        return {
          icon: "⚠",
          title: "Not a Plant Leaf",
          message: "Image does not contain enough green color. Please photograph a plant leaf.",
          color: "amber",
          action: "Retake Photo",
        };
      }

      if (result.details.colorVariance < 0.08) {
        return {
          icon: "✕",
          title: "Image Too Uniform",
          message: "This looks like plastic, fabric, or a solid material. Please photograph an actual plant leaf.",
          color: "red",
          action: "Retake Photo",
        };
      }

  if (result.details.edgeDetection < 0.2) {
    return {
      icon: "✕",
      title: "No Natural Edges Detected",
      message: "Image appears to be a smooth, uniform surface. Please photograph a plant leaf with natural edges.",
      color: "red",
      action: "Retake Photo",
    };
  }

  return {
    icon: "✕",
    title: "Invalid Image",
    message: result.reason,
    color: "red",
    action: "Retake Photo",
  };
}
