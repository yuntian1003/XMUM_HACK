export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const resolveModel = () => {
  // Gemini model name (Google AI Studio). Optional.
  const configured = process.env.LLM_MODEL?.trim();
  if (configured) return configured;

  // Default model fallback when LLM_MODEL is not set.
  return "gemini-3.1-flash-lite-preview";
};

const getGeminiApiKey = () => {
  return process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_GENAI_API_KEY?.trim() || "";
};

const assertApiKey = () => {
  if (!getGeminiApiKey()) {
    throw new Error("GEMINI_API_KEY or GOOGLE_GENAI_API_KEY is not configured");
  }
};

const normalizeGeminiModelId = (model: string) => {
  const trimmed = model.trim();
  return trimmed.startsWith("models/") ? trimmed.slice("models/".length) : trimmed;
};

const tryParseDataUrl = (value: string): { mimeType: string; base64: string } | null => {
  const trimmed = value.trim();
  if (!trimmed.startsWith("data:")) return null;
  // Avoid the /s flag for older TS targets.
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(trimmed);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
};

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

const toGeminiParts = (content: MessageContent | MessageContent[]): GeminiPart[] => {
  const parts = ensureArray(content);
  const out: GeminiPart[] = [];

  for (const part of parts) {
    if (typeof part === "string") {
      out.push({ text: part });
      continue;
    }

    if (part.type === "text") {
      out.push({ text: part.text });
      continue;
    }

    if (part.type === "image_url") {
      // In our app this is typically a base64 data URL. Convert to inlineData for Gemini.
      const parsed = tryParseDataUrl(part.image_url.url);
      if (parsed) {
        out.push({
          inlineData: {
            mimeType: parsed.mimeType,
            data: parsed.base64,
          },
        });
      } else {
        // Fallback: just pass the URL as text.
        out.push({ text: `Image URL: ${part.image_url.url}` });
      }
      continue;
    }

    if (part.type === "file_url") {
      out.push({ text: `File URL: ${part.file_url.url}` });
      continue;
    }
  }

  return out;
};

const invokeGemini = async (params: InvokeParams): Promise<InvokeResult> => {
  const model = normalizeGeminiModelId(resolveModel());
  const apiKey = getGeminiApiKey();
  const maxTokens = params.maxTokens ?? params.max_tokens ?? 2048;
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat: params.responseFormat,
    response_format: params.response_format,
    outputSchema: params.outputSchema,
    output_schema: params.output_schema,
  });

  const systemText = params.messages
    .filter(m => m.role === "system")
    .map(m => ensureArray(m.content).map(p => (typeof p === "string" ? p : p.type === "text" ? p.text : JSON.stringify(p))).join("\\n"))
    .join("\\n\\n");

  const contents = params.messages
    .filter(m => m.role !== "system")
    .map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: toGeminiParts(m.content),
    }));

  const payload: Record<string, unknown> = {
    contents,
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.2,
    },
  };

  const sanitizeGeminiResponseSchema = (schema: unknown): unknown => {
    if (!schema || typeof schema !== "object") return schema;
    if (Array.isArray(schema)) return schema.map(sanitizeGeminiResponseSchema);

    const input = schema as Record<string, unknown>;
    const out: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(input)) {
      // Gemini responseSchema does NOT accept many JSON Schema keywords.
      // We strip the ones that are known to cause 400s.
      if (
        key === "additionalProperties" ||
        key === "$schema" ||
        key === "title" ||
        key === "description" // optional: Gemini may accept, but keep request minimal
      ) {
        continue;
      }
      out[key] = sanitizeGeminiResponseSchema(value);
    }
    return out;
  };

  // If the caller requested a JSON schema, enable Gemini JSON mode.
  // This makes Gemini return strict JSON (no markdown fences / extra prose),
  // and is much more reliable than post-hoc JSON "repair".
  if (normalizedResponseFormat?.type === "json_schema") {
    (payload.generationConfig as any).responseMimeType = "application/json";
    (payload.generationConfig as any).responseSchema =
      sanitizeGeminiResponseSchema(normalizedResponseFormat.json_schema.schema);
  } else if (normalizedResponseFormat?.type === "json_object") {
    (payload.generationConfig as any).responseMimeType = "application/json";
  }

  if (systemText.trim().length > 0) {
    payload.systemInstruction = { parts: [{ text: systemText }] };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  const data = (await response.json()) as any;
  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: any) => (typeof p?.text === "string" ? p.text : ""))
      .join("") ?? "";

  // Convert to our existing OpenAI-like shape so callers don't change.
  return {
    id: data?.responseId ?? `gemini_${Date.now()}`,
    created: Date.now(),
    model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: text },
        finish_reason: null,
      },
    ],
    usage: undefined,
  };
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  assertApiKey();
  // Gemini-only (Google AI Studio).
  // Any OpenAI/OpenRouter support has been intentionally removed.
  return await invokeGemini(params);
}
