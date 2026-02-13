import { type AITask, resolveEffectiveProvider } from "./multi-model-router";

export type AIProviderMode = "anthropic" | "openrouter" | "template";

export interface AIProviderResolution {
  mode: AIProviderMode;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

function normalizeModelList(values: Array<string | undefined>): string[] {
  const models: string[] = [];
  const seen = new Set<string>();

  for (const raw of values) {
    if (!raw) continue;
    for (const item of raw.split(",")) {
      const model = item.trim();
      if (!model) continue;
      if (seen.has(model)) continue;
      seen.add(model);
      models.push(model);
    }
  }

  return models;
}

export function buildOpenRouterModelChain(params: {
  preferred?: string;
  quality: "economy" | "balanced" | "premium";
}): string {
  const deepseek =
    process.env.OPENROUTER_MODEL_DEEPSEEK?.trim() || "deepseek/deepseek-chat";
  const mistral =
    process.env.OPENROUTER_MODEL_MISTRAL?.trim() || "mistralai/mistral-small-3.1";
  const auto = process.env.OPENROUTER_MODEL_AUTO?.trim() || "openrouter/auto";

  const qualityEnv =
    params.quality === "economy"
      ? process.env.OPENROUTER_MODEL_ECONOMY?.trim()
      : params.quality === "balanced"
        ? process.env.OPENROUTER_MODEL_BALANCED?.trim()
        : process.env.OPENROUTER_MODEL_PREMIUM?.trim();

  // Cost-first chain:
  // deepseek -> mistral -> openrouter/auto.
  // Explicit preferred model is kept as a tail fallback.
  const models = normalizeModelList([
    qualityEnv,
    deepseek,
    mistral,
    auto,
    params.preferred,
  ]);

  return models.join(",");
}

export function resolveAIProvider(): AIProviderResolution {
  const forceTemplate = process.env.AI_FORCE_TEMPLATE?.trim().toLowerCase() === "true";
  if (forceTemplate) {
    return { mode: "template", model: "template" };
  }

  const requested = process.env.AI_PROVIDER?.trim().toLowerCase();
  const genericApiKey = process.env.AI_API_KEY?.trim();
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  const openRouterBaseUrl =
    process.env.OPENROUTER_BASE_URL?.trim() ||
    "https://openrouter.ai/api/v1/chat/completions";
  const openRouterModel =
    process.env.OPENROUTER_MODEL?.trim() ||
    process.env.AI_MODEL?.trim() ||
    "openrouter/auto";
  const anthropicModel =
    process.env.ANTHROPIC_MODEL?.trim() || process.env.AI_MODEL?.trim();

  const genericLooksOpenRouter = Boolean(genericApiKey?.startsWith("sk-or-"));

  if (requested === "template") {
    return { mode: "template", model: "template" };
  }

  if (requested === "anthropic") {
    const apiKey = genericApiKey || anthropicKey;
    if (!apiKey) return { mode: "template", model: "template" };
    return { mode: "anthropic", apiKey, model: anthropicModel };
  }

  if (requested === "openrouter") {
    const apiKey = genericApiKey || openRouterKey;
    if (!apiKey) return { mode: "template", model: "template" };
    return {
      mode: "openrouter",
      apiKey,
      model: openRouterModel,
      baseUrl: openRouterBaseUrl,
    };
  }

  if (requested && requested !== "anthropic" && requested !== "openrouter") {
    return { mode: "template", model: "template" };
  }

  // Auto mode precedence:
  // 1) Explicit Anthropic key
  if (anthropicKey) {
    return { mode: "anthropic", apiKey: anthropicKey, model: anthropicModel };
  }

  // 2) Generic key that looks like OpenRouter
  if (genericApiKey && genericLooksOpenRouter) {
    return {
      mode: "openrouter",
      apiKey: genericApiKey,
      model: openRouterModel,
      baseUrl: openRouterBaseUrl,
    };
  }

  // 3) Explicit OpenRouter key
  if (openRouterKey) {
    return {
      mode: "openrouter",
      apiKey: openRouterKey,
      model: openRouterModel,
      baseUrl: openRouterBaseUrl,
    };
  }

  // 4) Generic fallback as Anthropic (legacy behavior)
  if (genericApiKey) {
    return { mode: "anthropic", apiKey: genericApiKey, model: anthropicModel };
  }

  return { mode: "template", model: "template" };
}

/**
 * Bridge between multi-model router and the old AIProviderResolution format.
 * Uses the multi-model router's smart resolution (checks all 4 providers)
 * then maps to AIProviderResolution for ContentAIService compatibility.
 *
 * For providers ContentAIService doesn't support (google, openai),
 * routes through OpenRouter or falls back to Anthropic.
 */
export function resolveAIProviderForTask(task: AITask): AIProviderResolution {
  const forceTemplate = process.env.AI_FORCE_TEMPLATE?.trim().toLowerCase() === "true";
  if (forceTemplate) {
    return { mode: "template", model: "template" };
  }

  const config = resolveEffectiveProvider(task);

  const openRouterBaseUrl =
    process.env.OPENROUTER_BASE_URL?.trim() ||
    "https://openrouter.ai/api/v1/chat/completions";

  switch (config.provider) {
    case "anthropic": {
      const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
      if (!apiKey) return resolveAIProvider();
      return { mode: "anthropic", apiKey, model: config.model };
    }

    case "openrouter": {
      const apiKey = process.env.OPENROUTER_API_KEY?.trim();
      if (!apiKey) return resolveAIProvider();
      return { mode: "openrouter", apiKey, model: config.model, baseUrl: openRouterBaseUrl };
    }

    case "google":
    case "openai": {
      // ContentAIService doesn't support google/openai directly.
      // Route through OpenRouter if available (it supports all models).
      const orKey = process.env.OPENROUTER_API_KEY?.trim();
      if (orKey) {
        // Map google models to OpenRouter model identifiers
        const orModel = config.provider === "google"
          ? `google/${config.model}`
          : `openai/${config.model}`;
        return { mode: "openrouter", apiKey: orKey, model: orModel, baseUrl: openRouterBaseUrl };
      }

      // Fall back to Anthropic if available
      const anthKey = process.env.ANTHROPIC_API_KEY?.trim();
      if (anthKey) {
        return { mode: "anthropic", apiKey: anthKey, model: config.fallbackModel || "claude-haiku-4-5-20251001" };
      }

      // Last resort: old resolver
      return resolveAIProvider();
    }
  }
}
