// ============================================================================
// src/lib/ai/types.ts
// Cognitive Memory — Type Definitions & Zod Schemas
// Single source of truth. All other files import from here.
// ============================================================================

import { z } from "zod";

// ---------------------------------------------------------------------------
// Result<T, E> — no thrown exceptions in domain logic
// ---------------------------------------------------------------------------

export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function Ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function Err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// ---------------------------------------------------------------------------
// Platform & Event enums (mirrors DB enums, validated at boundary)
// ---------------------------------------------------------------------------

export const PLATFORMS = [
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "twitter",
] as const;
export type Platform = (typeof PLATFORMS)[number];

export const EVENT_TYPES = [
  "post_success",
  "post_failure",
  "viral_moment",
  "audience_shift",
  "goal_milestone",
  "strategy_change",
  "competitor_insight",
  "trend_detected",
  "budget_exhausted",
  "content_gap_found",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

// ---------------------------------------------------------------------------
// Zod Schemas — Cognitive Context (RPC response validation)
// ---------------------------------------------------------------------------

export const EpisodicEntrySchema = z.object({
  id: z.string().uuid().optional(),
  // RPC returns "summary" (aliased from content jsonb), DB has "content" (jsonb)
  summary: z.string().optional(),
  content: z.union([z.string(), z.record(z.unknown())]).optional(),
  event_type: z.string(),
  // RPC returns "platform" (aliased from context->>'platform'), DB has "context" (jsonb)
  platform: z.string().nullable().optional(),
  context: z.record(z.unknown()).optional(),
  // RPC returns "importance" (aliased from importance_score), DB has "importance_score"
  importance: z.number().min(0).max(1).optional(),
  importance_score: z.number().min(0).max(1).optional(),
  created_at: z.string().optional(),
  current_weight: z.number().optional(),
});
export type EpisodicEntry = z.infer<typeof EpisodicEntrySchema>;

export const SemanticEntrySchema = z.object({
  pattern_type: z.string(),
  platform: z.string().nullable().optional(),
  pattern_key: z.string(),
  pattern_value: z.unknown(),
  confidence: z.number().min(0).max(1).optional(),
  sample_size: z.number().int().min(0).optional(),
  updated_at: z.string().optional(),
  rank_score: z.number().optional(),
});
export type SemanticEntry = z.infer<typeof SemanticEntrySchema>;

export const ProceduralEntrySchema = z.object({
  name: z.string(),
  strategy_type: z.string(),
  platform: z.string().nullable().optional(),
  description: z.string().optional(),
  conditions: z.unknown(),
  actions: z.unknown(),
  effectiveness: z.number().min(0).max(1).optional(),
  times_applied: z.number().int().min(0).optional(),
  times_succeeded: z.number().int().min(0).optional(),
});
export type ProceduralEntry = z.infer<typeof ProceduralEntrySchema>;

export const WorkingEntrySchema = z.object({
  memory_type: z.string(),
  content: z.unknown(),
  valid_until: z.string().optional(),
  updated_at: z.string().optional(),
});
export type WorkingEntry = z.infer<typeof WorkingEntrySchema>;

export const MetacognitiveSchema = z.object({
  accuracy_bayesian: z.number().min(0).max(1).optional(),
  accuracy_samples: z.number().int().min(0).optional(),
  calculated_temperature: z.number().min(0).max(1).optional(),
  temperature_method: z.string().optional(),
  prior_strength: z.number().optional(),
  layers_injected: z.number().int().optional(),
});
export type Metacognitive = z.infer<typeof MetacognitiveSchema>;

export const CognitiveContextSchema = z.object({
  episodic: z.array(EpisodicEntrySchema).default([]),
  semantic: z.array(SemanticEntrySchema).default([]),
  procedural: z.array(ProceduralEntrySchema).default([]),
  working: z.array(WorkingEntrySchema).default([]),
  metacognitive: MetacognitiveSchema.default({}),
});
export type CognitiveContext = z.infer<typeof CognitiveContextSchema>;

// ---------------------------------------------------------------------------
// Zod Schemas — Generate endpoint input
// ---------------------------------------------------------------------------

export const GenerateInputSchema = z.object({
  organizationId: z.string().uuid("organizationId must be a valid UUID"),
  platform: z.enum(PLATFORMS, {
    errorMap: () => ({
      message: `platform must be one of: ${PLATFORMS.join(", ")}`,
    }),
  }),
  objective: z
    .string()
    .min(1, "objective is required")
    .max(4000, "objective must be under 4000 characters"),
  shouldEscalate: z.boolean().optional().default(false),
});
export type GenerateInput = z.infer<typeof GenerateInputSchema>;

export const GenerateOutputSchema = z.object({
  content: z.string(),
  meta: z.object({
    cognitiveMemory: z.object({
      layersInjected: z.number().int(),
      temperature: z.number(),
      accuracyBayesian: z.number().nullable(),
      accuracySamples: z.number().int(),
      tokenEstimate: z.number().int(),
      fallback: z.boolean(),
    }),
  }),
});
export type GenerateOutput = z.infer<typeof GenerateOutputSchema>;

// ---------------------------------------------------------------------------
// Decay & Spaced Repetition types
// ---------------------------------------------------------------------------

export const DecayConfigSchema = z.object({
  halfLifeDays: z.number().positive().default(30),
  minStrength: z.number().min(0).max(1).default(0.05),
  recallBoostFactor: z.number().positive().default(1.2),
});
export type DecayConfig = z.infer<typeof DecayConfigSchema>;

export const SM2_QUALITY = [0, 1, 2, 3, 4, 5] as const;
export type SM2Quality = (typeof SM2_QUALITY)[number];

export interface SM2State {
  easeFactor: number;
  interval: number;
  strength: number;
  recallCount: number;
}

export const EpisodicEntryV2Schema = EpisodicEntrySchema.extend({
  strength: z.number().min(0).max(1).optional(),
  recall_count: z.number().int().min(0).optional(),
  last_recalled_at: z.string().nullable().optional(),
  ease_factor: z.number().min(1.3).max(5).optional(),
  next_review_at: z.string().nullable().optional(),
  half_life_days: z.number().positive().optional(),
  composite_score: z.number().optional(),
});
export type EpisodicEntryV2 = z.infer<typeof EpisodicEntryV2Schema>;

export interface ReviewQueueItem {
  id: string;
  summary: string;
  strength: number;
  daysSinceReview: number;
  nextReviewAt: string | null;
}

// ---------------------------------------------------------------------------
// Layer weights for cross-layer scoring
// ---------------------------------------------------------------------------

export interface LayerWeights {
  episodic: number;
  semantic: number;
  procedural: number;
  working: number;
}

export interface RankedMemories {
  rankedEpisodic: Array<EpisodicEntryV2 & { score: number }>;
  rankedSemantic: Array<SemanticEntry & { score: number }>;
  rankedProcedural: Array<ProceduralEntry & { score: number }>;
}

// ---------------------------------------------------------------------------
// Pattern Detection types
// ---------------------------------------------------------------------------

export const PATTERN_CANDIDATE_STATUSES = [
  "pending",
  "validated",
  "promoted",
  "rejected",
] as const;
export type PatternCandidateStatus =
  (typeof PATTERN_CANDIDATE_STATUSES)[number];

export const PatternCandidateSchema = z.object({
  id: z.string().uuid().optional(),
  organizationId: z.string().uuid(),
  patternType: z.string(),
  platform: z.string().nullable().optional(),
  patternKey: z.string(),
  patternValue: z.unknown(),
  confidence: z.number().min(0).max(1),
  sourceType: z.enum(["rule_based", "llm_detected"]),
  evidenceIds: z.array(z.string().uuid()).default([]),
  sampleSize: z.number().int().min(0).default(0),
  status: z.enum(PATTERN_CANDIDATE_STATUSES).default("pending"),
  llmReasoning: z.string().nullable().optional(),
});
export type PatternCandidate = z.infer<typeof PatternCandidateSchema>;

export interface FrequencyPattern {
  eventType: string;
  platform: string | null;
  count: number;
  timeWindowDays: number;
  avgImportance: number;
}

export interface CoOccurrencePattern {
  eventA: string;
  eventB: string;
  coOccurrenceCount: number;
  windowHours: number;
  confidence: number;
}

export interface TemporalPattern {
  eventType: string;
  dayOfWeek: number | null;
  hourOfDay: number | null;
  frequency: number;
  description: string;
}

// ---------------------------------------------------------------------------
// Knowledge Graph types
// ---------------------------------------------------------------------------

export const ENTITY_TYPES = [
  "topic",
  "brand",
  "person",
  "procedure",
  "product",
  "audience_segment",
  "competitor",
  "platform_feature",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const RELATIONSHIP_TYPES = [
  "co_occurs_with",
  "influences",
  "correlates_with",
  "competes_with",
  "part_of",
  "used_in",
  "targets",
] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export const KnowledgeEntitySchema = z.object({
  id: z.string().uuid().optional(),
  organizationId: z.string().uuid(),
  entityType: z.enum(ENTITY_TYPES),
  canonicalName: z.string().min(1),
  aliases: z.array(z.string()).default([]),
  properties: z.record(z.unknown()).default({}),
  mentionCount: z.number().int().positive().default(1),
  lastSeenAt: z.string().optional(),
});
export type KnowledgeEntity = z.infer<typeof KnowledgeEntitySchema>;

export const KnowledgeRelationshipSchema = z.object({
  id: z.string().uuid().optional(),
  organizationId: z.string().uuid(),
  sourceEntityId: z.string().uuid(),
  targetEntityId: z.string().uuid(),
  relationshipType: z.enum(RELATIONSHIP_TYPES),
  weight: z.number().positive().default(1),
  coOccurrenceCount: z.number().int().positive().default(1),
});
export type KnowledgeRelationship = z.infer<
  typeof KnowledgeRelationshipSchema
>;

export interface EntityNeighborhood {
  center: KnowledgeEntity;
  related: Array<
    KnowledgeEntity & { relationship: RelationshipType; weight: number }
  >;
}

export interface RelationshipWithNames extends KnowledgeRelationship {
  sourceName: string;
  targetName: string;
}

// ---------------------------------------------------------------------------
// PII Masking types
// ---------------------------------------------------------------------------

export const PII_CATEGORIES = [
  "patient_info",
  "staff_info",
  "contact_info",
  "financial_info",
  "medical_record",
] as const;
export type PIICategory = (typeof PII_CATEGORIES)[number];

export interface PIIPattern {
  category: PIICategory;
  name: string;
  regex: RegExp;
  maskFn: (match: string) => string;
}

export interface PIIMatch {
  category: PIICategory;
  pattern: string;
  start: number;
  end: number;
  masked: string;
}

export interface PIIMaskResult {
  maskedText: string;
  matches: PIIMatch[];
  hasPII: boolean;
}

// ---------------------------------------------------------------------------
// Consolidation Audit types
// ---------------------------------------------------------------------------

export const AUDIT_ACTION_TYPES = [
  "episodic_promoted",
  "pattern_merged",
  "pattern_invalidated",
  "conflict_resolved",
  "entity_extracted",
  "entity_linked",
] as const;
export type AuditActionType = (typeof AUDIT_ACTION_TYPES)[number];

export interface AuditEntry {
  organizationId: string;
  actionType: AuditActionType;
  sourceIds: string[];
  targetId?: string;
  details: Record<string, unknown>;
  confidence?: number;
  actor: "system" | "llm" | "user" | "cron";
  createdAt?: string;
}

export interface ConsolidationStats {
  patternsDetected: number;
  patternsPromoted: number;
  patternsMerged: number;
  patternsRejected: number;
  conflictsResolved: number;
  entitiesExtracted: number;
  entitiesLinked: number;
  auditEntriesCreated: number;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Error types (exhaustive, no string matching)
// ---------------------------------------------------------------------------

export type CognitiveError =
  | { code: "NOT_AUTHORIZED"; message: string }
  | { code: "RPC_FAILED"; message: string; cause?: unknown }
  | { code: "VALIDATION_FAILED"; message: string; issues?: z.ZodIssue[] }
  | { code: "LLM_TIMEOUT"; message: string; timeoutMs: number }
  | { code: "LLM_ERROR"; message: string; status?: number }
  | { code: "LLM_INVALID_RESPONSE"; message: string }
  | { code: "MEMBERSHIP_CHECK_FAILED"; message: string }
  | { code: "INPUT_INVALID"; message: string; issues?: z.ZodIssue[] }
  | { code: "PATTERN_DETECTION_FAILED"; message: string; cause?: unknown }
  | { code: "CONSOLIDATION_FAILED"; message: string; cause?: unknown }
  | { code: "ENTITY_EXTRACTION_FAILED"; message: string; cause?: unknown }
  | { code: "BUDGET_EXCEEDED"; message: string };
