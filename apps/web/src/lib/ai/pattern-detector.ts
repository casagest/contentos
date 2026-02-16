// ============================================================================
// src/lib/ai/pattern-detector.ts
// Pattern Detection — 3-Stage Pipeline: Detect → Validate → Promote
//
// Responsibilities:
//   - Rule-based pattern detection: frequency, co-occurrence, temporal
//   - LLM-based pattern detection (through governor budget system)
//   - Candidate validation with confidence thresholds
//   - Promotion: staging table → semantic_patterns (with audit trail)
//
// Design:
//   - Pattern candidates go to `pattern_candidates` staging table first
//   - Only validated candidates get promoted to `semantic_patterns`
//   - LLM calls gated by decidePaidAIAccess() — falls back to rule-based
//   - All mutations produce audit trail entries
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Result,
  CognitiveError,
  EpisodicEntryV2,
  PatternCandidate,
  FrequencyPattern,
  CoOccurrencePattern,
  TemporalPattern,
} from "./types";
import { Ok, Err } from "./types";
import { callLLM, type LLMTrackingContext } from "./llm-client";
import {
  decidePaidAIAccess,
  estimateTokensFromText,
  estimateAnthropicCostUsd,
  logAIUsageEvent,
} from "./governor";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DEFAULT_LOOKBACK_DAYS = 30;
const DEFAULT_MIN_OCCURRENCES = 3;
const DEFAULT_CO_OCCURRENCE_WINDOW_HOURS = 48;
const DEFAULT_MIN_CO_OCCURRENCES = 2;
const DEFAULT_MIN_CONFIDENCE = 0.6;
const LLM_PATTERN_MODEL = "gpt-4o-mini" as const;
const LLM_PATTERN_MAX_COST_USD = 0.01;

// ---------------------------------------------------------------------------
// Rule-Based: Frequency Patterns
// Finds event types that occur frequently within a time window
// ---------------------------------------------------------------------------

export async function detectFrequencyPatterns(params: {
  supabase: SupabaseClient;
  organizationId: string;
  platform?: string | null;
  lookbackDays?: number;
  minOccurrences?: number;
}): Promise<Result<FrequencyPattern[], CognitiveError>> {
  const { supabase, organizationId } = params;
  const lookbackDays = params.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
  const minOccurrences = params.minOccurrences ?? DEFAULT_MIN_OCCURRENCES;

  const sinceIso = new Date(
    Date.now() - lookbackDays * 86_400_000
  ).toISOString();

  let query = supabase
    .from("episodic_memory")
    .select("event_type, context, importance_score, created_at")
    .eq("organization_id", organizationId)
    .gte("created_at", sinceIso);

  const { data, error } = await query;

  if (error) {
    return Err({
      code: "PATTERN_DETECTION_FAILED",
      message: `Frequency detection failed: ${error.message}`,
      cause: error,
    });
  }

  if (!data || data.length === 0) return Ok([]);

  // Group by event_type + platform
  const groups = new Map<
    string,
    { count: number; totalImportance: number; platform: string | null }
  >();

  for (const row of data) {
    const rowPlatform = typeof row.context === "object" && row.context !== null
      ? (row.context as Record<string, unknown>).platform as string | null
      : null;

    // Filter by platform if specified
    if (params.platform && rowPlatform && rowPlatform !== params.platform) continue;

    const key = `${row.event_type}::${rowPlatform ?? "all"}`;
    const existing = groups.get(key);
    const importance = Number(row.importance_score ?? 0.5);

    if (existing) {
      existing.count++;
      existing.totalImportance += importance;
    } else {
      groups.set(key, {
        count: 1,
        totalImportance: importance,
        platform: rowPlatform ?? null,
      });
    }
  }

  // Filter by minimum occurrences
  const patterns: FrequencyPattern[] = [];
  for (const [key, group] of groups) {
    if (group.count >= minOccurrences) {
      const eventType = key.split("::")[0];
      patterns.push({
        eventType,
        platform: group.platform,
        count: group.count,
        timeWindowDays: lookbackDays,
        avgImportance:
          Math.round((group.totalImportance / group.count) * 10000) / 10000,
      });
    }
  }

  // Sort by count descending
  patterns.sort((a, b) => b.count - a.count);
  return Ok(patterns);
}

// ---------------------------------------------------------------------------
// Rule-Based: Co-Occurrence Patterns
// Finds event types that frequently happen close together
// ---------------------------------------------------------------------------

export async function detectCoOccurrencePatterns(params: {
  supabase: SupabaseClient;
  organizationId: string;
  windowHours?: number;
  minCoOccurrences?: number;
}): Promise<Result<CoOccurrencePattern[], CognitiveError>> {
  const { supabase, organizationId } = params;
  const windowHours =
    params.windowHours ?? DEFAULT_CO_OCCURRENCE_WINDOW_HOURS;
  const minCoOccurrences =
    params.minCoOccurrences ?? DEFAULT_MIN_CO_OCCURRENCES;

  // Fetch recent episodic memories (last 60 days)
  const sinceIso = new Date(Date.now() - 60 * 86_400_000).toISOString();

  const { data, error } = await supabase
    .from("episodic_memory")
    .select("event_type, created_at")
    .eq("organization_id", organizationId)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: true });

  if (error) {
    return Err({
      code: "PATTERN_DETECTION_FAILED",
      message: `Co-occurrence detection failed: ${error.message}`,
      cause: error,
    });
  }

  if (!data || data.length < 2) return Ok([]);

  // Count pairwise co-occurrences within the time window
  const coOccurrences = new Map<string, number>();
  const windowMs = windowHours * 3_600_000;

  for (let i = 0; i < data.length; i++) {
    const timeI = new Date(data[i].created_at).getTime();

    for (let j = i + 1; j < data.length; j++) {
      const timeJ = new Date(data[j].created_at).getTime();
      if (timeJ - timeI > windowMs) break; // Beyond window

      const eventA = data[i].event_type;
      const eventB = data[j].event_type;
      if (eventA === eventB) continue; // Skip self-pairs

      // Canonical key (alphabetical order)
      const key =
        eventA < eventB ? `${eventA}::${eventB}` : `${eventB}::${eventA}`;
      coOccurrences.set(key, (coOccurrences.get(key) ?? 0) + 1);
    }
  }

  // Filter by minimum co-occurrences and compute confidence
  const totalPairs = data.length * (data.length - 1) / 2;
  const patterns: CoOccurrencePattern[] = [];

  for (const [key, count] of coOccurrences) {
    if (count >= minCoOccurrences) {
      const [eventA, eventB] = key.split("::");
      // Confidence = co-occurrence count / total possible pairs (capped at 1)
      const confidence = Math.min(1, count / Math.max(1, totalPairs) * 10);

      patterns.push({
        eventA,
        eventB,
        coOccurrenceCount: count,
        windowHours,
        confidence: Math.round(confidence * 10000) / 10000,
      });
    }
  }

  patterns.sort((a, b) => b.coOccurrenceCount - a.coOccurrenceCount);
  return Ok(patterns);
}

// ---------------------------------------------------------------------------
// Rule-Based: Temporal Patterns
// Finds event types that cluster around specific days/hours
// ---------------------------------------------------------------------------

export async function detectTemporalPatterns(params: {
  supabase: SupabaseClient;
  organizationId: string;
  lookbackDays?: number;
}): Promise<Result<TemporalPattern[], CognitiveError>> {
  const { supabase, organizationId } = params;
  const lookbackDays = params.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
  const sinceIso = new Date(
    Date.now() - lookbackDays * 86_400_000
  ).toISOString();

  const { data, error } = await supabase
    .from("episodic_memory")
    .select("event_type, created_at")
    .eq("organization_id", organizationId)
    .gte("created_at", sinceIso);

  if (error) {
    return Err({
      code: "PATTERN_DETECTION_FAILED",
      message: `Temporal detection failed: ${error.message}`,
      cause: error,
    });
  }

  if (!data || data.length === 0) return Ok([]);

  // Analyze day-of-week distribution per event type
  const dayDistrib = new Map<
    string,
    Map<number, number>
  >();

  // Analyze hour-of-day distribution per event type
  const hourDistrib = new Map<
    string,
    Map<number, number>
  >();

  for (const row of data) {
    const dt = new Date(row.created_at);
    const eventType = row.event_type;

    // Day of week
    if (!dayDistrib.has(eventType)) dayDistrib.set(eventType, new Map());
    const dayMap = dayDistrib.get(eventType)!;
    const day = dt.getUTCDay();
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1);

    // Hour of day
    if (!hourDistrib.has(eventType)) hourDistrib.set(eventType, new Map());
    const hourMap = hourDistrib.get(eventType)!;
    const hour = dt.getUTCHours();
    hourMap.set(hour, (hourMap.get(hour) ?? 0) + 1);
  }

  const patterns: TemporalPattern[] = [];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Find day-of-week peaks (>= 30% of that event type)
  for (const [eventType, dayMap] of dayDistrib) {
    const total = [...dayMap.values()].reduce((a, b) => a + b, 0);
    if (total < 3) continue; // Need minimum data

    for (const [day, count] of dayMap) {
      const freq = count / total;
      if (freq >= 0.3) {
        patterns.push({
          eventType,
          dayOfWeek: day,
          hourOfDay: null,
          frequency: Math.round(freq * 10000) / 10000,
          description: `${eventType} peaks on ${dayNames[day]} (${Math.round(freq * 100)}% of occurrences)`,
        });
      }
    }
  }

  // Find hour-of-day peaks (>= 25% concentration in 3-hour bucket)
  for (const [eventType, hourMap] of hourDistrib) {
    const total = [...hourMap.values()].reduce((a, b) => a + b, 0);
    if (total < 5) continue;

    // Bucket into 3-hour windows
    for (let startHour = 0; startHour < 24; startHour += 3) {
      let bucketCount = 0;
      for (let h = startHour; h < startHour + 3; h++) {
        bucketCount += hourMap.get(h) ?? 0;
      }
      const freq = bucketCount / total;
      if (freq >= 0.25) {
        patterns.push({
          eventType,
          dayOfWeek: null,
          hourOfDay: startHour,
          frequency: Math.round(freq * 10000) / 10000,
          description: `${eventType} clusters ${startHour}:00-${startHour + 3}:00 UTC (${Math.round(freq * 100)}%)`,
        });
      }
    }
  }

  return Ok(patterns);
}

// ---------------------------------------------------------------------------
// LLM-Based: Pattern Detection (budget-gated)
// Uses LLM to identify subtle patterns in episodic summaries
// Falls back gracefully if budget exceeded
// ---------------------------------------------------------------------------

export async function detectLLMPatterns(params: {
  supabase: SupabaseClient;
  organizationId: string;
  episodic: EpisodicEntryV2[];
  maxCostUsd?: number;
}): Promise<Result<PatternCandidate[], CognitiveError>> {
  const { supabase, organizationId, episodic } = params;
  const maxCostUsd = params.maxCostUsd ?? LLM_PATTERN_MAX_COST_USD;

  if (episodic.length === 0) return Ok([]);

  // Prepare summaries for LLM
  const summaries = episodic
    .slice(0, 50) // Cap to prevent excessive token usage
    .map(
      (e, i) =>
        `${i + 1}. [${e.event_type}${e.platform || (e.context as Record<string, unknown>)?.platform ? `/${e.platform || (e.context as Record<string, unknown>)?.platform}` : ""}] ${e.summary || (typeof e.content === "object" ? (e.content as Record<string, unknown>)?.summary ?? (e.content as Record<string, unknown>)?.text ?? "" : e.content ?? "")}`
    )
    .join("\n");

  // Estimate cost
  const inputTokens = estimateTokensFromText(summaries) + 200; // +200 for system prompt
  const estimatedOutputTokens = 500;
  const estimatedCost = estimateAnthropicCostUsd(
    LLM_PATTERN_MODEL,
    inputTokens,
    estimatedOutputTokens
  );

  if (estimatedCost > maxCostUsd) {
    return Err({
      code: "BUDGET_EXCEEDED",
      message: `LLM pattern detection estimated cost $${estimatedCost.toFixed(4)} exceeds max $${maxCostUsd.toFixed(4)}`,
    });
  }

  // Budget check through governor
  const budgetDecision = await decidePaidAIAccess({
    supabase,
    organizationId,
    estimatedAdditionalCostUsd: estimatedCost,
  });

  if (!budgetDecision.allowed) {
    return Err({
      code: "BUDGET_EXCEEDED",
      message: budgetDecision.reason ?? "AI budget exceeded",
    });
  }

  // Call LLM
  const startMs = Date.now();
  const llmResult = await callLLM({
    model: LLM_PATTERN_MODEL,
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content: `You are a pattern detection engine for social media content strategy. Analyze the episodic memories below and identify recurring patterns.

Output JSON array of patterns. Each pattern object:
{
  "patternType": "content_topic" | "timing" | "audience_reaction" | "strategy" | "platform_behavior",
  "patternKey": "short descriptive key",
  "patternValue": { "description": "...", "evidence": ["..."] },
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

Rules:
- Only report patterns with confidence >= 0.5
- Each pattern must have at least 2 supporting events
- Be specific, not generic (e.g., "carousel posts on Instagram get 2x engagement" not "posts do well")
- Maximum 5 patterns
- Output ONLY valid JSON array, no markdown`,
      },
      {
        role: "user",
        content: `Recent episodic memories for this organization:\n\n${summaries}`,
      },
    ],
    maxTokens: 800,
  }, {
    supabase,
    organizationId,
    userId: "",
    routeKey: "pattern-detector",
  } as LLMTrackingContext);

  const latencyMs = Date.now() - startMs;

  if (!llmResult.ok) {
    // Log failed attempt
    await logAIUsageEvent({
      supabase,
      organizationId,
      routeKey: "pattern_detection_llm",
      provider: "openai",
      model: LLM_PATTERN_MODEL,
      mode: "ai",
      inputTokens,
      outputTokens: 0,
      estimatedCostUsd: 0,
      latencyMs,
      success: false,
      errorCode: llmResult.error.code,
    });
    return Err(llmResult.error);
  }

  // Log successful usage
  await logAIUsageEvent({
    supabase,
    organizationId,
    routeKey: "pattern_detection_llm",
    provider: "openai",
    model: LLM_PATTERN_MODEL,
    mode: "ai",
    inputTokens: llmResult.value.usage.promptTokens,
    outputTokens: llmResult.value.usage.completionTokens,
    estimatedCostUsd: estimateAnthropicCostUsd(
      LLM_PATTERN_MODEL,
      llmResult.value.usage.promptTokens,
      llmResult.value.usage.completionTokens
    ),
    latencyMs,
    success: true,
  });

  // Parse LLM response
  const candidates = parseLLMPatterns(
    llmResult.value.content,
    organizationId
  );

  return Ok(candidates);
}

// ---------------------------------------------------------------------------
// Pipeline: Run all detection stages for an organization
// ---------------------------------------------------------------------------

export async function runDetectionPipeline(params: {
  supabase: SupabaseClient;
  organizationId: string;
  platform?: string | null;
}): Promise<Result<PatternCandidate[], CognitiveError>> {
  const { supabase, organizationId } = params;
  const candidates: PatternCandidate[] = [];

  // Stage 1: Rule-based frequency patterns
  const freqResult = await detectFrequencyPatterns({
    supabase,
    organizationId,
    platform: params.platform,
  });

  if (freqResult.ok) {
    for (const fp of freqResult.value) {
      candidates.push({
        organizationId,
        patternType: "frequency",
        platform: fp.platform,
        patternKey: `${fp.eventType}_frequency`,
        patternValue: {
          count: fp.count,
          timeWindowDays: fp.timeWindowDays,
          avgImportance: fp.avgImportance,
        },
        confidence: Math.min(1, fp.count / 10), // More occurrences → higher confidence
        sourceType: "rule_based",
        evidenceIds: [],
        sampleSize: fp.count,
        status: "pending",
      });
    }
  }

  // Stage 2: Rule-based co-occurrence patterns
  const coResult = await detectCoOccurrencePatterns({
    supabase,
    organizationId,
  });

  if (coResult.ok) {
    for (const co of coResult.value) {
      candidates.push({
        organizationId,
        patternType: "co_occurrence",
        patternKey: `${co.eventA}_with_${co.eventB}`,
        patternValue: {
          eventA: co.eventA,
          eventB: co.eventB,
          coOccurrenceCount: co.coOccurrenceCount,
          windowHours: co.windowHours,
        },
        confidence: co.confidence,
        sourceType: "rule_based",
        evidenceIds: [],
        sampleSize: co.coOccurrenceCount,
        status: "pending",
      });
    }
  }

  // Stage 3: Rule-based temporal patterns
  const tempResult = await detectTemporalPatterns({
    supabase,
    organizationId,
  });

  if (tempResult.ok) {
    for (const tp of tempResult.value) {
      candidates.push({
        organizationId,
        patternType: "temporal",
        patternKey: `${tp.eventType}_${tp.dayOfWeek !== null ? `day${tp.dayOfWeek}` : `hour${tp.hourOfDay}`}`,
        patternValue: {
          dayOfWeek: tp.dayOfWeek,
          hourOfDay: tp.hourOfDay,
          frequency: tp.frequency,
          description: tp.description,
        },
        confidence: tp.frequency,
        sourceType: "rule_based",
        evidenceIds: [],
        sampleSize: 0, // Derived from aggregation
        status: "pending",
      });
    }
  }

  // Stage 4: LLM-based detection (optional, budget-gated)
  // Fetch recent episodic for LLM analysis
  const sinceIso = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data: recentEpisodic } = await supabase
    .from("episodic_memory")
    .select("id, content, context, event_type, importance_score, created_at, strength, recall_count, ease_factor, half_life_days")
    .eq("organization_id", organizationId)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(50);

  if (recentEpisodic && recentEpisodic.length >= 5) {
    const llmResult = await detectLLMPatterns({
      supabase,
      organizationId,
      episodic: recentEpisodic as EpisodicEntryV2[],
    });

    if (llmResult.ok) {
      candidates.push(...llmResult.value);
    }
    // Budget exceeded or LLM failure is non-fatal — rule-based results still returned
  }

  return Ok(candidates);
}

// ---------------------------------------------------------------------------
// Validate: filter candidates by confidence threshold + dedup
// ---------------------------------------------------------------------------

export async function validateCandidates(params: {
  supabase: SupabaseClient;
  organizationId: string;
  candidates: PatternCandidate[];
  minConfidence?: number;
}): Promise<Result<PatternCandidate[], CognitiveError>> {
  const minConfidence = params.minConfidence ?? DEFAULT_MIN_CONFIDENCE;

  // Filter by minimum confidence
  const validated = params.candidates
    .filter((c) => c.confidence >= minConfidence)
    .map((c) => ({ ...c, status: "validated" as const }));

  // Dedup by patternKey (keep highest confidence)
  const byKey = new Map<string, PatternCandidate>();
  for (const c of validated) {
    const existing = byKey.get(c.patternKey);
    if (!existing || c.confidence > existing.confidence) {
      byKey.set(c.patternKey, c);
    }
  }

  return Ok([...byKey.values()]);
}

// ---------------------------------------------------------------------------
// Promote: validated candidates → semantic_patterns
// Inserts into pattern_candidates staging table
// Returns counts of promoted, merged, rejected
// ---------------------------------------------------------------------------

export async function promoteCandidates(params: {
  supabase: SupabaseClient;
  organizationId: string;
  candidates: PatternCandidate[];
}): Promise<
  Result<
    { promoted: number; merged: number; rejected: number },
    CognitiveError
  >
> {
  const { supabase, organizationId, candidates } = params;

  if (candidates.length === 0) {
    return Ok({ promoted: 0, merged: 0, rejected: 0 });
  }

  let promoted = 0;
  let merged = 0;
  let rejected = 0;

  for (const candidate of candidates) {
    // Check if pattern already exists in semantic_patterns
    const { data: existing } = await supabase
      .from("semantic_patterns")
      .select("id, confidence, sample_size")
      .eq("organization_id", organizationId)
      .eq("pattern_type", candidate.patternType)
      .eq("pattern_key", candidate.patternKey)
      .maybeSingle();

    if (existing) {
      // Merge: update confidence via weighted average
      const existingSampleSize = existing.sample_size ?? 1;
      const newSampleSize = existingSampleSize + candidate.sampleSize;
      const mergedConfidence =
        (existing.confidence * existingSampleSize +
          candidate.confidence * candidate.sampleSize) /
        newSampleSize;

      const { error: mergeError } = await supabase
        .from("semantic_patterns")
        .update({
          confidence: Math.round(mergedConfidence * 10000) / 10000,
          sample_size: newSampleSize,
          pattern_value: candidate.patternValue,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .eq("organization_id", organizationId);

      if (!mergeError) {
        merged++;
        // Record in staging table as merged
        await insertCandidateRecord(supabase, {
          ...candidate,
          organizationId,
          status: "promoted",
        });
      }
    } else {
      // New pattern: insert into semantic_patterns
      const { data: inserted, error: insertError } = await supabase
        .from("semantic_patterns")
        .insert({
          organization_id: organizationId,
          pattern_type: candidate.patternType,
          platform: candidate.platform ?? null,
          pattern_key: candidate.patternKey,
          pattern_value: candidate.patternValue,
          confidence: candidate.confidence,
          sample_size: candidate.sampleSize,
        })
        .select("id")
        .single();

      if (!insertError && inserted) {
        promoted++;
        await insertCandidateRecord(supabase, {
          ...candidate,
          organizationId,
          status: "promoted",
        });
      } else {
        rejected++;
        await insertCandidateRecord(supabase, {
          ...candidate,
          organizationId,
          status: "rejected",
        });
      }
    }
  }

  return Ok({ promoted, merged, rejected });
}

// ---------------------------------------------------------------------------
// Internal: insert candidate into staging table
// ---------------------------------------------------------------------------

async function insertCandidateRecord(
  supabase: SupabaseClient,
  candidate: PatternCandidate & { organizationId: string }
): Promise<void> {
  try {
    await supabase.from("pattern_candidates").insert({
      organization_id: candidate.organizationId,
      pattern_type: candidate.patternType,
      platform: candidate.platform ?? null,
      pattern_key: candidate.patternKey,
      pattern_value: candidate.patternValue,
      confidence: candidate.confidence,
      source_type: candidate.sourceType,
      evidence_ids: candidate.evidenceIds ?? [],
      sample_size: candidate.sampleSize,
      status: candidate.status,
      llm_reasoning: candidate.llmReasoning ?? null,
    });
  } catch {
    // Best-effort staging record — never blocks promotion
  }
}

// ---------------------------------------------------------------------------
// Internal: parse LLM JSON response into PatternCandidate[]
// ---------------------------------------------------------------------------

function parseLLMPatterns(
  content: string,
  organizationId: string
): PatternCandidate[] {
  try {
    // Extract JSON array from response (handle markdown code blocks)
    let jsonStr = content.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return [];

    const candidates: PatternCandidate[] = [];
    for (const item of parsed) {
      if (
        typeof item.patternType === "string" &&
        typeof item.patternKey === "string" &&
        typeof item.confidence === "number" &&
        item.confidence >= 0 &&
        item.confidence <= 1
      ) {
        candidates.push({
          organizationId,
          patternType: item.patternType,
          patternKey: item.patternKey,
          patternValue: item.patternValue ?? {},
          confidence: item.confidence,
          sourceType: "llm_detected",
          evidenceIds: [],
          sampleSize: 0,
          status: "pending",
          llmReasoning: item.reasoning ?? null,
        });
      }
    }

    return candidates.slice(0, 10); // Cap at 10 LLM patterns
  } catch {
    return []; // Invalid JSON → no patterns
  }
}
