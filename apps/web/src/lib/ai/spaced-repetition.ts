// ============================================================================
// src/lib/ai/spaced-repetition.ts
// Spaced Repetition — SM2 Algorithm Adapted for Content Memory
//
// Responsibilities:
//   - SM2 algorithm: ease factor, interval, strength calculations
//   - Record memory recall events (explicit quality rating)
//   - Implicit boost when memories are accessed during generation
//   - Review queue: memories due for recall, ordered by urgency
//
// SM2 adaptation for content memory:
//   Quality 5: memory used + content performed exceptionally
//   Quality 4: memory used + content performed well
//   Quality 3: memory used + content performed average
//   Quality 2: memory used + content underperformed
//   Quality 1: memory accessed but not used
//   Quality 0: memory decayed / blackout
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  SM2Quality,
  SM2State,
  ReviewQueueItem,
  Result,
  CognitiveError,
} from "./types";
import { Ok, Err } from "./types";

// ---------------------------------------------------------------------------
// SM2 Constants
// ---------------------------------------------------------------------------

const MIN_EASE_FACTOR = 1.3;
const DEFAULT_EASE_FACTOR = 2.5;
const MAX_EASE_FACTOR = 5.0;
const DEFAULT_STRENGTH = 0.5;
const MAX_STRENGTH = 1.0;
const MIN_STRENGTH = 0.0;
const DEFAULT_BOOST_FACTOR = 1.2;

// ---------------------------------------------------------------------------
// Pure SM2 Algorithm
// Given current state + quality rating, return next state
//
// SM2 formula:
//   EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
//   If q < 3: reset interval to 1
//   Interval: I(1) = 1, I(2) = 6, I(n) = I(n-1) * EF
//   Strength: bounded [0, 1], increases on high quality, decreases on low
// ---------------------------------------------------------------------------

export function sm2Next(current: SM2State, quality: SM2Quality): SM2State {
  const q = quality;

  // Update ease factor
  let newEF =
    current.easeFactor +
    (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  newEF = Math.max(MIN_EASE_FACTOR, Math.min(MAX_EASE_FACTOR, newEF));

  // Update interval
  let newInterval: number;
  if (q < 3) {
    // Failed recall — reset interval
    newInterval = 1;
  } else if (current.recallCount === 0) {
    newInterval = 1;
  } else if (current.recallCount === 1) {
    newInterval = 6;
  } else {
    newInterval = Math.round(current.interval * newEF);
  }

  // Update strength based on quality
  let newStrength: number;
  if (q >= 4) {
    // Good recall: increase strength
    newStrength = Math.min(
      MAX_STRENGTH,
      current.strength + (1 - current.strength) * 0.15
    );
  } else if (q === 3) {
    // Adequate recall: small increase
    newStrength = Math.min(
      MAX_STRENGTH,
      current.strength + (1 - current.strength) * 0.05
    );
  } else if (q === 2) {
    // Poor recall: slight decrease
    newStrength = Math.max(MIN_STRENGTH, current.strength * 0.9);
  } else {
    // Blackout: significant decrease
    newStrength = Math.max(MIN_STRENGTH, current.strength * 0.7);
  }

  return {
    easeFactor: Math.round(newEF * 100) / 100,
    interval: newInterval,
    strength: Math.round(newStrength * 10000) / 10000,
    recallCount: current.recallCount + 1,
  };
}

// ---------------------------------------------------------------------------
// Record explicit memory recall with quality rating
// Updates: recall_count, last_recalled_at, strength, ease_factor, next_review_at
// ---------------------------------------------------------------------------

export async function recordMemoryRecall(params: {
  supabase: SupabaseClient;
  organizationId: string;
  memoryId: string;
  quality: SM2Quality;
  context?: string;
}): Promise<Result<SM2State, CognitiveError>> {
  const { supabase, organizationId, memoryId, quality } = params;

  // Fetch current state
  const { data, error } = await supabase
    .from("episodic_memory")
    .select(
      "ease_factor, strength, recall_count, last_recalled_at, next_review_at"
    )
    .eq("id", memoryId)
    .eq("organization_id", organizationId)
    .single();

  if (error) {
    return Err({
      code: "RPC_FAILED",
      message: `Failed to fetch memory for recall: ${error.message}`,
      cause: error,
    });
  }

  if (!data) {
    return Err({
      code: "RPC_FAILED",
      message: `Memory ${memoryId} not found`,
    });
  }

  const currentState: SM2State = {
    easeFactor: data.ease_factor ?? DEFAULT_EASE_FACTOR,
    strength: data.strength ?? DEFAULT_STRENGTH,
    recallCount: data.recall_count ?? 0,
    interval: 1,
  };

  // Calculate next state
  const nextState = sm2Next(currentState, quality);

  // Calculate next review date
  const nextReviewAt = new Date(
    Date.now() + nextState.interval * 86_400_000
  ).toISOString();

  // Update DB
  const { error: updateError } = await supabase
    .from("episodic_memory")
    .update({
      ease_factor: nextState.easeFactor,
      strength: nextState.strength,
      recall_count: nextState.recallCount,
      last_recalled_at: new Date().toISOString(),
      next_review_at: nextReviewAt,
    })
    .eq("id", memoryId)
    .eq("organization_id", organizationId);

  if (updateError) {
    return Err({
      code: "RPC_FAILED",
      message: `Failed to update memory recall: ${updateError.message}`,
      cause: updateError,
    });
  }

  return Ok(nextState);
}

// ---------------------------------------------------------------------------
// Implicit boost: memories used during content generation get strength boost
// Called from generate-cognitive route after successful LLM call
// ---------------------------------------------------------------------------

export async function boostMemoryOnAccess(params: {
  supabase: SupabaseClient;
  organizationId: string;
  memoryIds: string[];
  boostFactor?: number;
}): Promise<Result<number, CognitiveError>> {
  const { supabase, organizationId, memoryIds } = params;
  const boostFactor = params.boostFactor ?? DEFAULT_BOOST_FACTOR;

  if (memoryIds.length === 0) return Ok(0);

  // Fetch current strengths
  const { data, error } = await supabase
    .from("episodic_memory")
    .select("id, strength")
    .eq("organization_id", organizationId)
    .in("id", memoryIds);

  if (error) {
    return Err({
      code: "RPC_FAILED",
      message: `Failed to fetch memories for boost: ${error.message}`,
      cause: error,
    });
  }

  if (!data || data.length === 0) return Ok(0);

  let boosted = 0;
  for (const row of data) {
    const currentStrength = row.strength ?? DEFAULT_STRENGTH;
    const newStrength = Math.min(
      MAX_STRENGTH,
      currentStrength * boostFactor
    );

    const { error: updateError } = await supabase
      .from("episodic_memory")
      .update({
        strength: Math.round(newStrength * 10000) / 10000,
        last_recalled_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .eq("organization_id", organizationId);

    if (!updateError) boosted++;
  }

  return Ok(boosted);
}

// ---------------------------------------------------------------------------
// Review queue: memories due for review, ordered by urgency
// ---------------------------------------------------------------------------

export async function getReviewQueue(params: {
  supabase: SupabaseClient;
  organizationId: string;
  limit?: number;
  platform?: string | null;
}): Promise<Result<ReviewQueueItem[], CognitiveError>> {
  const { supabase, organizationId } = params;
  const limit = params.limit ?? 20;

  let query = supabase
    .from("episodic_memory")
    .select("id, summary, strength, last_recalled_at, next_review_at")
    .eq("organization_id", organizationId)
    .not("next_review_at", "is", null)
    .lte("next_review_at", new Date().toISOString())
    .order("next_review_at", { ascending: true })
    .limit(limit);

  if (params.platform) {
    query = query.eq("platform", params.platform);
  }

  const { data, error } = await query;

  if (error) {
    return Err({
      code: "RPC_FAILED",
      message: `Failed to fetch review queue: ${error.message}`,
      cause: error,
    });
  }

  const items: ReviewQueueItem[] = (data ?? []).map((row) => {
    const lastRecalled = row.last_recalled_at
      ? new Date(row.last_recalled_at).getTime()
      : new Date(row.next_review_at).getTime();
    const daysSinceReview = Math.max(
      0,
      (Date.now() - lastRecalled) / 86_400_000
    );

    return {
      id: row.id,
      summary: row.summary,
      strength: row.strength ?? DEFAULT_STRENGTH,
      daysSinceReview: Math.round(daysSinceReview * 100) / 100,
      nextReviewAt: row.next_review_at,
    };
  });

  return Ok(items);
}

// ---------------------------------------------------------------------------
// Mark memories as accessed (lightweight, no quality rating)
// Just updates last_recalled_at timestamp
// ---------------------------------------------------------------------------

export async function markMemoriesAccessed(params: {
  supabase: SupabaseClient;
  organizationId: string;
  episodicIds: string[];
}): Promise<Result<void, CognitiveError>> {
  const { supabase, organizationId, episodicIds } = params;

  if (episodicIds.length === 0) return Ok(undefined);

  const { error } = await supabase
    .from("episodic_memory")
    .update({ last_recalled_at: new Date().toISOString() })
    .eq("organization_id", organizationId)
    .in("id", episodicIds);

  if (error) {
    return Err({
      code: "RPC_FAILED",
      message: `Failed to mark memories accessed: ${error.message}`,
      cause: error,
    });
  }

  return Ok(undefined);
}
