// ============================================================================
// src/lib/ai/llm-client.ts
// LLM Client — OpenAI Integration with Production Hardening
//
// Features:
//   - AbortController-based timeouts (no hanging requests)
//   - Exponential backoff retry (429 + 5xx only, not 4xx)
//   - Circuit breaker (prevents cascade failure)
//   - Result<T, E> return type (never throws)
//   - DRY: single callLLM function used by both main + fallback paths
//
// NOT responsible for:
//   - Prompt construction (→ memory-sanitizer.ts)
//   - Cognitive context (→ cognitive-memory.ts)
//   - HTTP routing (→ route.ts)
// ============================================================================

import { type CognitiveError, type Result, Ok, Err } from "./types";
import { estimateAnthropicCostUsd, logAIUsageEvent } from "./governor";
import { routeAICall } from "./multi-model-router";

// ---------------------------------------------------------------------------
// Configuration (lazy — validated at call time to avoid build-time crashes)
// ---------------------------------------------------------------------------

const LLM_TIMEOUT_MS = 20_000; // 20s — aggressive but safe for gpt-4o-mini
const LLM_MAX_RETRIES = 2; // 1 original + 2 retries = 3 total attempts
const LLM_RETRY_BASE_MS = 1_000; // 1s → 2s → 4s exponential backoff

// ---------------------------------------------------------------------------
// Circuit Breaker (in-memory, per-process)
//
// Opens after 5 consecutive failures. Half-opens after 30s.
// Prevents hammering a dead OpenAI endpoint and burning budget.
// ---------------------------------------------------------------------------

interface CircuitState {
  failures: number;
  lastFailure: number;
  state: "closed" | "open" | "half-open";
}

const circuit: CircuitState = {
  failures: 0,
  lastFailure: 0,
  state: "closed",
};

const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_RESET_MS = 30_000; // 30s

function checkCircuit(): Result<void, CognitiveError> {
  if (circuit.state === "closed") return Ok(undefined);

  if (circuit.state === "open") {
    const elapsed = Date.now() - circuit.lastFailure;
    if (elapsed > CIRCUIT_RESET_MS) {
      circuit.state = "half-open";
      return Ok(undefined); // Allow one probe request
    }
    return Err({
      code: "LLM_ERROR",
      message: `Circuit breaker OPEN. ${Math.ceil((CIRCUIT_RESET_MS - elapsed) / 1000)}s until half-open.`,
      status: 503,
    });
  }

  // half-open: allow through
  return Ok(undefined);
}

function recordSuccess(): void {
  circuit.failures = 0;
  circuit.state = "closed";
}

function recordFailure(): void {
  circuit.failures++;
  circuit.lastFailure = Date.now();
  if (circuit.failures >= CIRCUIT_THRESHOLD) {
    circuit.state = "open";
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface LLMRequest {
  model: "gpt-4o" | "gpt-4o-mini";
  temperature: number;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  maxTokens?: number;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/** Optional governor tracking context — pass to track LLM costs in budget */
export interface LLMTrackingContext {
  supabase: unknown;
  organizationId: string;
  userId: string;
  routeKey: string;
}

/**
 * Fallback: route LLM calls through multi-model-router when OPENAI_API_KEY
 * is not configured. Uses whatever provider IS available (Anthropic, etc).
 */
async function callLLMViaRouter(
  request: LLMRequest,
  tracking?: LLMTrackingContext
): Promise<Result<LLMResponse, CognitiveError>> {
  try {
    const result = await routeAICall({
      task: "insights", // Use "insights" task — lightweight, maps to Haiku
      messages: request.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      maxTokens: request.maxTokens ?? 1000,
    });

    // Track usage if tracking context provided
    if (tracking) {
      const costUsd = estimateAnthropicCostUsd(
        result.model,
        result.inputTokens ?? 0,
        result.outputTokens ?? 0
      );
      logAIUsageEvent({
        supabase: tracking.supabase as Parameters<typeof logAIUsageEvent>[0]["supabase"],
        organizationId: tracking.organizationId,
        userId: tracking.userId,
        routeKey: tracking.routeKey,
        intentHash: `llm-${tracking.routeKey}-${Date.now()}`,
        provider: result.provider,
        model: result.model,
        mode: "ai",
        inputTokens: result.inputTokens ?? 0,
        outputTokens: result.outputTokens ?? 0,
        estimatedCostUsd: costUsd,
        success: true,
      }).catch(() => {}); // Non-fatal
    }

    return Ok({
      content: result.text,
      model: result.model,
      usage: {
        promptTokens: result.inputTokens ?? 0,
        completionTokens: result.outputTokens ?? 0,
        totalTokens: (result.inputTokens ?? 0) + (result.outputTokens ?? 0),
      },
    });
  } catch (err: unknown) {
    return Err({
      code: "LLM_ERROR",
      message: err instanceof Error ? err.message : "Router fallback failed",
      status: 500,
    });
  }
}

/**
 * Call OpenAI with timeout, retry, and circuit breaker.
 * Falls back to multi-model-router if OPENAI_API_KEY is not set.
 *
 * Retries ONLY on:
 *   - 429 (rate limit) — with backoff
 *   - 5xx (server error) — with backoff
 *   - Network errors (fetch failures)
 *
 * Does NOT retry on:
 *   - 4xx (except 429) — client error, retrying won't help
 *   - Timeout — already waited long enough
 */
export async function callLLM(
  request: LLMRequest,
  tracking?: LLMTrackingContext
): Promise<Result<LLMResponse, CognitiveError>> {
  // 1) Circuit breaker check
  const circuitCheck = checkCircuit();
  if (!circuitCheck.ok) return Err(circuitCheck.error);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Fallback: route through multi-model-router (uses Anthropic/OpenRouter/Google)
    return callLLMViaRouter(request, tracking);
  }

  // 2) Retry loop with exponential backoff
  let lastError: CognitiveError | null = null;

  for (let attempt = 0; attempt <= LLM_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delayMs = LLM_RETRY_BASE_MS * Math.pow(2, attempt - 1);
      await sleep(delayMs);
    }

    const result = await singleLLMCall(request, apiKey);

    if (result.ok) {
      recordSuccess();
      // Track usage in governor budget system (non-fatal)
      if (tracking) {
        const costUsd = estimateAnthropicCostUsd(
          request.model,
          result.value.usage.promptTokens,
          result.value.usage.completionTokens
        );
        logAIUsageEvent({
          supabase: tracking.supabase as Parameters<typeof logAIUsageEvent>[0]["supabase"],
          organizationId: tracking.organizationId,
          userId: tracking.userId,
          routeKey: tracking.routeKey,
          intentHash: `llm-${tracking.routeKey}-${Date.now()}`,
          provider: "openai",
          model: result.value.model,
          mode: "ai",
          inputTokens: result.value.usage.promptTokens,
          outputTokens: result.value.usage.completionTokens,
          estimatedCostUsd: costUsd,
          success: true,
        }).catch(() => {}); // Non-fatal
      }
      return result;
    } else {
      lastError = result.error;

      // Only retry on retryable errors
      if (!isRetryable(result.error)) {
        recordFailure();
        return result;
      }
    }
  }

  // All retries exhausted
  recordFailure();
  return Err(
    lastError ?? {
      code: "LLM_ERROR",
      message: "All retry attempts exhausted",
    }
  );
}

// ---------------------------------------------------------------------------
// Internal: single LLM call with timeout
// ---------------------------------------------------------------------------

async function singleLLMCall(
  request: LLMRequest,
  apiKey: string
): Promise<Result<LLMResponse, CognitiveError>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  try {
    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: request.model,
          temperature: Math.max(0, Math.min(2, request.temperature)),
          messages: request.messages,
          max_tokens: request.maxTokens ?? 1000,
        }),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      return Err({
        code: "LLM_ERROR",
        message: `OpenAI returned ${response.status}: ${errorBody.slice(0, 200)}`,
        status: response.status,
      });
    }

    const json = await response.json();
    const content = json?.choices?.[0]?.message?.content;

    if (typeof content !== "string" || content.length === 0) {
      return Err({
        code: "LLM_INVALID_RESPONSE",
        message: `OpenAI returned empty or invalid content. finish_reason=${json?.choices?.[0]?.finish_reason}`,
      });
    }

    return Ok({
      content,
      model: json.model ?? request.model,
      usage: {
        promptTokens: json.usage?.prompt_tokens ?? 0,
        completionTokens: json.usage?.completion_tokens ?? 0,
        totalTokens: json.usage?.total_tokens ?? 0,
      },
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return Err({
        code: "LLM_TIMEOUT",
        message: `OpenAI request timed out after ${LLM_TIMEOUT_MS}ms`,
        timeoutMs: LLM_TIMEOUT_MS,
      });
    }

    return Err({
      code: "LLM_ERROR",
      message:
        err instanceof Error
          ? `Network error: ${err.message}`
          : "Unknown fetch error",
    });
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isRetryable(error: CognitiveError): boolean {
  if (error.code === "LLM_TIMEOUT") return false; // Already waited
  if (error.code === "LLM_INVALID_RESPONSE") return false; // Model issue
  if (error.code === "LLM_ERROR" && "status" in error) {
    const status = error.status;
    return status === 429 || (typeof status === "number" && status >= 500);
  }
  // Network errors are retryable
  return error.code === "LLM_ERROR";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Observability: expose circuit state for health checks
// ---------------------------------------------------------------------------

export function getCircuitState(): Readonly<CircuitState> {
  return { ...circuit };
}
