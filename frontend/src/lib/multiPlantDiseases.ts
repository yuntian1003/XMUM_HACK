/**
 * Multi-Plant Disease Database
 * Supports 8 plant types with 47+ diseases
 * Each disease includes pixel signatures for offline detection
 */

export interface DiseaseInfo {
  diseaseKey: string;
  diseaseName: string;
  scientificName: string;
  description: string;
  symptoms: string[];
  treatments: {
    chemical: string;
    biological: string;
    cultural: string;
  };
  preventionTips: string[];
  yieldImpact: string;
  spreadRisk: "low" | "medium" | "high";
  urgency: "monitor" | "treat_soon" | "treat_immediately";
  pixelSignatures: {
    green: number;
    brown: number;
    yellow: number;
    white: number;
    red: number;
  };
}

export interface PlantType {
  id: string;
  name: string;
  scientificName: string;
  icon: string;
  color: string;
  diseases: Record<string, DiseaseInfo>;
}

// ═══════════════════════════════════════════════════════════════════════════
// RICE (Oryza sativa)
// ═══════════════════════════════════════════════════════════════════════════

export const RICE_DISEASES: Record<string, DiseaseInfo> = {
  healthy: {
    diseaseKey: "healthy",
    diseaseName: "Healthy",
    scientificName: "N/A",
    description: "No disease detected. Leaf is healthy.",
    symptoms: ["Green coloration", "No spots or lesions", "Normal leaf structure"],
    treatments: { chemical: "None required", biological: "None required", cultural: "Maintain good field management" },
    preventionTips: ["Continue regular monitoring", "Maintain proper irrigation", "Ensure good drainage"],
    yieldImpact: "No impact",
    spreadRisk: "low",
    urgency: "monitor",
    pixelSignatures: { green: 0.75, brown: 0.05, yellow: 0.05, white: 0.05, red: 0.1 },
  },
  brown_spot: {
    diseaseKey: "brown_spot",
    diseaseName: "Brown Spot",
    scientificName: "Bipolaris oryzae",
    description: "Fungal disease causing brown circular lesions on rice leaves.",
    symptoms: ["Brown circular lesions with dark borders", "Yellow halo around lesions", "Multiple lesions on single leaf"],
    treatments: {
      chemical: "Apply hexaconazole 5 EC at 1.5 mL/L or carbendazim 50 WP at 1 g/L",
      biological: "Spray Bacillus subtilis or Trichoderma harzianum",
      cultural: "Remove infected leaves, improve drainage, reduce humidity",
    },
    preventionTips: ["Use resistant varieties", "Avoid excessive nitrogen", "Ensure proper spacing"],
    yieldImpact: "10-20% yield loss if untreated",
    spreadRisk: "high",
    urgency: "treat_soon",
    pixelSignatures: { green: 0.3, brown: 0.35, yellow: 0.15, white: 0.1, red: 0.1 },
  },
  bacterial_leaf_blight: {
    diseaseKey: "bacterial_leaf_blight",
    diseaseName: "Bacterial Leaf Blight",
    scientificName: "Xanthomonas oryzae pv. oryzae",
    description: "Bacterial disease causing yellow-white leaf streaks and necrosis.",
    symptoms: ["Yellow-white streaks on leaves", "Watery appearance", "Necrotic lesions", "Leaf wilting"],
    treatments: {
      chemical: "Spray copper oxychloride 50 WP at 2.5 g/L or streptomycin 90 WP at 0.3 g/L",
      biological: "Use Bacillus subtilis or Pseudomonas fluorescens",
      cultural: "Remove infected plants, improve drainage, avoid overhead irrigation",
    },
    preventionTips: ["Use resistant varieties", "Avoid mechanical damage to leaves", "Control insect vectors"],
    yieldImpact: "15-30% yield loss if untreated",
    spreadRisk: "high",
    urgency: "treat_immediately",
    pixelSignatures: { green: 0.25, brown: 0.1, yellow: 0.35, white: 0.2, red: 0.1 },
  },
  leaf_scald: {
    diseaseKey: "leaf_scald",
    diseaseName: "Leaf Scald",
    scientificName: "Monographella albescens",
    description: "Fungal disease causing white or gray lesions on rice leaves.",
    symptoms: ["White or grayish lesions", "Lesions start at leaf margins", "Affected areas become papery"],
    treatments: {
      chemical: "Apply mancozeb 75 WP at 2 g/L or chlorothalonil 75 WP at 2 g/L",
      biological: "Spray Trichoderma harzianum",
      cultural: "Improve air circulation, avoid overhead irrigation",
    },
    preventionTips: ["Use disease-free seeds", "Maintain proper spacing", "Ensure good drainage"],
    yieldImpact: "5-15% yield loss if untreated",
    spreadRisk: "medium",
    urgency: "treat_soon",
    pixelSignatures: { green: 0.4, brown: 0.05, yellow: 0.1, white: 0.35, red: 0.1 },
  },
  leaf_blast: {
    diseaseKey: "leaf_blast",
    diseaseName: "Leaf Blast",
    scientificName: "Magnaporthe oryzae",
    description: "Fungal disease causing diamond-shaped lesions on rice leaves.",
    symptoms: ["Diamond-shaped lesions", "Gray center with brown border", "Lesions coalesce to form streaks"],
    treatments: {
      chemical: "Apply azoxystrobin 23 SC at 1 mL/L or tricyclazole 75 WP at 0.6 g/L",
      biological: "Use Bacillus subtilis",
      cultural: "Avoid excessive nitrogen, improve drainage, remove infected debris",
    },
    preventionTips: ["Use resistant varieties", "Maintain balanced nutrition", "Ensure good air circulation"],
    yieldImpact: "20-40% yield loss if untreated",
    spreadRisk: "high",
    urgency: "treat_immediately",
    pixelSignatures: { green: 0.35, brown: 0.25, yellow: 0.15, white: 0.15, red: 0.1 },
  },
  sheath_blight: {
    diseaseKey: "sheath_blight",
    diseaseName: "Sheath Blight",
    scientificName: "Rhizoctonia solani",
    description: "Fungal disease affecting leaf sheaths and causing plant collapse.",
    symptoms: ["Elliptical lesions on leaf sheaths", "Lesions have gray center and brown border", "Affects multiple leaves"],
    treatments: {
      chemical: "Apply hexaconazole 5 EC at 1.5 mL/L or tebuconazole 25 EC at 1 mL/L",
      biological: "Use Bacillus subtilis or Trichoderma harzianum",
      cultural: "Reduce plant density, improve drainage, remove infected debris",
    },
    preventionTips: ["Reduce nitrogen levels", "Improve drainage", "Maintain proper spacing"],
    yieldImpact: "10-25% yield loss if untreated",
    spreadRisk: "high",
    urgency: "treat_soon",
    pixelSignatures: { green: 0.35, brown: 0.3, yellow: 0.15, white: 0.1, red: 0.1 },
  },
  false_smut: {
    diseaseKey: "false_smut",
    diseaseName: "False Smut",
    scientificName: "Ustilaginoidea virens",
    description: "Fungal disease affecting rice panicles, causing green spore balls.",
    symptoms: ["Green spore balls on panicles", "Affected grains become enlarged", "Spore balls turn black at maturity"],
    treatments: {
      chemical: "Apply azoxystrobin 23 SC at 1 mL/L during boot stage",
      biological: "Limited biological options available",
      cultural: "Remove infected panicles, improve drainage, avoid excessive nitrogen",
    },
    preventionTips: ["Use resistant varieties", "Maintain balanced nutrition", "Ensure good air circulation"],
    yieldImpact: "5-10% yield loss if untreated",
    spreadRisk: "medium",
    urgency: "treat_soon",
    pixelSignatures: { green: 0.5, brown: 0.1, yellow: 0.1, white: 0.15, red: 0.15 },
  },
  tungro: {
    diseaseKey: "tungro",
    diseaseName: "Tungro",
    scientificName: "Rice Tungro Virus (RTV)",
    description: "Viral disease transmitted by leafhoppers causing leaf discoloration and stunting.",
    symptoms: ["Yellow or orange leaf discoloration", "Stunted plant growth", "Reduced tillering"],
    treatments: {
      chemical: "No chemical cure; manage vectors with insecticides",
      biological: "Control leafhopper vectors with parasitoids",
      cultural: "Remove infected plants, control weeds, use resistant varieties",
    },
    preventionTips: ["Use resistant varieties", "Control leafhopper vectors", "Remove infected plants early"],
    yieldImpact: "30-50% yield loss if untreated",
    spreadRisk: "high",
    urgency: "treat_immediately",
    pixelSignatures: { green: 0.2, brown: 0.1, yellow: 0.4, white: 0.15, red: 0.15 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// WHEAT (Triticum aestivum)
// ═══════════════════════════════════════════════════════════════════════════

export const WHEAT_DISEASES: Record<string, DiseaseInfo> = {
  healthy: {
    diseaseKey: "healthy",
    diseaseName: "Healthy",
    scientificName: "N/A",
    description: "No disease detected. Leaf is healthy.",
    symptoms: ["Green coloration", "No spots or lesions", "Normal leaf structure"],
    treatments: { chemical: "None required", biological: "None required", cultural: "Maintain good field management" },
    preventionTips: ["Continue regular monitoring", "Maintain proper irrigation", "Ensure good drainage"],
    yieldImpact: "No impact",
    spreadRisk: "low",
    urgency: "monitor",
    pixelSignatures: { green: 0.75, brown: 0.05, yellow: 0.05, white: 0.05, red: 0.1 },
  },
  septoria_leaf_blotch: {
    diseaseKey: "septoria_leaf_blotch",
    diseaseName: "Septoria Leaf Blotch",
    scientificName: "Zymoseptoria tritici",
    description: "Fungal disease causing small brown spots with dark borders on wheat leaves.",
    symptoms: ["Small brown spots with dark borders", "Spots coalesce to form blotches", "Pycnidia visible in center"],
    treatments: {
      chemical: "Apply azoxystrobin 23 SC at 1 mL/L or propiconazole 25 EC at 1 mL/L",
      biological: "Use Bacillus subtilis",
      cultural: "Remove infected debris, improve air circulation, avoid overhead irrigation",
    },
    preventionTips: ["Use resistant varieties", "Crop rotation", "Remove infected debris"],
    yieldImpact: "10-20% yield loss if untreated",
    spreadRisk: "high",
    urgency: "treat_soon",
    pixelSignatures: { green: 0.4, brown: 0.3, yellow: 0.1, white: 0.1, red: 0.1 },
  },
  powdery_mildew: {
    diseaseKey: "powdery_mildew",
    diseaseName: "Powdery Mildew",
    scientificName: "Blumeria graminis",
    description: "Fungal disease causing white powdery coating on wheat leaves.",
    symptoms: ["White powdery coating on leaves", "Coating can be wiped off", "Affects lower leaves first"],
    treatments: {
      chemical: "Apply sulfur 80 WP at 2 g/L or triadimefon 25 EC at 1 mL/L",
      biological: "Use Bacillus subtilis or Trichoderma harzianum",
      cultural: "Improve air circulation, avoid excessive nitrogen, remove infected debris",
    },
    preventionTips: ["Use resistant varieties", "Maintain proper spacing", "Avoid excessive nitrogen"],
    yieldImpact: "5-15% yield loss if untreated",
    spreadRisk: "medium",
    urgency: "treat_soon",
    pixelSignatures: { green: 0.45, brown: 0.05, yellow: 0.1, white: 0.3, red: 0.1 },
  },
  rust: {
    diseaseKey: "rust",
    diseaseName: "Rust",
    scientificName: "Puccinia species",
    description: "Fungal disease causing rust-colored pustules on wheat leaves.",
    symptoms: ["Rust-colored pustules on leaves", "Pustules arranged in lines", "Affected leaves turn yellow"],
    treatments: {
      chemical: "Apply azoxystrobin 23 SC at 1 mL/L or tebuconazole 25 EC at 1 mL/L",
      biological: "Limited biological options",
      cultural: "Remove infected debris, improve air circulation, avoid overhead irrigation",
    },
    preventionTips: ["Use resistant varieties", "Monitor regularly", "Remove infected leaves"],
    yieldImpact: "15-30% yield loss if untreated",
    spreadRisk: "high",
    urgency: "treat_immediately",
    pixelSignatures: { green: 0.3, brown: 0.15, yellow: 0.2, white: 0.1, red: 0.25 },
  },
  fusarium_head_blight: {
    diseaseKey: "fusarium_head_blight",
    diseaseName: "Fusarium Head Blight",
    scientificName: "Fusarium graminearum",
    description: "Fungal disease affecting wheat heads causing premature ripening and grain damage.",
    symptoms: ["Bleached or brown heads", "Affected grains shriveled", "Pink fungal growth visible"],
    treatments: {
      chemical: "Apply azoxystrobin 23 SC at 1 mL/L during flowering",
      biological: "Use Bacillus subtilis",
      cultural: "Remove infected debris, improve drainage, crop rotation",
    },
    preventionTips: ["Use resistant varieties", "Crop rotation", "Remove infected debris"],
    yieldImpact: "20-40% yield loss if untreated",
    spreadRisk: "high",
    urgency: "treat_immediately",
    pixelSignatures: { green: 0.25, brown: 0.3, yellow: 0.2, white: 0.15, red: 0.1 },
  },
  tan_spot: {
    diseaseKey: "tan_spot",
    diseaseName: "Tan Spot",
    scientificName: "Pyrenophora tritici-repentis",
    description: "Fungal disease causing tan or brown lesions on wheat leaves.",
    symptoms: ["Tan or brown lesions with dark borders", "Yellow halo around lesions", "Lesions coalesce"],
    treatments: {
      chemical: "Apply mancozeb 75 WP at 2 g/L or chlorothalonil 75 WP at 2 g/L",
      biological: "Use Trichoderma harzianum",
      cultural: "Remove infected debris, improve air circulation, crop rotation",
    },
    preventionTips: ["Use resistant varieties", "Crop rotation", "Remove infected debris"],
    yieldImpact: "10-20% yield loss if untreated",
    spreadRisk: "medium",
    urgency: "treat_soon",
    pixelSignatures: { green: 0.4, brown: 0.25, yellow: 0.15, white: 0.1, red: 0.1 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// CORN/MAIZE (Zea mays)
// ═══════════════════════════════════════════════════════════════════════════

export const CORN_DISEASES: Record<string, DiseaseInfo> = {
  healthy: {
    diseaseKey: "healthy",
    diseaseName: "Healthy",
    scientificName: "N/A",
    description: "No disease detected. Leaf is healthy.",
    symptoms: ["Green coloration", "No spots or lesions", "Normal leaf structure"],
    treatments: { chemical: "None required", biological: "None required", cultural: "Maintain good field management" },
    preventionTips: ["Continue regular monitoring", "Maintain proper irrigation", "Ensure good drainage"],
    yieldImpact: "No impact",
    spreadRisk: "low",
    urgency: "monitor",
    pixelSignatures: { green: 0.75, brown: 0.05, yellow: 0.05, white: 0.05, red: 0.1 },
  },
  gray_leaf_spot: {
    diseaseKey: "gray_leaf_spot",
    diseaseName: "Gray Leaf Spot",
    scientificName: "Cercospora zeae-maydis",
    description: "Fungal disease causing rectangular gray lesions on corn leaves.",
    symptoms: ["Rectangular gray lesions", "Lesions bounded by leaf veins", "Lesions coalesce"],
    treatments: {
      chemical: "Apply azoxystrobin 23 SC at 1 mL/L or propiconazole 25 EC at 1 mL/L",
      biological: "Use Bacillus subtilis",
      cultural: "Remove infected debris, improve air circulation, crop rotation",
    },
    preventionTips: ["Use resistant varieties", "Crop rotation", "Remove infected debris"],
    yieldImpact: "10-20% yield loss if untreated",
    spreadRisk: "high",
    urgency: "treat_soon",
    pixelSignatures: { green: 0.4, brown: 0.1, yellow: 0.1, white: 0.3, red: 0.1 },
  },
  northern_corn_leaf_blight: {
    diseaseKey: "northern_corn_leaf_blight",
    diseaseName: "Northern Corn Leaf Blight",
    scientificName: "Exserohilum turcicum",
    description: "Fungal disease causing long elliptical lesions on corn leaves.",
    symptoms: ["Long elliptical lesions", "Lesions have tan center with dark borders", "Affects lower leaves first"],
    treatments: {
      chemical: "Apply azoxystrobin 23 SC at 1 mL/L or tebuconazole 25 EC at 1 mL/L",
      biological: "Use Bacillus subtilis",
      cultural: "Remove infected debris, improve air circulation, crop rotation",
    },
    preventionTips: ["Use resistant varieties", "Crop rotation", "Remove infected debris"],
    yieldImpact: "15-30% yield loss if untreated",
    spreadRisk: "high",
    urgency: "treat_immediately",
    pixelSignatures: { green: 0.35, brown: 0.25, yellow: 0.15, white: 0.15, red: 0.1 },
  },
  southern_corn_leaf_blight: {
    diseaseKey: "southern_corn_leaf_blight",
    diseaseName: "Southern Corn Leaf Blight",
    scientificName: "Bipolaris maydis",
    description: "Fungal disease causing oval lesions on corn leaves.",
    symptoms: ["Oval lesions with tan center", "Dark borders on lesions", "Lesions coalesce"],
    treatments: {
      chemical: "Apply mancozeb 75 WP at 2 g/L or chlorothalonil 75 WP at 2 g/L",
      biological: "Use Trichoderma harzianum",
      cultural: "Remove infected debris, improve air circulation, crop rotation",
    },
    preventionTips: ["Use resistant varieties", "Crop rotation", "Remove infected debris"],
    yieldImpact: "10-25% yield loss if untreated",
    spreadRisk: "medium",
    urgency: "treat_soon",
    pixelSignatures: { green: 0.4, brown: 0.2, yellow: 0.15, white: 0.15, red: 0.1 },
  },
  anthracnose: {
    diseaseKey: "anthracnose",
    diseaseName: "Anthracnose",
    scientificName: "Colletotrichum graminicola",
    description: "Fungal disease causing small dark lesions on corn leaves.",
    symptoms: ["Small dark lesions", "Lesions have yellow halo", "Affects lower leaves first"],
    treatments: {
      chemical: "Apply azoxystrobin 23 SC at 1 mL/L",
      biological: "Use Bacillus subtilis",
      cultural: "Remove infected debris, improve air circulation, crop rotation",
    },
    preventionTips: ["Use resistant varieties", "Crop rotation", "Remove infected debris"],
    yieldImpact: "5-15% yield loss if untreated",
    spreadRisk: "medium",
    urgency: "treat_soon",
    pixelSignatures: { green: 0.5, brown: 0.15, yellow: 0.15, white: 0.1, red: 0.1 },
  },
  corn_smut: {
    diseaseKey: "corn_smut",
    diseaseName: "Corn Smut",
    scientificName: "Ustilago maydis",
    description: "Fungal disease causing galls on corn cobs and kernels.",
    symptoms: ["Large galls on cobs", "Galls contain black spores", "Affects ears and tassels"],
    treatments: {
      chemical: "No effective chemical treatment",
      biological: "Limited biological options",
      cultural: "Remove infected plants, improve drainage, crop rotation",
    },
    preventionTips: ["Use resistant varieties", "Crop rotation", "Remove infected plants"],
    yieldImpact: "20-40% yield loss if untreated",
    spreadRisk: "medium",
    urgency: "treat_soon",
    pixelSignatures: { green: 0.3, brown: 0.3, yellow: 0.1, white: 0.15, red: 0.15 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// POTATO (Solanum tuberosum)
// ═══════════════════════════════════════════════════════════════════════════

export const POTATO_DISEASES: Record<string, DiseaseInfo> = {
  healthy: {
    diseaseKey: "healthy",
    diseaseName: "Healthy",
    scientificName: "N/A",
    description: "No disease detected. Leaf is healthy.",
    symptoms: ["Green coloration", "No spots or lesions", "Normal leaf structure"],
    treatments: { chemical: "None required", biological: "None required", cultural: "Maintain good field management" },
    preventionTips: ["Continue regular monitoring", "Maintain proper irrigation", "Ensure good drainage"],
    yieldImpact: "No impact",
    spreadRisk: "low",
    urgency: "monitor",
    pixelSignatures: { green: 0.75, brown: 0.05, yellow: 0.05, white: 0.05, red: 0.1 },
  },
  early_blight: {
    diseaseKey: "early_blight",
    diseaseName: "Early Blight",
    scientificName: "Alternaria solani",
    description: "Fungal disease causing brown spots with concentric rings on potato leaves.",
    symptoms: ["Brown spots with concentric rings", "Yellow halo around spots", "Affects lower leaves first"],
    treatments: {
      chemical: "Apply mancozeb 75 WP at 2 g/L or chlorothalonil 75 WP at 2 g/L",
      biological: "Use Bacillus subtilis or Trichoderma harzianum",
      cultural: "Remove infected leaves, improve air circulation, avoid overhead irrigation",
    },
    preventionTips: ["Use resistant varieties", "Remove infected leaves", "Improve air circulation"],
    yieldImpact: "10-20% yield loss if untreated",
    spreadRisk: "high",
    urgency: "treat_soon",
    pixelSignatures: { green: 0.4, brown: 0.3, yellow: 0.15, white: 0.1, red: 0.05 },
  },
  late_blight: {
    diseaseKey: "late_blight",
    diseaseName: "Late Blight",
    scientificName: "Phytophthora infestans",
    description: "Oomycete disease causing water-soaked lesions on potato leaves.",
    symptoms: ["Water-soaked lesions", "White fungal growth on leaf undersides", "Rapid leaf collapse"],
    treatments: {
      chemical: "Apply metalaxyl 8 EC at 1.5 mL/L or mancozeb 75 WP at 2 g/L",
      biological: "Limited biological options",
      cultural: "Remove infected plants, improve drainage, avoid overhead irrigation",
    },
    preventionTips: ["Use resistant varieties", "Avoid overhead irrigation", "Remove infected plants"],
    yieldImpact: "30-50% yield loss if untreated",
    spreadRisk: "high",
    urgency: "treat_immediately",
    pixelSignatures: { green: 0.25, brown: 0.15, yellow: 0.2, white: 0.3, red: 0.1 },
  },
  powdery_mildew_potato: {
    diseaseKey: "powdery_mildew_potato",
    diseaseName: "Powdery Mildew",
    scientificName: "Erysiphe cichoracearum",
    description: "Fungal disease causing white powdery coating on potato leaves.",
    symptoms: ["White powdery coating", "Coating on both leaf surfaces", "Affects upper leaves first"],
    treatments: {
      chemical: "Apply sulfur 80 WP at 2 g/L or triadimefon 25 EC at 1 mL/L",
      biological: "Use Bacillus subtilis",
      cultural: "Improve air circulation, avoid excessive nitrogen, remove infected debris",
    },
    preventionTips: ["Use resistant varieties", "Maintain proper spacing", "Avoid excessive nitrogen"],
    yieldImpact: "5-15% yield loss if untreated",
    spreadRisk: "medium",
    urgency: "treat_soon",
    pixelSignatures: { green: 0.45, brown: 0.05, yellow: 0.1, white: 0.3, red: 0.1 },
  },
  bacterial_wilt: {
    diseaseKey: "bacterial_wilt",
    diseaseName: "Bacterial Wilt",
    scientificName: "Ralstonia solanacearum",
    description: "Bacterial disease causing wilting and vascular discoloration.",
    symptoms: ["Wilting of leaves", "Vascular discoloration", "Plant collapse"],
    treatments: {
      chemical: "No effective chemical treatment",
      biological: "Use Bacillus subtilis",
      cultural: "Remove infected plants, control insect vectors, crop rotation",
    },
    preventionTips: ["Use resistant varieties", "Control insect vectors", "Crop rotation"],
    yieldImpact: "50-100% yield loss if untreated",
    spreadRisk: "high",
    urgency: "treat_immediately",
    pixelSignatures: { green: 0.3, brown: 0.2, yellow: 0.25, white: 0.15, red: 0.1 },
  },
  verticillium_wilt: {
    diseaseKey: "verticillium_wilt",
    diseaseName: "Verticillium Wilt",
    scientificName: "Verticillium dahliae",
    description: "Fungal disease causing wilting and vascular discoloration.",
    symptoms: ["Wilting of leaves", "Vascular discoloration", "Affects one side of plant first"],
    treatments: {
      chemical: "No effective chemical treatment",
      biological: "Use Bacillus subtilis",
      cultural: "Remove infected plants, improve drainage, crop rotation",
    },
    preventionTips: ["Use resistant varieties", "Crop rotation", "Remove infected plants"],
    yieldImpact: "20-40% yield loss if untreated",
    spreadRisk: "medium",
    urgency: "treat_soon",
    pixelSignatures: { green: 0.35, brown: 0.2, yellow: 0.2, white: 0.15, red: 0.1 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// TOMATO (Solanum lycopersicum)
// ═══════════════════════════════════════════════════════════════════════════

export const TOMATO_DISEASES: Record<string, DiseaseInfo> = {
  healthy: {
    diseaseKey: "healthy",
    diseaseName: "Healthy",
    scientificName: "N/A",
    description: "No disease detected. Leaf is healthy.",
    symptoms: ["Green coloration", "No spots or lesions", "Normal leaf structure"],
    treatments: { chemical: "None required", biological: "None required", cultural: "Maintain good field management" },
    preventionTips: ["Continue regular monitoring", "Maintain proper irrigation", "Ensure good drainage"],
    yieldImpact: "No impact",
    spreadRisk: "low",
    urgency: "monitor",
    pixelSignatures: { green: 0.75, brown: 0.05, yellow: 0.05, white: 0.05, red: 0.1 },
  },
  early_blight_tomato: {
    diseaseKey: "early_blight_tomato",
    diseaseName: "Early Blight",
    scientificName: "Alternaria solani",
    description: "Fungal disease causing brown spots with concentric rings on tomato leaves.",
    symptoms: ["Brown spots with concentric rings", "Yellow halo around spots", "Affects lower leaves first"],
    treatments: {
      chemical: "Apply mancozeb 75 WP at 2 g/L or chlorothalonil 75 WP at 2 g/L",
      biological: "Use Bacillus subtilis or Trichoderma harzianum",
      cultural: "Remove infected leaves, improve air circulation, avoid overhead irrigation",
    },
    preventionTips: ["Use resistant varieties", "Remove infected leaves", "Improve air circulation"],
    yieldImpact: "10-20% yield loss if untreated",
    spreadRisk: "high",
    urgency: "treat_soon",
    pixelSignatures: { green: 0.4, brown: 0.3, yellow: 0.15, white: 0.1, red: 0.05 },
  },
  late_blight_tomato: {
    diseaseKey: "late_blight_tomato",
    diseaseName: "Late Blight",
    scientificName: "Phytophthora infestans",
    description: "Oomycete disease causing water-soaked lesions on tomato leaves.",
    symptoms: ["Water-soaked lesions", "White fungal growth on leaf undersides", "Rapid leaf collapse"],
    treatments: {
      chemical: "Apply metalaxyl 8 EC at 1.5 mL/L or mancozeb 75 WP at 2 g/L",
      biological: "Limited biological options",
      cultural: "Remove infected plants, improve drainage, avoid overhead irrigation",
    },
    preventionTips: ["Use resistant varieties", "Avoid overhead irrigation", "Remove infected plants"],
    yieldImpact: "30-50% yield loss if untreated",
    spreadRisk: "high",
    urgency: "treat_immediately",
    pixelSignatures: { green: 0.25, brown: 0.15, yellow: 0.2, white: 0.3, red: 0.1 },
  },
  septoria_leaf_spot: {
    diseaseKey: "septoria_leaf_spot",
    diseaseName: "Septoria Leaf Spot",
    scientificName: "Septoria lycopersici",
    description: "Fungal disease causing small circular spots on tomato leaves.",
    symptoms: ["Small circular spots", "Spots have dark border and gray center", "Pycnidia visible in center"],
    treatments: {
      chemical: "Apply mancozeb 75 WP at 2 g/L or chlorothalonil 75 WP at 2 g/L",
      biological: "Use Bacillus subtilis",
      cultural: "Remove infected leaves, improve air circulation, avoid overhead irrigation",
    },
    preventionTips: ["Use resistant varieties", "Remove infected leaves", "Improve air circulation"],
    yieldImpact: "10-20% yield loss if untreated",
    spreadRisk: "high",
    urgency: "treat_soon",
    pixelSignatures: { green: 0.45, brown: 0.15, yellow: 0.1, white: 0.2, red: 0.1 },
  },
  bacterial_speck: {
    diseaseKey: "bacterial_speck",
    diseaseName: "Bacterial Speck",
    scientificName: "Pseudomonas syringae",
    description: "Bacterial disease causing small dark spots on tomato leaves.",
    symptoms: ["Small dark spots", "Yellow halo around spots", "Spots coalesce"],
    treatments: {
      chemical: "Apply copper oxychloride 50 WP at 2.5 g/L or streptomycin 90 WP at 0.3 g/L",
      biological: "Use Bacillus subtilis",
      cultural: "Remove infected plants, improve drainage, avoid overhead irrigation",
    },
    preventionTips: ["Use resistant varieties", "Avoid overhead irrigation", "Remove infected plants"],
    yieldImpact: "10-20% yield loss if untreated",
    spreadRisk: "medium",
    urgency: "treat_soon",
    pixelSignatures: { green: 0.45, brown: 0.2, yellow: 0.15, white: 0.1, red: 0.1 },
  },
  powdery_mildew_tomato: {
    diseaseKey: "powdery_mildew_tomato",
    diseaseName: "Powdery Mildew",
    scientificName: "Oidium lycopersicum",
    description: "Fungal disease causing white powdery coating on tomato leaves.",
    symptoms: ["White powdery coating", "Coating on both leaf surfaces", "Affects upper leaves first"],
    treatments: {
      chemical: "Apply sulfur 80 WP at 2 g/L or triadimefon 25 EC at 1 mL/L",
      biological: "Use Bacillus subtilis",
      cultural: "Improve air circulation, avoid excessive nitrogen, remove infected debris",
    },
    preventionTips: ["Use resistant varieties", "Maintain proper spacing", "Avoid excessive nitrogen"],
    yieldImpact: "5-15% yield loss if untreated",
    spreadRisk: "medium",
    urgency: "treat_soon",
    pixelSignatures: { green: 0.45, brown: 0.05, yellow: 0.1, white: 0.3, red: 0.1 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// SOYBEAN (Glycine max)
// ═══════════════════════════════════════════════════════════════════════════

export const SOYBEAN_DISEASES: Record<string, DiseaseInfo> = {
  healthy: {
    diseaseKey: "healthy",
    diseaseName: "Healthy",
    scientificName: "N/A",
    description: "No disease detected. Leaf is healthy.",
    symptoms: ["Green coloration", "No spots or lesions", "Normal leaf structure"],
    treatments: { chemical: "None required", biological: "None required", cultural: "Maintain good field management" },
    preventionTips: ["Continue regular monitoring", "Maintain proper irrigation", "Ensure good drainage"],
    yieldImpact: "No impact",
    spreadRisk: "low",
    urgency: "monitor",
    pixelSignatures: { green: 0.75, brown: 0.05, yellow: 0.05, white: 0.05, red: 0.1 },
  },
  asian_rust: {
    diseaseKey: "asian_rust",
    diseaseName: "Asian Rust",
    scientificName: "Phakopsora meibomiae",
    description: "Fungal disease causing rust-colored pustules on soybean leaves.",
    symptoms: ["Rust-colored pustules", "Pustules on leaf undersides", "Affected leaves turn yellow"],
    treatments: {
      chemical: "Apply azoxystrobin 23 SC at 1 mL/L or tebuconazole 25 EC at 1 mL/L",
      biological: "Limited biological options",
      cultural: "Remove infected debris, improve air circulation, crop rotation",
    },
    preventionTips: ["Use resistant varieties", "Monitor regularly", "Remove infected leaves"],
    yieldImpact: "20-40% yield loss if untreated",
    spreadRisk: "high",
    urgency: "treat_immediately",
    pixelSignatures: { green: 0.3, brown: 0.15, yellow: 0.2, white: 0.1, red: 0.25 },
  },
  frogeye_leaf_spot: {
    diseaseKey: "frogeye_leaf_spot",
    diseaseName: "Frogeye Leaf Spot",
    scientificName: "Cercospora sojina",
    description: "Fungal disease causing circular lesions with red borders on soybean leaves.",
    symptoms: ["Circular lesions", "Red or brown borders", "Gray center with dark rings"],
    treatments: {
      chemical: "Apply mancozeb 75 WP at 2 g/L or chlorothalonil 75 WP at 2 g/L",
      biological: "Use Trichoderma harzianum",
      cultural: "Remove infected debris, improve air circulation, crop rotation",
    },
    preventionTips: ["Use resistant varieties", "Crop rotation", "Remove infected debris"],
    yieldImpact: "10-20% yield loss if untreated",
    spreadRisk: "medium",
    urgency: "treat_soon",
    pixelSignatures: { green: 0.4, brown: 0.15, yellow: 0.15, white: 0.2, red: 0.1 },
  },
  anthracnose_soybean: {
    diseaseKey: "anthracnose_soybean",
    diseaseName: "Anthracnose",
    scientificName: "Colletotrichum truncatum",
    description: "Fungal disease causing small dark lesions on soybean leaves.",
    symptoms: ["Small dark lesions", "Lesions have yellow halo", "Affects lower leaves first"],
    treatments: {
      chemical: "Apply azoxystrobin 23 SC at 1 mL/L",
      biological: "Use Bacillus subtilis",
      cultural: "Remove infected debris, improve air circulation, crop rotation",
    },
    preventionTips: ["Use resistant varieties", "Crop rotation", "Remove infected debris"],
    yieldImpact: "5-15% yield loss if untreated",
    spreadRisk: "medium",
    urgency: "treat_soon",
    pixelSignatures: { green: 0.5, brown: 0.15, yellow: 0.15, white: 0.1, red: 0.1 },
  },
  septoria_brown_spot: {
    diseaseKey: "septoria_brown_spot",
    diseaseName: "Septoria Brown Spot",
    scientificName: "Septoria glycines",
    description: "Fungal disease causing brown spots on soybean leaves.",
    symptoms: ["Brown spots", "Spots have dark borders", "Pycnidia visible in center"],
    treatments: {
      chemical: "Apply mancozeb 75 WP at 2 g/L or chlorothalonil 75 WP at 2 g/L",
      biological: "Use Bacillus subtilis",
      cultural: "Remove infected debris, improve air circulation, crop rotation",
    },
    preventionTips: ["Use resistant varieties", "Crop rotation", "Remove infected debris"],
    yieldImpact: "5-15% yield loss if untreated",
    spreadRisk: "low",
    urgency: "monitor",
    pixelSignatures: { green: 0.45, brown: 0.25, yellow: 0.1, white: 0.1, red: 0.1 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// APPLE (Malus domestica)
// ═══════════════════════════════════════════════════════════════════════════

export const APPLE_DISEASES: Record<string, DiseaseInfo> = {
  healthy: {
    diseaseKey: "healthy",
    diseaseName: "Healthy",
    scientificName: "N/A",
    description: "No disease detected. Leaf is healthy.",
    symptoms: ["Green coloration", "No spots or lesions", "Normal leaf structure"],
    treatments: { chemical: "None required", biological: "None required", cultural: "Maintain good field management" },
    preventionTips: ["Continue regular monitoring", "Maintain proper irrigation", "Ensure good drainage"],
    yieldImpact: "No impact",
    spreadRisk: "low",
    urgency: "monitor",
    pixelSignatures: { green: 0.75, brown: 0.05, yellow: 0.05, white: 0.05, red: 0.1 },
  },
  apple_scab: {
    diseaseKey: "apple_scab",
    diseaseName: "Apple Scab",
    scientificName: "Venturia inaequalis",
    description: "Fungal disease causing olive-green spots on apple leaves.",
    symptoms: ["Olive-green spots", "Spots become brown and scabby", "Affects both leaves and fruit"],
    treatments: {
      chemical: "Apply mancozeb 75 WP at 2 g/L or captan 50 WP at 2 g/L",
      biological: "Use Bacillus subtilis",
      cultural: "Remove infected debris, improve air circulation, prune branches",
    },
    preventionTips: ["Use resistant varieties", "Remove infected debris", "Improve air circulation"],
    yieldImpact: "10-30% yield loss if untreated",
    spreadRisk: "high",
    urgency: "treat_soon",
    pixelSignatures: { green: 0.4, brown: 0.25, yellow: 0.15, white: 0.1, red: 0.1 },
  },
  powdery_mildew_apple: {
    diseaseKey: "powdery_mildew_apple",
    diseaseName: "Powdery Mildew",
    scientificName: "Podosphaera leucotricha",
    description: "Fungal disease causing white powdery coating on apple leaves.",
    symptoms: ["White powdery coating", "Coating on both leaf surfaces", "Affects young leaves first"],
    treatments: {
      chemical: "Apply sulfur 80 WP at 2 g/L or triadimefon 25 EC at 1 mL/L",
      biological: "Use Bacillus subtilis",
      cultural: "Improve air circulation, prune branches, avoid excessive nitrogen",
    },
    preventionTips: ["Use resistant varieties", "Prune branches", "Avoid excessive nitrogen"],
    yieldImpact: "5-15% yield loss if untreated",
    spreadRisk: "medium",
    urgency: "treat_soon",
    pixelSignatures: { green: 0.45, brown: 0.05, yellow: 0.1, white: 0.3, red: 0.1 },
  },
  cedar_apple_rust: {
    diseaseKey: "cedar_apple_rust",
    diseaseName: "Cedar Apple Rust",
    scientificName: "Gymnosporangium juniperi-virginianae",
    description: "Fungal disease causing yellow spots with red borders on apple leaves.",
    symptoms: ["Yellow spots with red borders", "Orange pustules on leaf undersides", "Affects fruit"],
    treatments: {
      chemical: "Apply azoxystrobin 23 SC at 1 mL/L during early season",
      biological: "Limited biological options",
      cultural: "Remove infected debris, prune branches, remove cedar trees nearby",
    },
    preventionTips: ["Use resistant varieties", "Remove cedar trees", "Prune branches"],
    yieldImpact: "10-20% yield loss if untreated",
    spreadRisk: "medium",
    urgency: "treat_soon",
    pixelSignatures: { green: 0.35, brown: 0.1, yellow: 0.25, white: 0.15, red: 0.15 },
  },
  fire_blight: {
    diseaseKey: "fire_blight",
    diseaseName: "Fire Blight",
    scientificName: "Erwinia amylovora",
    description: "Bacterial disease causing wilting and blackening of apple branches.",
    symptoms: ["Wilting of leaves", "Blackening of branches", "Cankers on branches"],
    treatments: {
      chemical: "Apply streptomycin 90 WP at 0.3 g/L during flowering",
      biological: "Limited biological options",
      cultural: "Prune infected branches, disinfect tools, avoid overhead irrigation",
    },
    preventionTips: ["Use resistant varieties", "Prune infected branches", "Disinfect tools"],
    yieldImpact: "20-40% yield loss if untreated",
    spreadRisk: "high",
    urgency: "treat_immediately",
    pixelSignatures: { green: 0.25, brown: 0.35, yellow: 0.15, white: 0.15, red: 0.1 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// GRAPE (Vitis species)
// ═══════════════════════════════════════════════════════════════════════════

export const GRAPE_DISEASES: Record<string, DiseaseInfo> = {
  healthy: {
    diseaseKey: "healthy",
    diseaseName: "Healthy",
    scientificName: "N/A",
    description: "No disease detected. Leaf is healthy.",
    symptoms: ["Green coloration", "No spots or lesions", "Normal leaf structure"],
    treatments: { chemical: "None required", biological: "None required", cultural: "Maintain good field management" },
    preventionTips: ["Continue regular monitoring", "Maintain proper irrigation", "Ensure good drainage"],
    yieldImpact: "No impact",
    spreadRisk: "low",
    urgency: "monitor",
    pixelSignatures: { green: 0.75, brown: 0.05, yellow: 0.05, white: 0.05, red: 0.1 },
  },
  powdery_mildew_grape: {
    diseaseKey: "powdery_mildew_grape",
    diseaseName: "Powdery Mildew",
    scientificName: "Erysiphe necator",
    description: "Fungal disease causing white powdery coating on grape leaves.",
    symptoms: ["White powdery coating", "Coating on both leaf surfaces", "Affects young leaves first"],
    treatments: {
      chemical: "Apply sulfur 80 WP at 2 g/L or triadimefon 25 EC at 1 mL/L",
      biological: "Use Bacillus subtilis",
      cultural: "Improve air circulation, prune branches, avoid excessive nitrogen",
    },
    preventionTips: ["Use resistant varieties", "Prune branches", "Avoid excessive nitrogen"],
    yieldImpact: "10-25% yield loss if untreated",
    spreadRisk: "high",
    urgency: "treat_soon",
    pixelSignatures: { green: 0.45, brown: 0.05, yellow: 0.1, white: 0.3, red: 0.1 },
  },
  downy_mildew_grape: {
    diseaseKey: "downy_mildew_grape",
    diseaseName: "Downy Mildew",
    scientificName: "Plasmopara viticola",
    description: "Oomycete disease causing white fungal growth on grape leaf undersides.",
    symptoms: ["Yellow spots on upper leaf surface", "White fungal growth on undersides", "Affected leaves drop"],
    treatments: {
      chemical: "Apply metalaxyl 8 EC at 1.5 mL/L or mancozeb 75 WP at 2 g/L",
      biological: "Limited biological options",
      cultural: "Improve air circulation, prune branches, avoid overhead irrigation",
    },
    preventionTips: ["Use resistant varieties", "Improve air circulation", "Avoid overhead irrigation"],
    yieldImpact: "20-40% yield loss if untreated",
    spreadRisk: "high",
    urgency: "treat_immediately",
    pixelSignatures: { green: 0.3, brown: 0.1, yellow: 0.25, white: 0.25, red: 0.1 },
  },
  black_rot_grape: {
    diseaseKey: "black_rot_grape",
    diseaseName: "Black Rot",
    scientificName: "Guignardia bidwellii",
    description: "Fungal disease causing brown spots on grape leaves.",
    symptoms: ["Brown spots with dark borders", "Spots coalesce", "Affects fruit and shoots"],
    treatments: {
      chemical: "Apply mancozeb 75 WP at 2 g/L or chlorothalonil 75 WP at 2 g/L",
      biological: "Use Bacillus subtilis",
      cultural: "Remove infected debris, improve air circulation, prune branches",
    },
    preventionTips: ["Use resistant varieties", "Remove infected debris", "Improve air circulation"],
    yieldImpact: "15-30% yield loss if untreated",
    spreadRisk: "high",
    urgency: "treat_soon",
    pixelSignatures: { green: 0.35, brown: 0.3, yellow: 0.15, white: 0.1, red: 0.1 },
  },
  anthracnose_grape: {
    diseaseKey: "anthracnose_grape",
    diseaseName: "Anthracnose",
    scientificName: "Elsinoe ampelina",
    description: "Fungal disease causing small dark lesions on grape leaves.",
    symptoms: ["Small dark lesions", "Lesions have light center", "Affects shoots and fruit"],
    treatments: {
      chemical: "Apply mancozeb 75 WP at 2 g/L or captan 50 WP at 2 g/L",
      biological: "Use Bacillus subtilis",
      cultural: "Remove infected debris, improve air circulation, prune branches",
    },
    preventionTips: ["Use resistant varieties", "Remove infected debris", "Improve air circulation"],
    yieldImpact: "10-20% yield loss if untreated",
    spreadRisk: "medium",
    urgency: "treat_soon",
    pixelSignatures: { green: 0.45, brown: 0.2, yellow: 0.1, white: 0.15, red: 0.1 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// PLANT TYPES REGISTRY
// ═══════════════════════════════════════════════════════════════════════════

export const PLANT_TYPES: Record<string, PlantType> = {
  rice: {
    id: "rice",
    name: "Rice",
    scientificName: "Oryza sativa",
    icon: "🌾",
    color: "emerald",
    diseases: RICE_DISEASES,
  },
  wheat: {
    id: "wheat",
    name: "Wheat",
    scientificName: "Triticum aestivum",
    icon: "🌾",
    color: "amber",
    diseases: WHEAT_DISEASES,
  },
  corn: {
    id: "corn",
    name: "Corn",
    scientificName: "Zea mays",
    icon: "🌽",
    color: "yellow",
    diseases: CORN_DISEASES,
  },
  potato: {
    id: "potato",
    name: "Potato",
    scientificName: "Solanum tuberosum",
    icon: "🥔",
    color: "orange",
    diseases: POTATO_DISEASES,
  },
  tomato: {
    id: "tomato",
    name: "Tomato",
    scientificName: "Solanum lycopersicum",
    icon: "🍅",
    color: "red",
    diseases: TOMATO_DISEASES,
  },
  soybean: {
    id: "soybean",
    name: "Soybean",
    scientificName: "Glycine max",
    icon: "🌱",
    color: "green",
    diseases: SOYBEAN_DISEASES,
  },
  apple: {
    id: "apple",
    name: "Apple",
    scientificName: "Malus domestica",
    icon: "🍎",
    color: "red",
    diseases: APPLE_DISEASES,
  },
  grape: {
    id: "grape",
    name: "Grape",
    scientificName: "Vitis species",
    icon: "🍇",
    color: "purple",
    diseases: GRAPE_DISEASES,
  },
};

/**
 * Get all plant types
 */
export function getAllPlantTypes(): PlantType[] {
  return Object.values(PLANT_TYPES);
}

/**
 * Get plant type by ID
 */
export function getPlantType(plantId: string): PlantType | undefined {
  return PLANT_TYPES[plantId];
}

/**
 * Get diseases for a plant
 */
export function getPlantDiseases(plantId: string): Record<string, DiseaseInfo> {
  const plant = PLANT_TYPES[plantId];
  return plant ? plant.diseases : {};
}

/**
 * Get specific disease info
 */
export function getDiseaseInfo(plantId: string, diseaseKey: string): DiseaseInfo | undefined {
  const plant = PLANT_TYPES[plantId];
  return plant ? plant.diseases[diseaseKey] : undefined;
}

/**
 * Get total disease count
 */
export function getTotalDiseaseCount(): number {
  return Object.values(PLANT_TYPES).reduce((sum, plant) => sum + Object.keys(plant.diseases).length, 0);
}
