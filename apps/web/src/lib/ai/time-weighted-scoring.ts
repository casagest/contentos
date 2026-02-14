// ============================================================================
// src/lib/ai/time-weighted-scoring.ts
// Time-Weighted Scoring — Cross-Layer Composite Scoring
//
// Responsibilities:
//   - Score individual entries from each cognitive layer
//   - Cross-layer weighted scoring when same concept spans layers
//   - Recency bias: boost for very recent memories
//   - Rank memories across all layers, return top K
//
// Pure functions only — no DB access, no side effects.
// ============================================================================

import type {
  EpisodicEntryV2,
  SemanticEntry,
  ProceduralEntry,
  LayerWeights,
  RankedMemories,
} from "./types";
import { calculateCompositeScore, daysSince } from "./memory-decay";

// ---------------------------------------------------------------------------
// Default layer weights for cross-layer scoring
// ---------------------------------------------------------------------------

export const DEFAULT_LAYER_WEIGHTS: LayerWeights = {
  episodic: 0.35,
  semantic: 0.3,
  procedural: 0.25,
  working: 0.1,
};

// ---------------------------------------------------------------------------
// Recency bias: 1.0-2.0x multiplier for recent memories
//
// < 1 day:   2.0x
// 1-3 days:  1.5x
// 3-7 days:  1.2x
// 7-14 days: 1.1x
// > 14 days: 1.0x (no boost)
// ---------------------------------------------------------------------------

export function recencyBias(createdAt: string, nowMs?: number): number {
  const days = daysSince(createdAt, nowMs);

  if (days < 1) return 2.0;
  if (days < 3) return 1.5;
  if (days < 7) return 1.2;
  if (days < 14) return 1.1;
  return 1.0;
}

// ---------------------------------------------------------------------------
// Score a single episodic entry with full composite scoring
// ---------------------------------------------------------------------------

export function scoreEpisodicEntry(
  entry: EpisodicEntryV2,
  nowMs?: number
): number {
  // If pre-computed composite_score exists (from SQL RPC v4), use it
  if (entry.composite_score !== undefined && entry.composite_score !== null) {
    return entry.composite_score;
  }

  // Fallback: compute from available fields
  const strength = entry.strength ?? 0.5;
  const importance = entry.importance ?? 0.5;
  const halfLifeDays = entry.half_life_days ?? 30;
  const daysOld = entry.created_at
    ? daysSince(entry.created_at, nowMs)
    : 0;

  const bias = entry.created_at ? recencyBias(entry.created_at, nowMs) : 1.0;

  return calculateCompositeScore({
    strength,
    importance,
    halfLifeDays,
    daysSinceCreated: daysOld,
    recencyBiasMultiplier: bias,
  });
}

// ---------------------------------------------------------------------------
// Score a semantic pattern with confidence-weighted recency
// ---------------------------------------------------------------------------

export function scoreSemanticEntry(
  entry: SemanticEntry,
  nowMs?: number
): number {
  const confidence = entry.confidence ?? 0.5;
  const sampleSize = entry.sample_size ?? 0;

  // Bayesian confidence: blend toward prior with small samples
  // effectiveConfidence = (prior * priorStrength + confidence * sampleSize) / (priorStrength + sampleSize)
  const priorStrength = 3;
  const prior = 0.5;
  const effectiveConfidence =
    (prior * priorStrength + confidence * sampleSize) /
    (priorStrength + sampleSize);

  // Recency of last update
  const recency = entry.updated_at
    ? recencyBias(entry.updated_at, nowMs)
    : 1.0;

  // rank_score from RPC if available (already includes org vs global weighting)
  const rankMultiplier = entry.rank_score ? entry.rank_score / confidence : 1.0;

  return effectiveConfidence * recency * rankMultiplier;
}

// ---------------------------------------------------------------------------
// Score a procedural strategy with effectiveness + bayesian smoothing
// ---------------------------------------------------------------------------

export function scoreProceduralEntry(entry: ProceduralEntry): number {
  const effectiveness = entry.effectiveness ?? 0.5;
  const timesApplied = entry.times_applied ?? 0;
  const timesSucceeded = entry.times_succeeded ?? 0;

  // Laplace-smoothed success rate
  const successRate = (timesSucceeded + 1) / (timesApplied + 2);

  // Blend effectiveness metric with empirical success rate
  // More data → trust success rate more; less data → trust effectiveness more
  const dataWeight = Math.min(1, timesApplied / 10);
  return (1 - dataWeight) * effectiveness + dataWeight * successRate;
}

// ---------------------------------------------------------------------------
// Cross-layer weighted score
// When the same concept appears across multiple layers, combine scores
// ---------------------------------------------------------------------------

export function crossLayerScore(params: {
  episodicScores: number[];
  semanticScore: number | null;
  proceduralScore: number | null;
  weights?: Partial<LayerWeights>;
}): number {
  const weights = { ...DEFAULT_LAYER_WEIGHTS, ...params.weights };

  // Episodic: average of top scores (or 0 if none)
  const episodicAvg =
    params.episodicScores.length > 0
      ? params.episodicScores.reduce((a, b) => a + b, 0) /
        params.episodicScores.length
      : 0;

  const semanticVal = params.semanticScore ?? 0;
  const proceduralVal = params.proceduralScore ?? 0;

  // Normalize weights to available layers
  let totalWeight = 0;
  if (params.episodicScores.length > 0) totalWeight += weights.episodic;
  if (params.semanticScore !== null) totalWeight += weights.semantic;
  if (params.proceduralScore !== null) totalWeight += weights.procedural;

  if (totalWeight === 0) return 0;

  const score =
    (episodicAvg * weights.episodic +
      semanticVal * weights.semantic +
      proceduralVal * weights.procedural) /
    totalWeight;

  return Math.round(score * 10000) / 10000;
}

// ---------------------------------------------------------------------------
// Rank and select top memories across all layers
// ---------------------------------------------------------------------------

export function rankMemories(params: {
  episodic: EpisodicEntryV2[];
  semantic: SemanticEntry[];
  procedural: ProceduralEntry[];
  weights?: Partial<LayerWeights>;
  topK?: number;
  nowMs?: number;
}): RankedMemories {
  const topK = params.topK ?? 15;

  // Score each entry
  const scoredEpisodic = params.episodic.map((e) => ({
    ...e,
    score: scoreEpisodicEntry(e, params.nowMs),
  }));

  const scoredSemantic = params.semantic.map((s) => ({
    ...s,
    score: scoreSemanticEntry(s, params.nowMs),
  }));

  const scoredProcedural = params.procedural.map((p) => ({
    ...p,
    score: scoreProceduralEntry(p),
  }));

  // Sort each by score descending
  scoredEpisodic.sort((a, b) => b.score - a.score);
  scoredSemantic.sort((a, b) => b.score - a.score);
  scoredProcedural.sort((a, b) => b.score - a.score);

  // Distribute topK across layers proportionally to weights
  const w = { ...DEFAULT_LAYER_WEIGHTS, ...params.weights };
  const totalWeight = w.episodic + w.semantic + w.procedural;

  const episodicK = Math.max(
    1,
    Math.round((w.episodic / totalWeight) * topK)
  );
  const semanticK = Math.max(
    1,
    Math.round((w.semantic / totalWeight) * topK)
  );
  const proceduralK = Math.max(
    1,
    Math.round((w.procedural / totalWeight) * topK)
  );

  return {
    rankedEpisodic: scoredEpisodic.slice(0, episodicK),
    rankedSemantic: scoredSemantic.slice(0, semanticK),
    rankedProcedural: scoredProcedural.slice(0, proceduralK),
  };
}
