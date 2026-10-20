type VertexAiSearchResult = {
  summary: string;
  sources: Array<{
    title: string;
    uri: string;
  }>;
};

type VertexSearchResponse = {
  results?: Array<{
    document?: {
      id?: string;
      name?: string;
      title?: string;
      structData?: Record<string, unknown>;
      derivedStructData?: Record<string, unknown>;
      uri?: string;
    };
  }>;
};

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function resolveServingConfig(): string | null {
  const explicit = asString(process.env.VERTEX_AI_SEARCH_SERVING_CONFIG);
  if (explicit) return explicit;

  const projectId = asString(process.env.VERTEX_AI_SEARCH_PROJECT_ID);
  const dataStoreId = asString(process.env.VERTEX_AI_SEARCH_DATA_STORE_ID);
  if (!projectId || !dataStoreId) return null;

  const location =
    asString(process.env.VERTEX_AI_SEARCH_LOCATION) || "global";
  const collectionId =
    asString(process.env.VERTEX_AI_SEARCH_COLLECTION_ID) ||
    "default_collection";
  const servingConfigId =
    asString(process.env.VERTEX_AI_SEARCH_SERVING_CONFIG_ID) ||
    "default_search";

  return `projects/${projectId}/locations/${location}/collections/${collectionId}/dataStores/${dataStoreId}/servingConfigs/${servingConfigId}`;
}

function resolveAuth():
  | { type: "apiKey"; value: string }
  | { type: "bearer"; value: string }
  | null {
  const apiKey = asString(process.env.VERTEX_AI_SEARCH_API_KEY);
  if (apiKey) return { type: "apiKey", value: apiKey };

  const bearer =
    asString(process.env.VERTEX_AI_SEARCH_ACCESS_TOKEN) ||
    asString(process.env.GOOGLE_CLOUD_ACCESS_TOKEN);
  if (bearer) return { type: "bearer", value: bearer };

  return null;
}

export async function searchVertexAiContext(params: {
  query: string;
  maxResults?: number;
}): Promise<VertexAiSearchResult | null> {
  const query = params.query.trim();
  if (!query) return null;

  const servingConfig = resolveServingConfig();
  if (!servingConfig) return null;

  const auth = resolveAuth();
  if (!auth) {
    console.warn(
      "[Vertex AI Search] Missing auth. Set VERTEX_AI_SEARCH_API_KEY or VERTEX_AI_SEARCH_ACCESS_TOKEN."
    );
    return null;
  }

  const endpoint = new URL(
    `https://discoveryengine.googleapis.com/v1/${servingConfig}:search`
  );

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (auth.type === "apiKey") {
    endpoint.searchParams.set("key", auth.value);
  } else {
    headers.Authorization = `Bearer ${auth.value}`;
  }

  try {
    const response = await fetch(endpoint.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify({
        query,
        pageSize: Math.max(1, Math.min(params.maxResults ?? 3, 8)),
        contentSearchSpec: {
          snippetSpec: {
            returnSnippet: true,
          },
        },
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      console.warn(
        `[Vertex AI Search] Request failed (${response.status}): ${message}`
      );
      return null;
    }

    const data = (await response.json()) as VertexSearchResponse;
    const results = data.results ?? [];
    if (!results.length) return null;

    const snippets: string[] = [];
    const sources: VertexAiSearchResult["sources"] = [];

    for (const item of results) {
      const doc = item.document;
      if (!doc) continue;

      const title =
        asString(doc.title) ||
        asString(doc.structData?.title) ||
        asString(doc.name) ||
        asString(doc.id) ||
        "Untitled source";

      const uri =
        asString(doc.uri) ||
        asString(doc.derivedStructData?.link) ||
        asString(doc.structData?.link) ||
        "";

      const snippetList = Array.isArray(doc.derivedStructData?.snippets)
        ? doc.derivedStructData?.snippets
        : [];

      for (const entry of snippetList) {
        if (typeof entry !== "object" || entry === null) continue;
        const snippet = asString((entry as { snippet?: unknown }).snippet);
        if (snippet) {
          snippets.push(snippet);
          break;
        }
      }

      if (uri) {
        sources.push({ title, uri });
      }
    }

    if (!snippets.length && !sources.length) return null;

    return {
      summary: snippets.slice(0, 3).join("\n"),
      sources: sources.slice(0, 3),
    };
  } catch (error) {
    console.warn("[Vertex AI Search] Unexpected error:", error);
    return null;
  }
}