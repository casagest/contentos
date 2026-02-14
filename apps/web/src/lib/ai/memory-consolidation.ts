// ============================================================================
// src/lib/ai/memory-consolidation.ts
// Memory Consolidation — Full Pipeline with Audit Trail
//
// Responsibilities:
//   - Orchestrate: detect → validate → promote → extract entities → link
//   - Append-only audit trail (consolidation_audit_log)
//   - Conflict resolution when new patterns contradict existing ones
//   - Dry-run mode for testing without mutations
//
// Called from:
//   - Cron route (automated, per-org)
//   - Manual trigger via /api/ai/patterns endpoint
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Result,
  CognitiveError,
  AuditEntry,
  AuditActionType,
  PatternCandidate,
  ConsolidationStats,
} from "./types";
import { Ok, Err } from "./types";
import {
  runDetectionPipeline,
  validateCandidates,
  promoteCandidates,
} from "./pattern-detector";

// ---------------------------------------------------------------------------
// Append audit entry (append-only, never throws)
// ---------------------------------------------------------------------------

export async function appendAuditEntry(params: {
  supabase: SupabaseClient;
  entry: AuditEntry;
}): Promise<Result<void, CognitiveError>> {
  try {
    const { error } = await params.supabase
      .from("consolidation_audit_log")
      .insert({
        organization_id: params.entry.organizationId,
        action_type: params.entry.actionType,
        source_ids: params.entry.sourceIds,
        target_id: params.entry.targetId ?? null,
        details: params.entry.details,
        confidence: params.entry.confidence ?? null,
        actor: params.entry.actor,
      });

    if (error) {
      return Err({
        code: "CONSOLIDATION_FAILED",
        message: `Audit entry write failed: ${error.message}`,
        cause: error,
      });
    }

    return Ok(undefined);
  } catch (err) {
    // Best-effort: audit failures should never block consolidation
    return Err({
      code: "CONSOLIDATION_FAILED",
      message: `Audit entry exception: ${err instanceof Error ? err.message : String(err)}`,
      cause: err,
    });
  }
}

// ---------------------------------------------------------------------------
// Full consolidation pipeline for one organization
// ---------------------------------------------------------------------------

export async function consolidateOrganization(params: {
  supabase: SupabaseClient;
  organizationId: string;
  platform?: string | null;
  dryRun?: boolean;
}): Promise<Result<ConsolidationStats, CognitiveError>> {
  const { supabase, organizationId, dryRun = false } = params;
  const startMs = Date.now();

  const stats: ConsolidationStats = {
    patternsDetected: 0,
    patternsPromoted: 0,
    patternsMerged: 0,
    patternsRejected: 0,
    conflictsResolved: 0,
    entitiesExtracted: 0,
    entitiesLinked: 0,
    auditEntriesCreated: 0,
    durationMs: 0,
  };

  // Step 1: Run detection pipeline
  const detectionResult = await runDetectionPipeline({
    supabase,
    organizationId,
    platform: params.platform,
  });

  if (!detectionResult.ok) {
    stats.durationMs = Date.now() - startMs;
    return Err({
      code: "CONSOLIDATION_FAILED",
      message: `Detection pipeline failed: ${detectionResult.error.message}`,
      cause: detectionResult.error,
    });
  }

  stats.patternsDetected = detectionResult.value.length;

  if (detectionResult.value.length === 0) {
    stats.durationMs = Date.now() - startMs;
    return Ok(stats);
  }

  // Step 2: Validate candidates
  const validationResult = await validateCandidates({
    supabase,
    organizationId,
    candidates: detectionResult.value,
  });

  if (!validationResult.ok) {
    stats.durationMs = Date.now() - startMs;
    return Err({
      code: "CONSOLIDATION_FAILED",
      message: `Validation failed: ${validationResult.error.message}`,
      cause: validationResult.error,
    });
  }

  const validated = validationResult.value;
  stats.patternsRejected =
    detectionResult.value.length - validated.length;

  if (dryRun) {
    // Dry run: return stats without mutations
    stats.patternsPromoted = validated.length;
    stats.durationMs = Date.now() - startMs;
    return Ok(stats);
  }

  // Step 3: Check for conflicts and resolve
  const resolvedCandidates: PatternCandidate[] = [];
  for (const candidate of validated) {
    const conflictResult = await checkAndResolveConflict({
      supabase,
      organizationId,
      candidate,
    });

    if (conflictResult.resolved) {
      stats.conflictsResolved++;
    }

    if (conflictResult.action !== "reject") {
      resolvedCandidates.push(candidate);
    } else {
      stats.patternsRejected++;
    }
  }

  // Step 4: Promote validated candidates
  const promotionResult = await promoteCandidates({
    supabase,
    organizationId,
    candidates: resolvedCandidates,
  });

  if (promotionResult.ok) {
    stats.patternsPromoted = promotionResult.value.promoted;
    stats.patternsMerged = promotionResult.value.merged;
    stats.patternsRejected += promotionResult.value.rejected;
  }

  // Step 5: Write audit entries for the consolidation run
  const auditResult = await appendAuditEntry({
    supabase,
    entry: {
      organizationId,
      actionType: "episodic_promoted",
      sourceIds: [],
      details: {
        patternsDetected: stats.patternsDetected,
        patternsPromoted: stats.patternsPromoted,
        patternsMerged: stats.patternsMerged,
        patternsRejected: stats.patternsRejected,
        conflictsResolved: stats.conflictsResolved,
      },
      actor: "system",
    },
  });

  if (auditResult.ok) {
    stats.auditEntriesCreated++;
  }

  stats.durationMs = Date.now() - startMs;
  return Ok(stats);
}

// ---------------------------------------------------------------------------
// Conflict resolution
// When a new pattern contradicts or duplicates an existing one
// ---------------------------------------------------------------------------

export async function resolveConflict(params: {
  supabase: SupabaseClient;
  organizationId: string;
  existingPatternId: string;
  newCandidate: PatternCandidate;
}): Promise<
  Result<"keep_existing" | "replace" | "merge", CognitiveError>
> {
  const { supabase, organizationId, existingPatternId, newCandidate } = params;

  // Fetch existing pattern
  const { data: existing, error } = await supabase
    .from("semantic_patterns")
    .select("id, confidence, sample_size, pattern_value, updated_at")
    .eq("id", existingPatternId)
    .eq("organization_id", organizationId)
    .single();

  if (error || !existing) {
    return Err({
      code: "CONSOLIDATION_FAILED",
      message: `Cannot resolve conflict: existing pattern ${existingPatternId} not found`,
    });
  }

  // Decision logic:
  // 1. If new has significantly higher confidence (>0.2 diff) AND more samples → replace
  // 2. If similar confidence → merge
  // 3. If existing has much more samples → keep existing

  const existingSamples = existing.sample_size ?? 1;
  const newSamples = newCandidate.sampleSize ?? 0;
  const confidenceDiff = newCandidate.confidence - (existing.confidence ?? 0.5);

  let decision: "keep_existing" | "replace" | "merge";

  if (confidenceDiff > 0.2 && newSamples > existingSamples) {
    decision = "replace";
  } else if (existingSamples > newSamples * 3) {
    decision = "keep_existing";
  } else {
    decision = "merge";
  }

  // Apply decision
  if (decision === "replace") {
    const { error: updateErr } = await supabase
      .from("semantic_patterns")
      .update({
        pattern_value: newCandidate.patternValue,
        confidence: newCandidate.confidence,
        sample_size: newSamples,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingPatternId)
      .eq("organization_id", organizationId);

    if (updateErr) {
      return Err({
        code: "CONSOLIDATION_FAILED",
        message: `Replace failed: ${updateErr.message}`,
        cause: updateErr,
      });
    }
  } else if (decision === "merge") {
    const mergedSamples = existingSamples + newSamples;
    const mergedConfidence =
      (existing.confidence * existingSamples +
        newCandidate.confidence * newSamples) /
      mergedSamples;

    const { error: mergeErr } = await supabase
      .from("semantic_patterns")
      .update({
        confidence: Math.round(mergedConfidence * 10000) / 10000,
        sample_size: mergedSamples,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingPatternId)
      .eq("organization_id", organizationId);

    if (mergeErr) {
      return Err({
        code: "CONSOLIDATION_FAILED",
        message: `Merge failed: ${mergeErr.message}`,
        cause: mergeErr,
      });
    }
  }
  // keep_existing = no mutation needed

  // Record audit entry for conflict resolution
  await appendAuditEntry({
    supabase,
    entry: {
      organizationId,
      actionType: "conflict_resolved",
      sourceIds: [existingPatternId],
      details: {
        decision,
        existingConfidence: existing.confidence,
        newConfidence: newCandidate.confidence,
        existingSamples,
        newSamples,
      },
      actor: "system",
    },
  });

  return Ok(decision);
}

// ---------------------------------------------------------------------------
// Query audit trail
// ---------------------------------------------------------------------------

export async function queryAuditTrail(params: {
  supabase: SupabaseClient;
  organizationId: string;
  actionType?: AuditActionType;
  limit?: number;
  since?: string;
}): Promise<Result<AuditEntry[], CognitiveError>> {
  const { supabase, organizationId } = params;
  const limit = params.limit ?? 50;

  let query = supabase
    .from("consolidation_audit_log")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (params.actionType) {
    query = query.eq("action_type", params.actionType);
  }

  if (params.since) {
    query = query.gte("created_at", params.since);
  }

  const { data, error } = await query;

  if (error) {
    return Err({
      code: "CONSOLIDATION_FAILED",
      message: `Audit trail query failed: ${error.message}`,
      cause: error,
    });
  }

  const entries: AuditEntry[] = (data ?? []).map((row) => ({
    organizationId: row.organization_id,
    actionType: row.action_type,
    sourceIds: row.source_ids ?? [],
    targetId: row.target_id ?? undefined,
    details: row.details ?? {},
    confidence: row.confidence ?? undefined,
    actor: row.actor,
    createdAt: row.created_at,
  }));

  return Ok(entries);
}

// ---------------------------------------------------------------------------
// Internal: check for conflicts before promotion
// ---------------------------------------------------------------------------

async function checkAndResolveConflict(params: {
  supabase: SupabaseClient;
  organizationId: string;
  candidate: PatternCandidate;
}): Promise<{ resolved: boolean; action: "promote" | "reject" }> {
  const { supabase, organizationId, candidate } = params;

  // Check if existing pattern conflicts
  const { data: existing } = await supabase
    .from("semantic_patterns")
    .select("id, confidence, sample_size")
    .eq("organization_id", organizationId)
    .eq("pattern_type", candidate.patternType)
    .eq("pattern_key", candidate.patternKey)
    .maybeSingle();

  if (!existing) {
    // No conflict — proceed with promotion
    return { resolved: false, action: "promote" };
  }

  // Conflict exists — resolve it
  const result = await resolveConflict({
    supabase,
    organizationId,
    existingPatternId: existing.id,
    newCandidate: candidate,
  });

  if (!result.ok) {
    return { resolved: false, action: "reject" };
  }

  return {
    resolved: true,
    action: result.value === "keep_existing" ? "reject" : "promote",
  };
}
