/**
 * TensorFlow-Based Leaf Validator
 * Uses MobileNet v2 to detect if image contains a plant/leaf
 * More accurate than manual feature detection
 */

let model: any = null;

/**
 * Load the MobileNet model (runs once, cached)
 */
async function loadModel() {
  if (model) return model;

  try {
    // Import TensorFlow first
    await import("@tensorflow/tfjs");
    const mobilenet = await import("@tensorflow-models/mobilenet");
    
    // Load model with timeout
    const loadPromise = mobilenet.load({
      version: 2,
      alpha: 0.75,
    });
    
    // Set 30 second timeout for model loading
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Model loading timeout")), 30000)
    );
    
    model = await Promise.race([loadPromise, timeoutPromise]);
    console.log("MobileNet model loaded successfully");
    return model;
  } catch (error) {
    console.error("Failed to load MobileNet model:", error);
    model = null;
    throw new Error("ML model loading failed");
  }
}

export interface TFValidationResult {
  isPlant: boolean;
  confidence: number;
  topPredictions: Array<{
    className: string;
    probability: number;
  }>;
  reason: string;
}

/**
 * Plant-related keywords to identify in MobileNet predictions
 */
const PLANT_KEYWORDS = [
  "plant",
  "leaf",
  "leaves",
  "flower",
  "herb",
  "vegetable",
  "crop",
  "grass",
  "weed",
  "moss",
  "fern",
  "succulent",
  "cactus",
  "tree",
  "shrub",
  "bush",
  "vine",
  "seedling",
  "sprout",
  "shoot",
  "foliage",
  "flora",
  "botanical",
  "rice",
  "wheat",
  "corn",
  "maize",
  "potato",
  "tomato",
  "cabbage",
  "cassava",
  "coconut",
  "pineapple",
  "cacao",
  "coffee",
  "rubber",
  "soybean",
  "apple",
  "grape",
  "stem",
  "stalk",
  "blade",
  "frond",
  "petal",
  "sepal",
  "bud",
  "branch",
  "twig",
  "root",
  "tuber",
  "bulb",
  "lettuce",
  "spinach",
  "kale",
  "broccoli",
  "cauliflower",
  "carrot",
  "beet",
  "onion",
  "garlic",
  "pepper",
  "eggplant",
  "cucumber",
  "zucchini",
  "squash",
  "pumpkin",
  "melon",
  "watermelon",
  "strawberry",
  "raspberry",
  "blueberry",
  "blackberry",
  "orange",
  "lemon",
  "lime",
  "banana",
  "mango",
  "papaya",
  "pineapple",
  "avocado",
  "olive",
  "almond",
  "walnut",
  "pecan",
  "hazelnut",
  "chestnut",
  "sunflower",
  "daisy",
  "rose",
  "tulip",
  "daffodil",
  "lily",
  "orchid",
  "hibiscus",
  "jasmine",
  "lavender",
  "fruit",
  "berry",
  "citrus",
  "stone fruit",
  "drupe",
  "pome",
  "aggregate",
  "pod",
  "legume",
  "seed",
  "grain",
  "kernel",
  "nut",
  "berry",
  "stone",
  "pit",
  "flesh",
  "rind",
  "peel",
  "skin",
  "husk",
  "chaff",
  "blossom",
  "bloom",
  "inflorescence",
  "panicle",
  "spike",
  "raceme",
  "corymb",
  "umbel",
  "cyme",
  "catkin",
  "cone",
  "berry rot",
  "fruit rot",
  "anthracnose",
  "blossom end rot",
  "canker",
  "lesion",
  "necrosis",
  "chlorosis",
  "yellowing",
  "browning",
  "spotting",
  "mottling",
  "mosaic",
  "wilting",
  "withering",
  "defoliation",
  "premature drop",
  "fruit drop",
  "leaf drop",
  "mint",
  "basil",
  "oregano",
  "thyme",
  "rosemary",
  "sage",
  "parsley",
  "cilantro",
  "dill",
  "sugarcane",
  "sugar cane",
  "sweet potato",
  "taro",
  "chili",
  "chilli",
  "pepper",
  "hot pepper",
  "bell pepper",
  "capsicum",
  "corm",
  "rhizome",
  "tuber",
  "root crop",
  "stalk disease",
  "red rot",
  "smut",
  "leaf scald",
  "panama disease",
  "fusarium wilt",
  "sigatoka",
  "moko disease",
  "phytophthora",
  "phytophthora blight",
  "gall midge",
  "bacterial spot",
  "powdery mildew",
  "rust",
  "pod blight",
  "soft rot",
  "corm rot",
  "leaf blight",
];

/**
 * Validates if image contains a plant using TensorFlow MobileNet
 */
export async function validateLeafImageTF(blob: Blob): Promise<TFValidationResult> {
  try {
    const model = await loadModel();

    // Convert blob to image element
    const img = new Image();
    const url = URL.createObjectURL(blob);

    return new Promise((resolve) => {
      img.onload = async () => {
        try {
          // Get predictions from MobileNet
          const predictions = await model.classify(img);

          // Check if any top predictions match plant keywords
          let plantScore = 0;
          const topPredictions = predictions.slice(0, 10); // Check top 10 instead of 5

          for (const pred of topPredictions) {
            const className = pred.className.toLowerCase();
            const isPlantRelated = PLANT_KEYWORDS.some((keyword) =>
              className.includes(keyword)
            );

            if (isPlantRelated) {
              plantScore = Math.max(plantScore, pred.probability);
            }
          }

          // Lower threshold and be more permissive
          const threshold = 0.10; // 10% confidence threshold (very lenient)
          const isPlant = plantScore > threshold || plantScore > 0; // Accept any plant-related prediction

          let reason = "";
          if (isPlant) {
            reason = `Plant detected with ${(plantScore * 100).toFixed(0)}% confidence`;
          } else {
            const topClass = topPredictions[0]?.className || "unknown";
            reason = `Image appears to be ${topClass}, not a plant. Please photograph a plant (leaf, fruit, stem, or flower).`;
          }

          URL.revokeObjectURL(url);

          resolve({
            isPlant,
            confidence: plantScore,
            topPredictions: topPredictions.map((p: any) => ({
              className: p.className,
              probability: p.probability,
            })),
            reason,
          });
        } catch (error) {
          console.error("TF validation error:", error);
          URL.revokeObjectURL(url);
          resolve({
            isPlant: true, // Fallback: allow if ML fails
            confidence: 0,
            topPredictions: [],
            reason: "ML validation unavailable - proceeding with caution",
          });
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({
          isPlant: false,
          confidence: 0,
          topPredictions: [],
          reason: "Cannot load image",
        });
      };

      img.src = url;
    });
  } catch (error) {
    console.error("TF model error:", error);
    // Fallback: if ML fails, allow the image (better UX than blocking)
    return {
      isPlant: true,
      confidence: 0,
      topPredictions: [],
      reason: "ML model unavailable - proceeding with local detection",
    };
  }
}
