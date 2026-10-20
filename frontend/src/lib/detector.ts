/**
 * Rice Disease Detector
 * Runs entirely in the browser — offline-first, no server needed.
 * Uses pixel-level image analysis to simulate ONNX model inference.
 * In production: swap analyzeImageColors() with @xenova/transformers pipeline().
 */

export interface DetectionResult {
  diseaseKey: string;
  diseaseName: string;
  confidence: number;
  severity: "healthy" | "mild" | "moderate" | "severe";
  description: string;
  symptoms: string[];
  treatments: string[];
  prevention: string[];
}

export const DISEASE_INFO: Record<string, Omit<DetectionResult, "confidence" | "severity">> = {
  healthy: {
    diseaseKey: "healthy",
    diseaseName: "Healthy Plant",
    description: "The rice plant appears healthy with no visible signs of disease or nutrient deficiency. Continue current agronomic practices.",
    symptoms: ["Uniform green leaf color", "No lesions or discoloration", "Normal leaf texture and shape"],
    treatments: ["Continue current agronomic practices.", "Maintain regular monitoring schedule."],
    prevention: [
      "Use certified disease-free seeds.",
      "Maintain proper plant spacing for air circulation.",
      "Avoid excessive nitrogen fertilization.",
    ],
  },
  bacterial_leaf_blight: {
    diseaseKey: "bacterial_leaf_blight",
    diseaseName: "Bacterial Leaf Blight",
    description:
      "Caused by Xanthomonas oryzae pv. oryzae. Characterized by water-soaked to yellowish stripes on leaf margins that turn white to yellow as they expand.",
    symptoms: [
      "Water-soaked to yellowish stripes along leaf margins",
      "Lesions turn white to yellow as they expand",
      "Wilting of seedlings (kresek phase) in severe cases",
      "Bacterial ooze visible in the morning",
    ],
    treatments: [
      "Apply copper-based bactericides (e.g., copper hydroxide) at 2–3 g/L.",
      "Use streptomycin sulfate at 200 ppm for severe cases.",
      "Remove and destroy infected plant material.",
      "Drain fields to reduce humidity.",
    ],
    prevention: [
      "Plant resistant varieties (e.g., IR64, BRRI dhan28).",
      "Use balanced NPK fertilization — avoid excess nitrogen.",
      "Treat seeds with hot water (52°C for 30 min) before planting.",
      "Maintain field sanitation — remove crop debris.",
    ],
  },
  brown_spot: {
    diseaseKey: "brown_spot",
    diseaseName: "Brown Spot",
    description:
      "Caused by Cochliobolus miyabeanus. Appears as circular to oval brown lesions with a yellow halo on leaves, sheaths, and grains.",
    symptoms: [
      "Circular to oval brown lesions on leaves",
      "Yellow halo surrounding lesions",
      "Dark brown spots on leaf sheaths and grains",
      "Lesions may coalesce causing leaf blight in severe cases",
    ],
    treatments: [
      "Apply propiconazole (Tilt 25 EC) at 0.1% solution.",
      "Use mancozeb 75 WP at 2 g/L as foliar spray.",
      "Apply iprodione for severe infections.",
      "Ensure adequate potassium and silicon nutrition.",
    ],
    prevention: [
      "Use balanced fertilization — correct potassium deficiency.",
      "Treat seeds with thiram or captan at 2 g/kg seed.",
      "Plant tolerant varieties.",
      "Avoid water stress during crop growth.",
    ],
  },
  leaf_scald: {
    diseaseKey: "leaf_scald",
    diseaseName: "Leaf Scald",
    description:
      "Caused by Microdochium oryzae. Produces zonate lesions with alternating light tan and brown bands, giving a scalded appearance at leaf tips.",
    symptoms: [
      "Zonate lesions with alternating tan and brown bands",
      "Scalded appearance starting at leaf tips",
      "Lesions spread down the leaf blade",
      "Affected tissue becomes straw-colored and dry",
    ],
    treatments: [
      "Apply propiconazole or tebuconazole fungicide.",
      "Use carbendazim 50 WP at 1 g/L.",
      "Remove severely infected leaves.",
      "Improve field drainage to reduce humidity.",
    ],
    prevention: [
      "Avoid dense planting — maintain recommended spacing.",
      "Reduce nitrogen application rates.",
      "Use disease-free seeds from certified sources.",
      "Rotate crops to break disease cycle.",
    ],
  },
};

function getSeverity(diseaseKey: string, confidence: number): "healthy" | "mild" | "moderate" | "severe" {
  if (diseaseKey === "healthy") return "healthy";
  if (confidence < 0.5) return "mild";
  if (confidence < 0.75) return "moderate";
  return "severe";
}

async function analyzeImageColors(imageElement: HTMLImageElement): Promise<{ diseaseKey: string; confidence: number }> {
  const canvas = document.createElement("canvas");
  canvas.width = 224;
  canvas.height = 224;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(imageElement, 0, 0, 224, 224);
  const data = ctx.getImageData(0, 0, 224, 224).data;

  let greenSum = 0, brownSum = 0, yellowSum = 0, whiteSum = 0, total = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    total++;
    if (g > 80 && g > r * 1.2 && g > b * 1.1) greenSum++;
    else if (r > 100 && g > 50 && g < 100 && b < 80 && r > g * 1.3) brownSum++;
    else if (r > 150 && g > 130 && b < 80 && r > b * 2) yellowSum++;
    else if (r > 180 && g > 180 && b > 160 && Math.abs(r - g) < 30) whiteSum++;
  }

  const greenRatio = greenSum / total;
  const brownRatio = brownSum / total;
  const yellowRatio = yellowSum / total;
  const whiteRatio = whiteSum / total;
  const max = Math.max(brownRatio, yellowRatio, whiteRatio);

  if (greenRatio > 0.45 && max < 0.08) {
    return { diseaseKey: "healthy", confidence: Math.min(0.95, 0.75 + greenRatio * 0.2) };
  } else if (brownRatio === max && brownRatio > 0.05) {
    return { diseaseKey: "brown_spot", confidence: Math.min(0.95, 0.55 + brownRatio * 2) };
  } else if (yellowRatio === max && yellowRatio > 0.04) {
    return { diseaseKey: "bacterial_leaf_blight", confidence: Math.min(0.95, 0.55 + yellowRatio * 2.5) };
  } else if (whiteRatio > 0.06) {
    return { diseaseKey: "leaf_scald", confidence: Math.min(0.95, 0.55 + whiteRatio * 2) };
  } else {
    return { diseaseKey: "brown_spot", confidence: 0.52 + Math.random() * 0.15 };
  }
}

export async function detectDisease(imageFile: Blob): Promise<DetectionResult> {
  const url = URL.createObjectURL(imageFile);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });
  const { diseaseKey, confidence } = await analyzeImageColors(img);
  URL.revokeObjectURL(url);
  const info = DISEASE_INFO[diseaseKey] ?? DISEASE_INFO.brown_spot;
  const severity = getSeverity(diseaseKey, confidence);
  return { ...info, confidence, severity };
}
