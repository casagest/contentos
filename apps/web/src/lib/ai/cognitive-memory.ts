// ============================================================================
// src/lib/ai/cognitive-memory.ts
// Cognitive Memory — Data Access Layer
//
// Responsibilities:
//   - Fetch 5-layer cognitive context via single RPC call
//   - Validate response shape with Zod (boundary validation)
//   - Return Result<T, E> — never throws
//
// NOT responsible for:
//   - Prompt construction (→ memory-sanitizer.ts)
//   - LLM calls (→ llm-client.ts)
//   - HTTP handling (→ route.ts)
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CognitiveContextSchema,
  type CognitiveContext,
  type CognitiveError,
  type Result,
  Ok,
  Err,
} from "./types";
import { markMemoriesAccessed } from "./spaced-repetition";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface FetchContextParams {
  supabase: SupabaseClient;
  organizationId: string;
  platform?: string | null;
}

/**
 * Fetch 5-layer cognitive context for an organization.
 *
 * Uses a single RPC call (get_cognitive_context_v3) that returns all layers
 * in one round-trip. The RPC enforces RLS via SECURITY INVOKER.
 *
 * @returns Result with validated CognitiveContext or typed CognitiveError
 */
export async function fetchCognitiveContext(
  params: FetchContextParams
): Promise<Result<CognitiveContext, CognitiveError>> {
  const { supabase, organizationId, platform } = params;

  // 1) Call RPC
  let data: unknown;
  try {
    const response = await supabase.rpc("get_cognitive_context_v3", {
      p_org_id: organizationId,
      p_platform: platform ?? null,
    });

    if (response.error) {
      // Supabase wraps PostgreSQL exceptions
      const msg = response.error.message ?? "Unknown RPC error";

      if (msg.includes("not_authorized")) {
        return Err({
          code: "NOT_AUTHORIZED",
          message: `User is not a member of organization ${organizationId}`,
        });
      }

      return Err({
        code: "RPC_FAILED",
        message: `Cognitive context RPC failed: ${msg}`,
        cause: response.error,
      });
    }

    data = response.data;
  } catch (cause: unknown) {
    return Err({
      code: "RPC_FAILED",
      message:
        cause instanceof Error
          ? `RPC exception: ${cause.message}`
          : "RPC threw non-Error",
      cause,
    });
  }

  // 2) Validate shape (boundary validation)
  if (!data) {
    return Err({
      code: "RPC_FAILED",
      message: "RPC returned null/undefined data",
    });
  }

  const parsed = CognitiveContextSchema.safeParse(data);
  if (!parsed.success) {
    return Err({
      code: "VALIDATION_FAILED",
      message: `Cognitive context shape mismatch: ${parsed.error.message}`,
      issues: parsed.error.issues,
    });
  }

  return Ok(parsed.data);
}

// ---------------------------------------------------------------------------
// Context quality assessment (for observability/logging)
// ---------------------------------------------------------------------------

export interface ContextQuality {
  totalEntries: number;
  layerCoverage: number; // 0-5: how many layers have data
  avgConfidence: number | null;
  isColdStart: boolean;
  temperatureSource: string;
}

/**
 * Fetch cognitive context using v4 RPC (strength-based composite scoring).
 * Falls back to v3 if v4 is not available.
 */
export async function fetchCognitiveContextV4(
  params: FetchContextParams
): Promise<Result<CognitiveContext, CognitiveError>> {
  const { supabase, organizationId, platform } = params;

  // Try v4 first
  try {
    const response = await supabase.rpc("get_cognitive_context_v4", {
      p_org_id: organizationId,
      p_platform: platform ?? null,
    });

    if (response.error) {
      // If v4 doesn't exist, fall back to v3
      if (
        response.error.message?.includes("function") &&
        response.error.message?.includes("does not exist")
      ) {
        return fetchCognitiveContext(params);
      }

      const msg = response.error.message ?? "Unknown RPC error";
      if (msg.includes("not_authorized")) {
        return Err({
          code: "NOT_AUTHORIZED",
          message: `User is not a member of organization ${organizationId}`,
        });
      }

      return Err({
        code: "RPC_FAILED",
        message: `Cognitive context v4 RPC failed: ${msg}`,
        cause: response.error,
      });
    }

    if (!response.data) {
      return Err({
        code: "RPC_FAILED",
        message: "v4 RPC returned null/undefined data",
      });
    }

    const parsed = CognitiveContextSchema.safeParse(response.data);
    if (!parsed.success) {
      return Err({
        code: "VALIDATION_FAILED",
        message: `Cognitive context v4 shape mismatch: ${parsed.error.message}`,
        issues: parsed.error.issues,
      });
    }

    return Ok(parsed.data);
  } catch {
    // v4 unavailable — fall back to v3
    return fetchCognitiveContext(params);
  }
}

/**
 * Track which episodic memories were accessed during generation.
 * Updates last_recalled_at for spaced repetition tracking.
 * Best-effort: failures are logged but never block the response.
 */
export async function trackMemoryAccess(params: {
  supabase: SupabaseClient;
  organizationId: string;
  context: CognitiveContext;
}): Promise<void> {
  const episodicIds = params.context.episodic
    .map((e) => e.id)
    .filter((id): id is string => typeof id === "string");

  if (episodicIds.length === 0) return;

  // Best-effort: don't await, fire-and-forget
  markMemoriesAccessed({
    supabase: params.supabase,
    organizationId: params.organizationId,
    episodicIds,
  }).catch(() => {
    // Silent failure — access tracking is non-critical
  });
}

export function assessContextQuality(ctx: CognitiveContext): ContextQuality {
  const layers = [
    ctx.episodic.length > 0,
    ctx.semantic.length > 0,
    ctx.procedural.length > 0,
    ctx.working.length > 0,
    (ctx.metacognitive.accuracy_samples ?? 0) > 0,
  ];

  const layerCoverage = layers.filter(Boolean).length;
  const totalEntries =
    ctx.episodic.length +
    ctx.semantic.length +
    ctx.procedural.length +
    ctx.working.length;

  // Average confidence across semantic patterns (if any)
  const confidences = ctx.semantic
    .map((s) => s.confidence)
    .filter((c): c is number => typeof c === "number");
  const avgConfidence =
    confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : null;

  return {
    totalEntries,
    layerCoverage,
    avgConfidence,
    isColdStart: (ctx.metacognitive.accuracy_samples ?? 0) === 0,
    temperatureSource:
      ctx.metacognitive.temperature_method ?? "default",
  };
}
