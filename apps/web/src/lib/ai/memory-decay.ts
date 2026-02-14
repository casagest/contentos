// ============================================================================
// src/lib/ai/memory-decay.ts
// Ebbinghaus Forgetting Curve — Exponential Decay with Recall Boost
//
// Responsibilities:
//   - Per-event-type configurable half-lives
//   - Strength-aware exponential decay: strength * importance * exp(-ln2/half * t)
//   - Composite scoring: similarity * strength * decay * recencyBias
//   - Half-life ↔ decay_rate conversion (backward compat with SQL formula)
//   - Memory lifespan estimation
//
// Pure functions only — no side effects, no DB access.
// ============================================================================

import type { DecayConfig } from "./types";
import { DecayConfigSchema } from "./types";

// ---------------------------------------------------------------------------
// Per-event-type default half-lives (days)
// Shorter half-life = faster decay. Calibrated for social media context.
// ---------------------------------------------------------------------------

export const EVENT_HALF_LIVES: Record<string, number> = {
  post_success: 30,
  post_failure: 14,
  viral_moment: 60,
  audience_shift: 45,
  goal_milestone: 90,
  strategy_change: 21,
  competitor_insight: 30,
  trend_detected: 14,
  budget_exhausted: 7,
  content_gap_found: 21,
};

const DEFAULT_HALF_LIFE = 30;
const LN2 = Math.LN2;

// ---------------------------------------------------------------------------
// Core decay function
// Formula: strength * importance * exp(-ln(2) / halfLifeDays * daysSinceCreated)
//
// At t = halfLifeDays, weight = strength * importance * 0.5
// At t = 0, weight = strength * importance * 1.0
// ---------------------------------------------------------------------------

export function calculateDecayWeight(params: {
  strength: number;
  importance: number;
  halfLifeDays: number;
  daysSinceCreated: number;
}): number {
  const { strength, importance, halfLifeDays, daysSinceCreated } = params;

  if (strength <= 0 || importance <= 0) return 0;
  if (daysSinceCreated <= 0) return strength * importance;
  if (halfLifeDays <= 0) return 0;

  const decayFactor = Math.exp((-LN2 / halfLifeDays) * daysSinceCreated);
  return strength * importance * decayFactor;
}

// ---------------------------------------------------------------------------
// Composite scoring: combines similarity, strength, decay, and recency bias
//
// score = similarity * strength * decayWeight * recencyBias
//
// similarity: 0-1, from vector search (default 1.0 if not using embeddings)
// recencyBiasMultiplier: 1.0-2.0 boost for very recent memories
// ---------------------------------------------------------------------------

export function calculateCompositeScore(params: {
  similarity?: number;
  strength: number;
  importance: number;
  halfLifeDays: number;
  daysSinceCreated: number;
  recencyBiasMultiplier?: number;
}): number {
  const similarity = params.similarity ?? 1.0;
  const recencyBias = params.recencyBiasMultiplier ?? 1.0;

  const decayWeight = calculateDecayWeight({
    strength: params.strength,
    importance: params.importance,
    halfLifeDays: params.halfLifeDays,
    daysSinceCreated: params.daysSinceCreated,
  });

  return similarity * decayWeight * recencyBias;
}

// ---------------------------------------------------------------------------
// Resolve per-event-type decay config (with optional overrides)
// ---------------------------------------------------------------------------

export function resolveDecayConfig(
  eventType: string,
  overrides?: Partial<DecayConfig>
): DecayConfig {
  const baseHalfLife = EVENT_HALF_LIVES[eventType] ?? DEFAULT_HALF_LIFE;

  return DecayConfigSchema.parse({
    halfLifeDays: overrides?.halfLifeDays ?? baseHalfLife,
    minStrength: overrides?.minStrength ?? 0.05,
    recallBoostFactor: overrides?.recallBoostFactor ?? 1.2,
  });
}

// ---------------------------------------------------------------------------
// Convert half-life (days) to decay_rate for backward compat with SQL formula
//
// SQL uses: importance * EXP(-decay_rate * days)
// We use:   strength * importance * EXP(-ln2 / halfLife * days)
//
// Equating: decay_rate = ln2 / halfLifeDays
// ---------------------------------------------------------------------------

export function halfLifeToDecayRate(halfLifeDays: number): number {
  if (halfLifeDays <= 0) return 1;
  return LN2 / halfLifeDays;
}

// ---------------------------------------------------------------------------
// Convert decay_rate back to half-life (for display / config)
// ---------------------------------------------------------------------------

export function decayRateToHalfLife(decayRate: number): number {
  if (decayRate <= 0) return Infinity;
  return LN2 / decayRate;
}

// ---------------------------------------------------------------------------
// Estimate days until memory reaches minimum threshold
//
// Solves: strength * importance * exp(-ln2/halfLife * t) = minThreshold
// Result: t = -halfLife * ln(minThreshold / (strength * importance)) / ln2
// ---------------------------------------------------------------------------

export function estimateMemoryLifespan(params: {
  strength: number;
  importance: number;
  halfLifeDays: number;
  minThreshold?: number;
}): number {
  const { strength, importance, halfLifeDays } = params;
  const minThreshold = params.minThreshold ?? 0.05;

  const initialWeight = strength * importance;
  if (initialWeight <= 0) return 0;
  if (initialWeight <= minThreshold) return 0;
  if (halfLifeDays <= 0) return 0;

  const ratio = minThreshold / initialWeight;
  // ratio = exp(-ln2/halfLife * t) → t = -halfLife * ln(ratio) / ln2
  return (-halfLifeDays * Math.log(ratio)) / LN2;
}

// ---------------------------------------------------------------------------
// Calculate days since a given timestamp
// ---------------------------------------------------------------------------

export function daysSince(createdAt: string, nowMs?: number): number {
  const now = nowMs ?? Date.now();
  const created = new Date(createdAt).getTime();
  if (isNaN(created)) return 0;
  const diffMs = now - created;
  return Math.max(0, diffMs / 86_400_000);
}
