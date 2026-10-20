import { genkit, z } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
import { Groq } from "groq-sdk";

const treatmentPlanSchema = z.object({
  chemical: z.string().describe("Chemical treatment with practical guidance"),
  biological: z.string().describe("Biological control options"),
  cultural: z.string().describe("Cultural and field hygiene practices"),
});

/** Structured diagnosis returned to the frontend (matches tRPC scan analysis). */
export const plantAnalysisOutputSchema = z.object({
  confirmedDisease: z.string(),
  confirmedDiseaseKey: z.string(),
  confirmedSeverity: z.enum(["healthy", "mild", "moderate", "severe"]),
  confidenceAdjustment: z.string(),
  symptoms: z.array(z.string()),
  immediateActions: z.array(z.string()),
  treatmentPlan: treatmentPlanSchema,
  preventionTips: z.array(z.string()),
  yieldImpact: z.string(),
  spreadRisk: z.enum(["low", "medium", "high"]),
  urgency: z.enum(["monitor", "treat_soon", "treat_immediately"]),
  additionalNotes: z.string(),
});

export type PlantAnalysisOutput = z.infer<typeof plantAnalysisOutputSchema>;

const plantAnalysisInputSchema = z.object({
  imageDataUrl: z.string().describe("Data URL of the crop image (jpeg or png)"),
  detectedCropType: z.string(),
  localDetection: z
    .object({
      plantType: z.string(),
      diseaseKey: z.string(),
      diseaseName: z.string(),
      confidence: z.number(),
      severity: z.enum(["healthy", "mild", "moderate", "severe"]),
    })
    .optional(),
  plantNetSpecies: z
    .object({
      scientificName: z.string(),
      commonNames: z.array(z.string()),
      confidence: z.number(),
      organ: z.string(),
      mappedCrop: z.string().optional(),
    })
    .optional(),
  plantNetDisease: z
    .object({
      diseaseName: z.string(),
      scientificName: z.string().optional(),
      confidence: z.number(),
    })
    .optional(),
  cropVariety: z.string().optional(),
  notes: z.string().optional(),
  plantNetContext: z.string(),
  treatmentContext: z.string(),
});

const apiKey = process.env.GEMINI_API_KEY?.trim();
const groqApiKey = process.env.GROQ_API_KEY?.trim();
const groq = groqApiKey ? new Groq({ apiKey: groqApiKey }) : null;

const ai = genkit({
  plugins: [googleAI(apiKey ? { apiKey } : {})],
});

const extractJsonObject = (value: string): unknown => {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(value);
  const candidate = fenced?.[1] ?? value;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Groq fallback returned no JSON object");
  }

  return JSON.parse(candidate.slice(start, end + 1));
};

const runGroqPlantDiagnosisFallback = async (params: {
  imageDataUrl: string;
  systemPreamble: string;
  taskText: string;
  geminiError: unknown;
}): Promise<PlantAnalysisOutput> => {
  if (!groq) {
    throw new Error(
      `Gemini diagnosis failed and GROQ_API_KEY is not configured. Gemini error: ${String(
        params.geminiError
      )}`
    );
  }

  const model =
    process.env.GROQ_MODEL?.trim() ||
    "meta-llama/llama-4-scout-17b-16e-instruct";
  const fallbackPrompt = `${params.taskText}

Gemini image analysis failed, so use the attached image and the text context above as the fallback vision analysis. Base the diagnosis on the image, local detector, PlantNet signals, farmer notes, and crop-specific treatment context.

Return only valid JSON with exactly these fields:
{
  "confirmedDisease": "string",
  "confirmedDiseaseKey": "short snake_case string",
  "confirmedSeverity": "healthy | mild | moderate | severe",
  "confidenceAdjustment": "string",
  "symptoms": ["string"],
  "immediateActions": ["string"],
  "treatmentPlan": {
    "chemical": "string",
    "biological": "string",
    "cultural": "string"
  },
  "preventionTips": ["string"],
  "yieldImpact": "string",
  "spreadRisk": "low | medium | high",
  "urgency": "monitor | treat_soon | treat_immediately",
  "additionalNotes": "string"
}`;

  const stream = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `${params.systemPreamble}
You are operating as a fallback model for a plant health app. Produce farmer-friendly agronomy output only, never TypeScript or code analysis.`,
      },
      {
        role: "user",
        content: [
          { type: "text", text: fallbackPrompt },
          {
            type: "image_url",
            image_url: { url: params.imageDataUrl, detail: "high" },
          },
        ],
      },
    ],
    model,
    temperature: 0.2,
    max_completion_tokens: 4096,
    response_format: { type: "json_object" },
    stream: true,
  });

  let fullResponse = "";

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    fullResponse += content;
  }

  const parsed = extractJsonObject(fullResponse);
  return plantAnalysisOutputSchema.parse(parsed);
};

/**
 * Genkit flow: (1) assemble agronomy context, (2) multimodal Gemini structured diagnosis.
 */
export const plantDiagnosisFlow = ai.defineFlow(
  {
    name: "plantDiagnosis",
    inputSchema: plantAnalysisInputSchema,
    outputSchema: plantAnalysisOutputSchema,
  },
  async input => {
    const imageDataUrl = input.imageDataUrl?.trim();
    if (!imageDataUrl) {
      throw new Error("plantDiagnosis flow received no imageDataUrl");
    }

    const dataUrlMatch = /^data:([^;]+);base64,([\s\S]+)$/.exec(imageDataUrl);
    const isRemoteUrl = /^https?:\/\//i.test(imageDataUrl);
    const looksLikeBase64 = /^[A-Za-z0-9+/=\r\n]+$/.test(imageDataUrl);

    const media = dataUrlMatch
      ? {
          contentType: dataUrlMatch[1] || "image/jpeg",
          url: imageDataUrl,
        }
      : isRemoteUrl
        ? {
            contentType: "image/jpeg",
            url: imageDataUrl,
          }
        : looksLikeBase64
          ? {
              contentType: "image/jpeg",
              url: `data:image/jpeg;base64,${imageDataUrl.replace(/\s+/g, "")}`,
            }
          : null;

    if (!media) {
      throw new Error("plantDiagnosis flow received an unsupported image payload format");
    }

    const localDetectionText = input.localDetection
      ? `Local detector baseline: crop=${input.localDetection.plantType}, disease=${input.localDetection.diseaseName} (${input.localDetection.diseaseKey}), severity=${input.localDetection.severity}, confidence=${(input.localDetection.confidence * 100).toFixed(0)}%.`
      : "Local detector baseline: unavailable.";

    const plantNetSpeciesText = input.plantNetSpecies
      ? `PlantNet species signal: ${input.plantNetSpecies.scientificName} (${input.plantNetSpecies.commonNames.join(", ") || "no common names"}), mapped crop=${input.plantNetSpecies.mappedCrop || "unknown"}, confidence=${(input.plantNetSpecies.confidence * 100).toFixed(0)}%, organ=${input.plantNetSpecies.organ}.`
      : "PlantNet species signal: unavailable.";

    const plantNetDiseaseText = input.plantNetDisease
      ? `PlantNet disease signal: ${input.plantNetDisease.diseaseName}${input.plantNetDisease.scientificName ? ` (${input.plantNetDisease.scientificName})` : ""}, confidence=${(input.plantNetDisease.confidence * 100).toFixed(0)}%.`
      : "PlantNet disease signal: unavailable.";

    const systemPreamble = `You are an expert agronomist and plant pathologist with 20+ years of experience in Southeast Asian crop cultivation, specializing in ${input.detectedCropType}.
Analyze the image and context. Respond ONLY with structured fields matching the schema (no markdown, no code fences).
Use plain language suitable for farmers. Incorporate crop-specific treatment context when provided.
Treat the local detector and PlantNet as evidence sources, not as final answers. If they conflict, explain the conflict in confidenceAdjustment and choose the most defensible diagnosis.`;

    const taskText = `Analyze this ${input.detectedCropType} crop image and provide a detailed diagnosis.
${input.cropVariety ? `Crop variety: ${input.cropVariety}.` : ""}
${input.notes ? `Farmer notes: ${input.notes}.` : ""}
${localDetectionText}
${plantNetSpeciesText}
${plantNetDiseaseText}
${input.plantNetContext}
${input.treatmentContext}

Use the client's initial disease guess only as a hint; correct it if the image and PlantNet context indicate otherwise.
Prefer PlantNet disease terminology when its confidence is strong, but keep the final answer grounded in the image and the crop-specific treatment context.
Set confirmedDiseaseKey to a short snake_case identifier when possible (e.g. bacterial_leaf_blight).`;

    const modelName = (process.env.LLM_MODEL || "gemini-3.1-flash-lite-preview").replace(
      /^models\//,
      ""
    );

    try {
      const { output } = await ai.generate({
        model: googleAI.model(modelName, { temperature: 0.2 }),
        output: { schema: plantAnalysisOutputSchema },
        prompt: [
          { text: systemPreamble },
          {
            media,
          },
          { text: taskText },
        ],
      });

      if (!output) {
        throw new Error("Genkit returned no structured output");
      }

      return output;
    } catch (geminiError) {
      console.warn(
        "[PlantDiagnosis] Gemini failed; attempting Groq fallback.",
        geminiError
      );

      try {
        return await runGroqPlantDiagnosisFallback({
          imageDataUrl: media.url,
          systemPreamble,
          taskText,
          geminiError,
        });
      } catch (groqError) {
        throw new Error(
          `Gemini diagnosis failed and Groq fallback failed. Gemini: ${String(
            geminiError
          )}. Groq: ${String(groqError)}`
        );
      }
    }
  }
);

export async function runPlantDiagnosisGenkit(
  input: z.infer<typeof plantAnalysisInputSchema>
): Promise<PlantAnalysisOutput> {
  return plantDiagnosisFlow(input);
}
