import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AITask =
  | "generate"
  | "score"
  | "coach"
  | "research"
  | "braindump"
  | "visual"
  | "insights";

export type ProviderName = "anthropic" | "openai" | "google" | "openrouter";

export interface TaskModelConfig {
  provider: ProviderName;
  model: string;
  fallbackProvider?: ProviderName;
  fallbackModel?: string;
}

export interface MultiModelMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface MultiModelResult {
  text: string;
  provider: ProviderName;
  model: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
}

// ---------------------------------------------------------------------------
// Provider availability
// ---------------------------------------------------------------------------

function getAnthropicKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY?.trim() || undefined;
}

function getOpenAIKey(): string | undefined {
  return process.env.OPENAI_API_KEY?.trim() || undefined;
}

function getGoogleKey(): string | undefined {
  return process.env.GOOGLE_AI_API_KEY?.trim() || undefined;
}

function getOpenRouterKey(): string | undefined {
  return process.env.OPENROUTER_API_KEY?.trim() || undefined;
}

function isProviderAvailable(provider: ProviderName): boolean {
  switch (provider) {
    case "anthropic":
      return Boolean(getAnthropicKey());
    case "openai":
      return Boolean(getOpenAIKey());
    case "google":
      return Boolean(getGoogleKey());
    case "openrouter":
      return Boolean(getOpenRouterKey());
  }
}

// ---------------------------------------------------------------------------
// Task → Model mapping (configurable via env vars)
// ---------------------------------------------------------------------------

const DEFAULT_TASK_CONFIG: Record<AITask, TaskModelConfig> = {
  generate: {
    provider: "anthropic",
    model: "claude-sonnet-4-5-20250929",
    fallbackProvider: "openrouter",
    fallbackModel: "openrouter/auto",
  },
  score: {
    provider: "anthropic",
    model: "claude-haiku-4-5-20251001",
    fallbackProvider: "openrouter",
    fallbackModel: "openrouter/auto",
  },
  coach: {
    provider: "anthropic",
    model: "claude-sonnet-4-5-20250929",
    fallbackProvider: "openrouter",
    fallbackModel: "openrouter/auto",
  },
  research: {
    provider: "google",
    model: "gemini-2.0-flash",
    fallbackProvider: "anthropic",
    fallbackModel: "claude-haiku-4-5-20251001",
  },
  braindump: {
    provider: "anthropic",
    model: "claude-sonnet-4-5-20250929",
    fallbackProvider: "openrouter",
    fallbackModel: "openrouter/auto",
  },
  visual: {
    provider: "openai",
    model: "gpt-4o",
    fallbackProvider: "anthropic",
    fallbackModel: "claude-sonnet-4-5-20250929",
  },
  insights: {
    provider: "anthropic",
    model: "claude-haiku-4-5-20251001",
    fallbackProvider: "google",
    fallbackModel: "gemini-2.0-flash",
  },
};

export function resolveTaskConfig(task: AITask): TaskModelConfig {
  const envPrefix = `AI_TASK_${task.toUpperCase()}`;
  const envProvider = process.env[`${envPrefix}_PROVIDER`]?.trim() as ProviderName | undefined;
  const envModel = process.env[`${envPrefix}_MODEL`]?.trim();

  const defaults = DEFAULT_TASK_CONFIG[task];

  return {
    provider: envProvider || defaults.provider,
    model: envModel || defaults.model,
    fallbackProvider: defaults.fallbackProvider,
    fallbackModel: defaults.fallbackModel,
  };
}

export function resolveEffectiveProvider(task: AITask): TaskModelConfig {
  const config = resolveTaskConfig(task);

  if (isProviderAvailable(config.provider)) {
    return config;
  }

  if (config.fallbackProvider && config.fallbackModel && isProviderAvailable(config.fallbackProvider)) {
    return {
      provider: config.fallbackProvider,
      model: config.fallbackModel,
    };
  }

  // Last resort: try any available provider
  if (isProviderAvailable("anthropic")) {
    return { provider: "anthropic", model: "claude-haiku-4-5-20251001" };
  }
  if (isProviderAvailable("openrouter")) {
    return { provider: "openrouter", model: "openrouter/auto" };
  }
  if (isProviderAvailable("google")) {
    return { provider: "google", model: "gemini-2.0-flash" };
  }
  if (isProviderAvailable("openai")) {
    return { provider: "openai", model: "gpt-4o-mini" };
  }

  return config; // Return original config, will fail at call time
}

// ---------------------------------------------------------------------------
// Provider execution
// ---------------------------------------------------------------------------

async function callAnthropic(
  messages: MultiModelMessage[],
  model: string,
  maxTokens: number,
): Promise<MultiModelResult> {
  const startedAt = Date.now();
  const client = new Anthropic({ apiKey: getAnthropicKey() });

  const systemMessage = messages.find((m) => m.role === "system");
  const nonSystemMessages = messages.filter((m) => m.role !== "system");

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemMessage?.content,
    messages: nonSystemMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  return {
    text,
    provider: "anthropic",
    model: response.model,
    latencyMs: Date.now() - startedAt,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

async function callOpenAI(
  messages: MultiModelMessage[],
  model: string,
  maxTokens: number,
): Promise<MultiModelResult> {
  const startedAt = Date.now();
  const client = new OpenAI({ apiKey: getOpenAIKey() });

  const response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  return {
    text: response.choices[0]?.message?.content || "",
    provider: "openai",
    model: response.model,
    latencyMs: Date.now() - startedAt,
    inputTokens: response.usage?.prompt_tokens,
    outputTokens: response.usage?.completion_tokens,
  };
}

async function callGoogle(
  messages: MultiModelMessage[],
  model: string,
  maxTokens: number,
): Promise<MultiModelResult> {
  const startedAt = Date.now();
  const genAI = new GoogleGenerativeAI(getGoogleKey()!);
  const genModel = genAI.getGenerativeModel({
    model,
    generationConfig: { maxOutputTokens: maxTokens },
  });

  const systemMessage = messages.find((m) => m.role === "system");
  const nonSystemMessages = messages.filter((m) => m.role !== "system");

  const history = nonSystemMessages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: m.content }],
  }));

  const lastMessage = nonSystemMessages[nonSystemMessages.length - 1];
  const prompt = systemMessage
    ? `${systemMessage.content}\n\n${lastMessage.content}`
    : lastMessage.content;

  const chat = genModel.startChat({ history });
  const result = await chat.sendMessage(prompt);
  const text = result.response.text();

  return {
    text,
    provider: "google",
    model,
    latencyMs: Date.now() - startedAt,
    inputTokens: result.response.usageMetadata?.promptTokenCount,
    outputTokens: result.response.usageMetadata?.candidatesTokenCount,
  };
}

async function callOpenRouter(
  messages: MultiModelMessage[],
  model: string,
  maxTokens: number,
): Promise<MultiModelResult> {
  const startedAt = Date.now();
  const apiKey = getOpenRouterKey()!;
  const baseUrl = process.env.OPENROUTER_BASE_URL?.trim() || "https://openrouter.ai/api/v1/chat/completions";

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL?.trim() || "",
      "X-Title": process.env.OPENROUTER_APP_NAME?.trim() || "ContentOS",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
    model: string;
    usage?: { prompt_tokens: number; completion_tokens: number };
  };

  return {
    text: data.choices[0]?.message?.content || "",
    provider: "openrouter",
    model: data.model || model,
    latencyMs: Date.now() - startedAt,
    inputTokens: data.usage?.prompt_tokens,
    outputTokens: data.usage?.completion_tokens,
  };
}

// ---------------------------------------------------------------------------
// Main router
// ---------------------------------------------------------------------------

export async function routeAICall(params: {
  task: AITask;
  messages: MultiModelMessage[];
  maxTokens?: number;
}): Promise<MultiModelResult> {
  const { task, messages, maxTokens = 4096 } = params;
  const config = resolveEffectiveProvider(task);

  const callProvider = async (provider: ProviderName, model: string): Promise<MultiModelResult> => {
    switch (provider) {
      case "anthropic":
        return callAnthropic(messages, model, maxTokens);
      case "openai":
        return callOpenAI(messages, model, maxTokens);
      case "google":
        return callGoogle(messages, model, maxTokens);
      case "openrouter":
        return callOpenRouter(messages, model, maxTokens);
    }
  };

  try {
    return await callProvider(config.provider, config.model);
  } catch (primaryError) {
    // Try fallback if available
    if (config.fallbackProvider && config.fallbackModel && isProviderAvailable(config.fallbackProvider)) {
      try {
        return await callProvider(config.fallbackProvider, config.fallbackModel);
      } catch {
        // Throw original error if fallback also fails
      }
    }
    throw primaryError;
  }
}

// ---------------------------------------------------------------------------
// Convenience: get available providers summary
// ---------------------------------------------------------------------------

export function getAvailableProviders(): Record<ProviderName, boolean> {
  return {
    anthropic: isProviderAvailable("anthropic"),
    openai: isProviderAvailable("openai"),
    google: isProviderAvailable("google"),
    openrouter: isProviderAvailable("openrouter"),
  };
}

export function getTaskRoutingTable(): Record<AITask, { provider: ProviderName; model: string; available: boolean }> {
  const tasks: AITask[] = ["generate", "score", "coach", "research", "braindump", "visual", "insights"];
  const result = {} as Record<AITask, { provider: ProviderName; model: string; available: boolean }>;

  for (const task of tasks) {
    const config = resolveEffectiveProvider(task);
    result[task] = {
      provider: config.provider,
      model: config.model,
      available: isProviderAvailable(config.provider),
    };
  }

  return result;
}
