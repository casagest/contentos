// ============================================================================
// src/lib/ai/knowledge-graph.ts
// Knowledge Graph — Entity Extraction & Relationship Management
//
// Responsibilities:
//   - Rule-based entity extraction (dental/medical, brands, procedures)
//   - LLM-based entity extraction (through governor budget)
//   - Entity dedup & upsert (canonical names + aliases)
//   - Relationship tracking (co-occurrence, weighted edges)
//   - Neighborhood queries (PostgreSQL adjacency list, capped traversal)
//   - Text fragment builder for LLM prompt injection
//
// Design:
//   - PostgreSQL adjacency list (no Neo4j)
//   - Entities stored in knowledge_entities, relationships in knowledge_relationships
//   - Recursive CTEs capped at 3 hops for neighborhood queries
//   - LLM calls gated by decidePaidAIAccess()
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Result,
  CognitiveError,
  EntityType,
  RelationshipType,
  KnowledgeEntity,
  KnowledgeRelationship,
  EntityNeighborhood,
  RelationshipWithNames,
} from "./types";
import { Ok, Err } from "./types";
import { callLLM, type LLMTrackingContext } from "./llm-client";
import {
  decidePaidAIAccess,
  estimateTokensFromText,
  estimateAnthropicCostUsd,
  logAIUsageEvent,
} from "./governor";
import { appendAuditEntry } from "./memory-consolidation";

// ---------------------------------------------------------------------------
// Types for extraction results (internal, not exported from types.ts)
// ---------------------------------------------------------------------------

export interface ExtractedEntity {
  entityType: EntityType;
  canonicalName: string;
  aliases: string[];
  properties: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const LLM_ENTITY_MODEL = "gpt-4o-mini" as const;
const LLM_ENTITY_MAX_COST_USD = 0.01;

// ---------------------------------------------------------------------------
// Rule-Based Entity Extraction
// Extracts dental/medical terms, brands, procedures from text summaries
// ---------------------------------------------------------------------------

// Pre-compiled patterns for domain-specific entity extraction
const ENTITY_PATTERNS: Array<{
  type: EntityType;
  regex: RegExp;
  normalize?: (match: string) => string;
}> = [
  // Dental/medical procedures
  {
    type: "procedure",
    regex:
      /\b(?:implant(?:uri|ologie)?|ortodon[tț]ie|endodon[tț]ie|parodontologie|profilaxie|albire|detartraj|obtura[tț]ie|extrac[tț]ie|protez[aă]|coroana|fa[tț]et[aă]|scaling|root\s*canal|crown|veneer|bridge|denture|whitening|cleaning|filling|extraction|braces|aligners?|invisalign)\b/gi,
    normalize: (m) => m.toLowerCase().trim(),
  },
  // Medical/dental brands
  {
    type: "brand",
    regex:
      /\b(?:Straumann|Nobel\s*Biocare|Dentsply|Ivoclar|3M|Colgate|Oral-B|Sensodyne|Philips\s*Sonicare|Invisalign|ClearCorrect)\b/gi,
  },
  // Social media platform features
  {
    type: "platform_feature",
    regex:
      /\b(?:Reels?|Stories?|Carousel|IGTV|Shorts?|Live|TikTok\s*Shop|Duet|Stitch|Poll|Quiz|Threads?)\b/gi,
  },
  // Audience segments
  {
    type: "audience_segment",
    regex:
      /\b(?:pacien[tț]i\s*(?:noi|existen[tț]i|tineri|v[aâ]rstnici)|new\s*patients?|existing\s*patients?|young\s*adults?|seniors?|parents?|children|teens?|millennials?|gen\s*z)\b/gi,
    normalize: (m) => m.toLowerCase().trim(),
  },
  // Topics (general content themes)
  {
    type: "topic",
    regex:
      /\b(?:preven[tț]ie|igien[aă]\s*oral[aă]|s[aă]n[aă]tate\s*oral[aă]|oral\s*health|prevention|aesthetics?|estetic[aă]|smile\s*design|dental\s*anxiety|fear\s*of\s*dentist|dental\s*tourism)\b/gi,
    normalize: (m) => m.toLowerCase().trim(),
  },
];

export function extractEntitiesRuleBased(
  summaries: string[]
): ExtractedEntity[] {
  const entityMap = new Map<string, ExtractedEntity>();

  for (const summary of summaries) {
    for (const pattern of ENTITY_PATTERNS) {
      pattern.regex.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = pattern.regex.exec(summary)) !== null) {
        const raw = match[0];
        const name = pattern.normalize
          ? pattern.normalize(raw)
          : raw;

        const key = `${pattern.type}::${name.toLowerCase()}`;

        if (!entityMap.has(key)) {
          entityMap.set(key, {
            entityType: pattern.type,
            canonicalName: name,
            aliases: [],
            properties: {},
          });
        }

        // Track original forms as aliases
        const entity = entityMap.get(key)!;
        if (
          raw !== entity.canonicalName &&
          !entity.aliases.includes(raw)
        ) {
          entity.aliases.push(raw);
        }
      }
    }
  }

  return [...entityMap.values()];
}

// ---------------------------------------------------------------------------
// LLM-Based Entity Extraction (budget-gated)
// ---------------------------------------------------------------------------

export async function extractEntitiesLLM(params: {
  supabase: SupabaseClient;
  organizationId: string;
  summaries: string[];
  maxCostUsd?: number;
}): Promise<Result<ExtractedEntity[], CognitiveError>> {
  const { supabase, organizationId, summaries } = params;
  const maxCostUsd = params.maxCostUsd ?? LLM_ENTITY_MAX_COST_USD;

  if (summaries.length === 0) return Ok([]);

  const text = summaries.slice(0, 30).join("\n");
  const inputTokens = estimateTokensFromText(text) + 300;
  const estimatedCost = estimateAnthropicCostUsd(
    LLM_ENTITY_MODEL,
    inputTokens,
    400
  );

  if (estimatedCost > maxCostUsd) {
    return Err({
      code: "BUDGET_EXCEEDED",
      message: `Entity extraction estimated cost $${estimatedCost.toFixed(4)} exceeds max $${maxCostUsd.toFixed(4)}`,
    });
  }

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

  const startMs = Date.now();
  const llmResult = await callLLM({
    model: LLM_ENTITY_MODEL,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: `Extract named entities from social media/dental content summaries.

Output JSON array. Each entity:
{
  "entityType": "topic" | "brand" | "person" | "procedure" | "product" | "audience_segment" | "competitor" | "platform_feature",
  "canonicalName": "lowercase canonical form",
  "aliases": ["original forms seen"],
  "properties": {}
}

Rules:
- Deduplicate: same concept = one entity with aliases
- Be specific: "Instagram Reels" not just "Reels"
- Max 15 entities
- Output ONLY valid JSON array`,
      },
      {
        role: "user",
        content: text,
      },
    ],
    maxTokens: 600,
  }, {
    supabase,
    organizationId,
    userId: "",
    routeKey: "knowledge-graph",
  } as LLMTrackingContext);

  const latencyMs = Date.now() - startMs;

  if (!llmResult.ok) {
    await logAIUsageEvent({
      supabase,
      organizationId,
      routeKey: "entity_extraction_llm",
      provider: "openai",
      model: LLM_ENTITY_MODEL,
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

  await logAIUsageEvent({
    supabase,
    organizationId,
    routeKey: "entity_extraction_llm",
    provider: "openai",
    model: LLM_ENTITY_MODEL,
    mode: "ai",
    inputTokens: llmResult.value.usage.promptTokens,
    outputTokens: llmResult.value.usage.completionTokens,
    estimatedCostUsd: estimateAnthropicCostUsd(
      LLM_ENTITY_MODEL,
      llmResult.value.usage.promptTokens,
      llmResult.value.usage.completionTokens
    ),
    latencyMs,
    success: true,
  });

  return Ok(parseLLMEntities(llmResult.value.content));
}

// ---------------------------------------------------------------------------
// Entity Management: upsert with dedup
// ---------------------------------------------------------------------------

export async function upsertEntity(params: {
  supabase: SupabaseClient;
  organizationId: string;
  entity: ExtractedEntity;
}): Promise<Result<KnowledgeEntity, CognitiveError>> {
  const { supabase, organizationId, entity } = params;

  // Check if entity already exists (by org + type + canonical name)
  const { data: existing } = await supabase
    .from("knowledge_entities")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("entity_type", entity.entityType)
    .eq("canonical_name", entity.canonicalName)
    .maybeSingle();

  if (existing) {
    // Merge aliases and increment mention count
    const mergedAliases = [
      ...new Set([
        ...(existing.aliases ?? []),
        ...entity.aliases,
      ]),
    ];

    const { data: updated, error } = await supabase
      .from("knowledge_entities")
      .update({
        aliases: mergedAliases,
        properties: {
          ...(existing.properties ?? {}),
          ...entity.properties,
        },
        mention_count: (existing.mention_count ?? 1) + 1,
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("organization_id", organizationId)
      .select("*")
      .single();

    if (error || !updated) {
      return Err({
        code: "ENTITY_EXTRACTION_FAILED",
        message: `Entity update failed: ${error?.message ?? "No data returned"}`,
        cause: error,
      });
    }

    return Ok(mapEntityRow(updated));
  }

  // Insert new entity
  const { data: inserted, error: insertErr } = await supabase
    .from("knowledge_entities")
    .insert({
      organization_id: organizationId,
      entity_type: entity.entityType,
      canonical_name: entity.canonicalName,
      aliases: entity.aliases,
      properties: entity.properties,
      mention_count: 1,
      last_seen_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (insertErr || !inserted) {
    return Err({
      code: "ENTITY_EXTRACTION_FAILED",
      message: `Entity insert failed: ${insertErr?.message ?? "No data returned"}`,
      cause: insertErr,
    });
  }

  return Ok(mapEntityRow(inserted));
}

export async function batchUpsertEntities(params: {
  supabase: SupabaseClient;
  organizationId: string;
  entities: ExtractedEntity[];
}): Promise<Result<{ created: number; updated: number }, CognitiveError>> {
  let created = 0;
  let updated = 0;

  for (const entity of params.entities) {
    const result = await upsertEntity({
      supabase: params.supabase,
      organizationId: params.organizationId,
      entity,
    });

    if (result.ok) {
      // If mention_count > 1 it was updated, otherwise created
      if ((result.value.mentionCount ?? 1) > 1) {
        updated++;
      } else {
        created++;
      }
    }
  }

  return Ok({ created, updated });
}

// ---------------------------------------------------------------------------
// Relationship Management
// ---------------------------------------------------------------------------

export async function trackCoOccurrence(params: {
  supabase: SupabaseClient;
  organizationId: string;
  entityIds: string[];
  evidenceId: string;
}): Promise<Result<number, CognitiveError>> {
  const { supabase, organizationId, entityIds } = params;

  if (entityIds.length < 2) return Ok(0);

  let linked = 0;

  // Create pairwise co-occurrence relationships
  for (let i = 0; i < entityIds.length; i++) {
    for (let j = i + 1; j < entityIds.length; j++) {
      const result = await upsertRelationship({
        supabase,
        organizationId,
        sourceEntityId: entityIds[i],
        targetEntityId: entityIds[j],
        relationshipType: "co_occurs_with",
      });

      if (result.ok) linked++;
    }
  }

  // Audit entry
  await appendAuditEntry({
    supabase,
    entry: {
      organizationId,
      actionType: "entity_linked",
      sourceIds: entityIds,
      targetId: params.evidenceId,
      details: { linkedCount: linked },
      actor: "system",
    },
  });

  return Ok(linked);
}

export async function upsertRelationship(params: {
  supabase: SupabaseClient;
  organizationId: string;
  sourceEntityId: string;
  targetEntityId: string;
  relationshipType: RelationshipType;
  weight?: number;
}): Promise<Result<KnowledgeRelationship, CognitiveError>> {
  const { supabase, organizationId, sourceEntityId, targetEntityId } = params;

  // Check for existing relationship
  const { data: existing } = await supabase
    .from("knowledge_relationships")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("source_entity_id", sourceEntityId)
    .eq("target_entity_id", targetEntityId)
    .eq("relationship_type", params.relationshipType)
    .maybeSingle();

  if (existing) {
    // Increment co-occurrence count + update weight
    const newCount = (existing.co_occurrence_count ?? 1) + 1;
    const newWeight = params.weight ?? Math.min(10, Math.log2(newCount + 1));

    const { data: updated, error } = await supabase
      .from("knowledge_relationships")
      .update({
        co_occurrence_count: newCount,
        weight: Math.round(newWeight * 10000) / 10000,
      })
      .eq("id", existing.id)
      .eq("organization_id", organizationId)
      .select("*")
      .single();

    if (error || !updated) {
      return Err({
        code: "ENTITY_EXTRACTION_FAILED",
        message: `Relationship update failed: ${error?.message ?? "No data"}`,
        cause: error,
      });
    }

    return Ok(mapRelationshipRow(updated));
  }

  // Insert new relationship
  const { data: inserted, error: insertErr } = await supabase
    .from("knowledge_relationships")
    .insert({
      organization_id: organizationId,
      source_entity_id: sourceEntityId,
      target_entity_id: targetEntityId,
      relationship_type: params.relationshipType,
      weight: params.weight ?? 1,
      co_occurrence_count: 1,
    })
    .select("*")
    .single();

  if (insertErr || !inserted) {
    return Err({
      code: "ENTITY_EXTRACTION_FAILED",
      message: `Relationship insert failed: ${insertErr?.message ?? "No data"}`,
      cause: insertErr,
    });
  }

  return Ok(mapRelationshipRow(inserted));
}

// ---------------------------------------------------------------------------
// Queries: neighborhood, top entities, strongest relationships
// ---------------------------------------------------------------------------

export async function getEntityNeighborhood(params: {
  supabase: SupabaseClient;
  organizationId: string;
  entityId: string;
  maxHops?: number;
  minWeight?: number;
}): Promise<Result<EntityNeighborhood, CognitiveError>> {
  const { supabase, organizationId, entityId } = params;
  const minWeight = params.minWeight ?? 0;

  // Fetch center entity
  const { data: center, error: centerErr } = await supabase
    .from("knowledge_entities")
    .select("*")
    .eq("id", entityId)
    .eq("organization_id", organizationId)
    .single();

  if (centerErr || !center) {
    return Err({
      code: "ENTITY_EXTRACTION_FAILED",
      message: `Entity ${entityId} not found`,
    });
  }

  // Fetch direct relationships (1-hop, both directions)
  const { data: rels, error: relErr } = await supabase
    .from("knowledge_relationships")
    .select(`
      relationship_type,
      weight,
      source_entity_id,
      target_entity_id
    `)
    .eq("organization_id", organizationId)
    .or(`source_entity_id.eq.${entityId},target_entity_id.eq.${entityId}`)
    .gte("weight", minWeight)
    .order("weight", { ascending: false })
    .limit(50);

  if (relErr) {
    return Err({
      code: "ENTITY_EXTRACTION_FAILED",
      message: `Neighborhood query failed: ${relErr.message}`,
      cause: relErr,
    });
  }

  if (!rels || rels.length === 0) {
    return Ok({
      center: mapEntityRow(center),
      related: [],
    });
  }

  // Collect neighbor entity IDs
  const neighborIds = new Set<string>();
  const relMap = new Map<
    string,
    { relationship: RelationshipType; weight: number }
  >();

  for (const rel of rels) {
    const neighborId =
      rel.source_entity_id === entityId
        ? rel.target_entity_id
        : rel.source_entity_id;
    neighborIds.add(neighborId);
    relMap.set(neighborId, {
      relationship: rel.relationship_type as RelationshipType,
      weight: rel.weight ?? 1,
    });
  }

  // Fetch neighbor entities
  const { data: neighbors, error: neighborErr } = await supabase
    .from("knowledge_entities")
    .select("*")
    .eq("organization_id", organizationId)
    .in("id", [...neighborIds]);

  if (neighborErr) {
    return Err({
      code: "ENTITY_EXTRACTION_FAILED",
      message: `Neighbor fetch failed: ${neighborErr.message}`,
      cause: neighborErr,
    });
  }

  const related = (neighbors ?? []).map((n) => {
    const relInfo = relMap.get(n.id) ?? {
      relationship: "co_occurs_with" as RelationshipType,
      weight: 1,
    };
    return {
      ...mapEntityRow(n),
      relationship: relInfo.relationship,
      weight: relInfo.weight,
    };
  });

  // Sort by weight descending
  related.sort((a, b) => b.weight - a.weight);

  return Ok({
    center: mapEntityRow(center),
    related,
  });
}

export async function getTopEntities(params: {
  supabase: SupabaseClient;
  organizationId: string;
  entityType?: EntityType;
  limit?: number;
}): Promise<Result<KnowledgeEntity[], CognitiveError>> {
  const { supabase, organizationId } = params;
  const limit = params.limit ?? 20;

  let query = supabase
    .from("knowledge_entities")
    .select("*")
    .eq("organization_id", organizationId)
    .order("mention_count", { ascending: false })
    .limit(limit);

  if (params.entityType) {
    query = query.eq("entity_type", params.entityType);
  }

  const { data, error } = await query;

  if (error) {
    return Err({
      code: "ENTITY_EXTRACTION_FAILED",
      message: `Top entities query failed: ${error.message}`,
      cause: error,
    });
  }

  return Ok((data ?? []).map(mapEntityRow));
}

export async function getStrongestRelationships(params: {
  supabase: SupabaseClient;
  organizationId: string;
  limit?: number;
}): Promise<Result<RelationshipWithNames[], CognitiveError>> {
  const { supabase, organizationId } = params;
  const limit = params.limit ?? 20;

  // Fetch strongest relationships with entity names via join
  const { data, error } = await supabase
    .from("knowledge_relationships")
    .select(`
      *,
      source:knowledge_entities!knowledge_relationships_source_entity_id_fkey(canonical_name),
      target:knowledge_entities!knowledge_relationships_target_entity_id_fkey(canonical_name)
    `)
    .eq("organization_id", organizationId)
    .order("weight", { ascending: false })
    .limit(limit);

  if (error) {
    return Err({
      code: "ENTITY_EXTRACTION_FAILED",
      message: `Strongest relationships query failed: ${error.message}`,
      cause: error,
    });
  }

  const results: RelationshipWithNames[] = (data ?? []).map((row) => ({
    ...mapRelationshipRow(row),
    sourceName: (row.source as Record<string, string>)?.canonical_name ?? "unknown",
    targetName: (row.target as Record<string, string>)?.canonical_name ?? "unknown",
  }));

  return Ok(results);
}

// ---------------------------------------------------------------------------
// Build text summary for prompt injection
// ---------------------------------------------------------------------------

export function buildKnowledgeGraphFragment(params: {
  entities: KnowledgeEntity[];
  relationships: RelationshipWithNames[];
  maxTokens?: number;
}): string {
  const maxTokens = params.maxTokens ?? 300;
  const lines: string[] = [];

  if (params.entities.length > 0) {
    lines.push("<knowledge_graph>");
    lines.push("Key concepts:");

    for (const entity of params.entities.slice(0, 15)) {
      const aliases =
        entity.aliases.length > 0
          ? ` (also: ${entity.aliases.slice(0, 3).join(", ")})`
          : "";
      lines.push(
        `  - [${entity.entityType}] ${entity.canonicalName}${aliases} (mentions: ${entity.mentionCount})`
      );
    }
  }

  if (params.relationships.length > 0) {
    lines.push("Connections:");

    for (const rel of params.relationships.slice(0, 10)) {
      lines.push(
        `  - ${rel.sourceName} --[${rel.relationshipType}]--> ${rel.targetName} (weight: ${rel.weight})`
      );
    }
  }

  if (lines.length > 0) {
    lines.push("</knowledge_graph>");
  }

  // Rough token estimate and truncation
  const text = lines.join("\n");
  const estimatedTokens = Math.ceil(text.length / 4);
  if (estimatedTokens > maxTokens) {
    // Truncate to fit
    const maxChars = maxTokens * 4;
    return text.slice(0, maxChars) + "\n</knowledge_graph>";
  }

  return text;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function mapEntityRow(row: Record<string, unknown>): KnowledgeEntity {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    entityType: row.entity_type as EntityType,
    canonicalName: row.canonical_name as string,
    aliases: (row.aliases as string[]) ?? [],
    properties: (row.properties as Record<string, unknown>) ?? {},
    mentionCount: (row.mention_count as number) ?? 1,
    lastSeenAt: row.last_seen_at as string | undefined,
  };
}

function mapRelationshipRow(
  row: Record<string, unknown>
): KnowledgeRelationship {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    sourceEntityId: row.source_entity_id as string,
    targetEntityId: row.target_entity_id as string,
    relationshipType: row.relationship_type as RelationshipType,
    weight: (row.weight as number) ?? 1,
    coOccurrenceCount: (row.co_occurrence_count as number) ?? 1,
  };
}

function parseLLMEntities(content: string): ExtractedEntity[] {
  try {
    let jsonStr = content.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return [];

    const entities: ExtractedEntity[] = [];
    const validTypes = new Set([
      "topic",
      "brand",
      "person",
      "procedure",
      "product",
      "audience_segment",
      "competitor",
      "platform_feature",
    ]);

    for (const item of parsed) {
      if (
        typeof item.entityType === "string" &&
        validTypes.has(item.entityType) &&
        typeof item.canonicalName === "string"
      ) {
        entities.push({
          entityType: item.entityType as EntityType,
          canonicalName: item.canonicalName,
          aliases: Array.isArray(item.aliases) ? item.aliases : [],
          properties: item.properties ?? {},
        });
      }
    }

    return entities.slice(0, 15);
  } catch {
    return [];
  }
}
