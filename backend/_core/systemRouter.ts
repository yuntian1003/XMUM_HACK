import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { identifyPlantSpecies, mapPlantNetToCropType } from "../plantnetService";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  validatePlantImage: publicProcedure
    .input(
      z.object({
        imageBase64: z.string().min(1, "image is required"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Convert base64 to buffer
        const base64Data = input.imageBase64.split(",")[1] || input.imageBase64;
        const imageBuffer = Buffer.from(base64Data, "base64");

        // Identify plant using PlantNet
        const plantNetResult = await identifyPlantSpecies(imageBuffer, "auto");

        if (!plantNetResult) {
          return {
            isPlant: false,
            confidence: 0,
            cropType: null,
            scientificName: "",
            commonNames: [],
            organ: "",
            reason: "PlantNet API unavailable - please try again",
            allResults: [],
          };
        }

        // Map to our crop types
        const cropType = mapPlantNetToCropType(plantNetResult.scientificName);

        return {
          isPlant: plantNetResult.confidence > 0.3,
          confidence: plantNetResult.confidence,
          cropType,
          scientificName: plantNetResult.scientificName,
          commonNames: plantNetResult.commonNames,
          organ: plantNetResult.organ,
          reason:
            plantNetResult.confidence > 0.3
              ? `Plant identified: ${plantNetResult.scientificName} (${(plantNetResult.confidence * 100).toFixed(0)}% confidence)`
              : "Could not identify plant - please ensure the image shows a clear plant leaf",
          allResults: plantNetResult.allResults.map((r) => ({
            score: r.score,
            scientificName: r.scientificName,
            commonNames: r.commonNames,
          })),
        };
      } catch (error) {
        console.error("Plant validation error:", error);
        return {
          isPlant: false,
          confidence: 0,
          cropType: null,
          scientificName: "",
          commonNames: [],
          organ: "",
          reason: "Validation error - please try again",
          allResults: [],
        };
      }
    }),
});
