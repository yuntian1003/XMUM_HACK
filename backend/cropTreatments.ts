/**
 * Crop-Specific Disease Treatment Recommendations
 * Provides tailored treatment, prevention, and management strategies for all 17 ASEAN crops
 */

export const CROP_TREATMENTS: Record<string, any> = {
  rice: {
    name: "Rice",
    region: "Southeast Asia",
    season: "Year-round (monsoon dependent)",
    treatments: {
      bacterial_leaf_blight: {
        chemical: "Copper oxychloride 50% WP: 2.5g/L spray every 7-10 days. Streptomycin sulfate 90% WP: 1g/L for early infection.",
        biological: "Bacillus subtilis (Serenade): 2-3 applications at 10-day intervals. Pseudomonas fluorescens: 10^8 CFU/mL",
        cultural: "Use resistant varieties (IR64, Samba Mahsuri). Remove infected leaves. Avoid overhead irrigation. Crop rotation with legumes.",
        dosage: "2.5-3g per liter of water",
        frequency: "Every 7-10 days for 3-4 weeks",
        costPerHa: "$15-25",
        expectedRecovery: "60-70% within 2-3 weeks"
      },
      brown_spot: {
        chemical: "Mancozeb 75% WP: 2g/L. Carbendazim 50% WP: 1g/L spray",
        biological: "Trichoderma harzianum: Soil application 10^6 CFU/g",
        cultural: "Improve drainage. Remove infected debris. Use clean seeds. Balanced fertilization (avoid excess N).",
        dosage: "2g per liter",
        frequency: "Every 10-14 days",
        costPerHa: "$10-18",
        expectedRecovery: "70-80% within 3 weeks"
      }
    }
  },

  cassava: {
    name: "Cassava",
    region: "Southeast Asia",
    season: "Year-round",
    treatments: {
      cassava_brown_streak: {
        chemical: "Insecticide for whitefly vector: Imidacloprid 17.8% SL: 0.5mL/L",
        biological: "Entomopathogenic fungi: Beauveria bassiana for whitefly control",
        cultural: "Use virus-free cuttings. Remove infected plants. Control whitefly population. Intercropping with maize.",
        dosage: "0.5mL per liter",
        frequency: "Every 14 days",
        costPerHa: "$12-20",
        expectedRecovery: "Prevention-focused (remove infected plants)"
      },
      cassava_leaf_spot: {
        chemical: "Mancozeb 75% WP: 2.5g/L. Chlorothalonil 75% WP: 2g/L",
        biological: "Trichoderma viride: 10^6 CFU/g soil application",
        cultural: "Improve drainage. Prune lower leaves. Destroy infected leaves. Avoid overhead irrigation.",
        dosage: "2.5g per liter",
        frequency: "Every 14-21 days",
        costPerHa: "$8-15",
        expectedRecovery: "70-75% within 3-4 weeks"
      }
    }
  },

  corn: {
    name: "Corn",
    region: "Southeast Asia",
    season: "Dry and wet seasons",
    treatments: {
      corn_leaf_blight: {
        chemical: "Mancozeb 75% WP: 2.5g/L. Propiconazole 25% EC: 1mL/L",
        biological: "Bacillus subtilis: 10^8 CFU/mL spray",
        cultural: "Use resistant hybrids. Remove infected leaves. Crop rotation. Proper spacing for air circulation.",
        dosage: "2.5g per liter",
        frequency: "Every 10-14 days",
        costPerHa: "$14-22",
        expectedRecovery: "65-75% within 2-3 weeks"
      },
      corn_rust: {
        chemical: "Sulfur powder: 2.5-3kg/ha dust. Azoxystrobin 25% SC: 1mL/L",
        biological: "Bacillus megaterium: Foliar application",
        cultural: "Early planting. Use resistant varieties. Remove infected leaves. Avoid overhead irrigation.",
        dosage: "2.5-3kg per hectare",
        frequency: "Every 7-10 days",
        costPerHa: "$10-18",
        expectedRecovery: "60-70% within 2-3 weeks"
      }
    }
  },

  coconut: {
    name: "Coconut",
    region: "Southeast Asia",
    season: "Year-round",
    treatments: {
      coconut_leaf_spot: {
        chemical: "Copper oxychloride 50% WP: 2.5g/L. Mancozeb 75% WP: 2g/L",
        biological: "Trichoderma harzianum: Soil and foliar application",
        cultural: "Remove infected fronds. Improve drainage. Avoid overhead irrigation. Balanced fertilization.",
        dosage: "2.5g per liter",
        frequency: "Every 14-21 days",
        costPerHa: "$15-25",
        expectedRecovery: "70-80% within 3-4 weeks"
      }
    }
  },

  pineapple: {
    name: "Pineapple",
    region: "Southeast Asia",
    season: "Year-round",
    treatments: {
      pineapple_leaf_spot: {
        chemical: "Mancozeb 75% WP: 2.5g/L. Copper oxychloride 50% WP: 2g/L",
        biological: "Trichoderma harzianum: 10^6 CFU/g",
        cultural: "Improve air circulation. Remove infected leaves. Avoid overhead irrigation. Proper spacing.",
        dosage: "2.5g per liter",
        frequency: "Every 14-21 days",
        costPerHa: "$12-20",
        expectedRecovery: "75-85% within 3 weeks"
      }
    }
  },

  tomato: {
    name: "Tomato",
    region: "Southeast Asia",
    season: "Cool season (Oct-Mar ideal)",
    treatments: {
      early_blight: {
        chemical: "Mancozeb 75% WP: 2.5g/L. Chlorothalonil 75% WP: 2g/L",
        biological: "Bacillus subtilis: 10^8 CFU/mL",
        cultural: "Remove lower leaves. Improve air circulation. Mulch soil. Avoid overhead irrigation.",
        dosage: "2.5g per liter",
        frequency: "Every 7-10 days",
        costPerHa: "$18-28",
        expectedRecovery: "65-75% within 2-3 weeks"
      },
      late_blight: {
        chemical: "Metalaxyl + Mancozeb: 2.5g/L. Copper oxychloride: 2g/L",
        biological: "Bacillus megaterium: Foliar spray",
        cultural: "Remove infected leaves. Improve drainage. Avoid overhead irrigation. Crop rotation.",
        dosage: "2.5g per liter",
        frequency: "Every 7-10 days",
        costPerHa: "$22-32",
        expectedRecovery: "60-70% within 2-3 weeks"
      }
    }
  },

  cabbage: {
    name: "Cabbage",
    region: "Southeast Asia",
    season: "Cool season (Oct-Feb)",
    treatments: {
      cabbage_leaf_spot: {
        chemical: "Mancozeb 75% WP: 2.5g/L. Copper oxychloride 50% WP: 2g/L",
        biological: "Trichoderma harzianum: 10^6 CFU/g",
        cultural: "Remove infected leaves. Improve air circulation. Avoid overhead irrigation. Crop rotation.",
        dosage: "2.5g per liter",
        frequency: "Every 10-14 days",
        costPerHa: "$15-22",
        expectedRecovery: "75-85% within 2-3 weeks"
      }
    }
  },

  cacao: {
    name: "Cacao",
    region: "Southeast Asia",
    season: "Year-round",
    treatments: {
      frosty_pod_rot: {
        chemical: "Copper oxychloride 50% WP: 2.5g/L. Mancozeb 75% WP: 2g/L",
        biological: "Trichoderma harzianum: Soil and foliar application",
        cultural: "Remove infected pods. Improve drainage. Pruning for air circulation. Shade management.",
        dosage: "2.5g per liter",
        frequency: "Every 14-21 days",
        costPerHa: "$25-35",
        expectedRecovery: "60-70% (prevention important)"
      }
    }
  },

  coffee: {
    name: "Coffee",
    region: "Southeast Asia",
    season: "Year-round",
    treatments: {
      coffee_leaf_rust: {
        chemical: "Copper oxychloride 50% WP: 2.5g/L. Sulfur powder: 2-3kg/ha",
        biological: "Bacillus subtilis: Foliar spray 10^8 CFU/mL",
        cultural: "Improve air circulation. Remove infected leaves. Shade management. Pruning.",
        dosage: "2.5g per liter",
        frequency: "Every 14-21 days",
        costPerHa: "$18-28",
        expectedRecovery: "70-80% within 3-4 weeks"
      }
    }
  },

  rubber: {
    name: "Rubber",
    region: "Southeast Asia",
    season: "Year-round",
    treatments: {
      rubber_leaf_disease: {
        chemical: "Copper oxychloride 50% WP: 2.5g/L. Mancozeb 75% WP: 2g/L",
        biological: "Trichoderma harzianum: 10^6 CFU/g",
        cultural: "Improve air circulation. Remove infected leaves. Pruning. Avoid overhead irrigation.",
        dosage: "2.5g per liter",
        frequency: "Every 14-21 days",
        costPerHa: "$20-30",
        expectedRecovery: "70-80% within 3-4 weeks"
      }
    }
  },

  sugarcane: {
    name: "Sugarcane",
    region: "Southeast Asia",
    season: "Year-round",
    treatments: {
      sugarcane_red_rot: {
        chemical: "Copper oxychloride 50% WP: 2.5g/L. Carbendazim 50% WP: 1g/L",
        biological: "Bacillus subtilis: Seed treatment",
        cultural: "Use disease-free seed cane. Remove infected plants. Crop rotation. Proper drainage.",
        dosage: "2.5g per liter",
        frequency: "Every 14-21 days",
        costPerHa: "$18-26",
        expectedRecovery: "50-60% (prevention critical)"
      }
    }
  },

  banana: {
    name: "Banana",
    region: "Southeast Asia",
    season: "Year-round",
    treatments: {
      banana_leaf_spot: {
        chemical: "Mancozeb 75% WP: 2.5g/L. Copper oxychloride 50% WP: 2g/L",
        biological: "Trichoderma harzianum: 10^6 CFU/g",
        cultural: "Remove infected leaves. Improve air circulation. Avoid overhead irrigation. Pruning.",
        dosage: "2.5g per liter",
        frequency: "Every 14-21 days",
        costPerHa: "$16-24",
        expectedRecovery: "75-85% within 3 weeks"
      }
    }
  },

  mango: {
    name: "Mango",
    region: "Southeast Asia",
    season: "Year-round",
    treatments: {
      mango_anthracnose: {
        chemical: "Mancozeb 75% WP: 2.5g/L. Copper oxychloride 50% WP: 2g/L",
        biological: "Trichoderma harzianum: 10^6 CFU/g",
        cultural: "Remove infected fruit. Improve air circulation. Prune dead branches. Avoid overhead irrigation.",
        dosage: "2.5g per liter",
        frequency: "Every 14-21 days",
        costPerHa: "$18-26",
        expectedRecovery: "70-80% within 3-4 weeks"
      }
    }
  },

  chili: {
    name: "Chili/Pepper",
    region: "Southeast Asia",
    season: "Year-round (warm season preferred)",
    treatments: {
      chili_leaf_spot: {
        chemical: "Mancozeb 75% WP: 2.5g/L. Copper oxychloride 50% WP: 2g/L",
        biological: "Bacillus subtilis: 10^8 CFU/mL",
        cultural: "Remove infected leaves. Improve air circulation. Avoid overhead irrigation. Crop rotation.",
        dosage: "2.5g per liter",
        frequency: "Every 10-14 days",
        costPerHa: "$16-24",
        expectedRecovery: "75-85% within 2-3 weeks"
      }
    }
  },

  soybean: {
    name: "Soybean",
    region: "Southeast Asia",
    season: "Dry season (Oct-Feb)",
    treatments: {
      soybean_leaf_spot: {
        chemical: "Mancozeb 75% WP: 2.5g/L. Copper oxychloride 50% WP: 2g/L",
        biological: "Bacillus subtilis: 10^8 CFU/mL",
        cultural: "Remove infected leaves. Improve air circulation. Crop rotation. Avoid overhead irrigation.",
        dosage: "2.5g per liter",
        frequency: "Every 10-14 days",
        costPerHa: "$12-18",
        expectedRecovery: "75-85% within 2-3 weeks"
      }
    }
  },

  sweet_potato: {
    name: "Sweet Potato",
    region: "Southeast Asia",
    season: "Year-round",
    treatments: {
      sweet_potato_leaf_spot: {
        chemical: "Mancozeb 75% WP: 2.5g/L. Copper oxychloride 50% WP: 2g/L",
        biological: "Trichoderma harzianum: 10^6 CFU/g",
        cultural: "Remove infected leaves. Improve air circulation. Avoid overhead irrigation. Crop rotation.",
        dosage: "2.5g per liter",
        frequency: "Every 14-21 days",
        costPerHa: "$10-16",
        expectedRecovery: "75-85% within 3 weeks"
      }
    }
  },

  taro: {
    name: "Taro",
    region: "Southeast Asia",
    season: "Year-round (wet season preferred)",
    treatments: {
      taro_leaf_blight: {
        chemical: "Mancozeb 75% WP: 2.5g/L. Copper oxychloride 50% WP: 2g/L",
        biological: "Bacillus subtilis: 10^8 CFU/mL",
        cultural: "Remove infected leaves. Improve drainage. Avoid waterlogging. Crop rotation.",
        dosage: "2.5g per liter",
        frequency: "Every 10-14 days",
        costPerHa: "$14-22",
        expectedRecovery: "75-85% within 2-3 weeks"
      }
    }
  }
};

/**
 * Get crop-specific treatment recommendations
 */
export function getCropTreatment(cropType: string, diseaseKey: string) {
  const crop = CROP_TREATMENTS[cropType];
  if (!crop) return null;
  
  const disease = crop.treatments[diseaseKey];
  if (!disease) return null;
  
  return {
    cropName: crop.name,
    cropRegion: crop.region,
    cropSeason: crop.season,
    ...disease
  };
}

/**
 * Get all available crops for reference
 */
export function getAvailableCrops() {
  return Object.entries(CROP_TREATMENTS).map(([key, crop]) => ({
    key,
    name: crop.name,
    region: crop.region
  }));
}
