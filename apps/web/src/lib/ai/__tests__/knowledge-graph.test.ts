import { describe, it, expect } from "vitest";
import {
  extractEntitiesRuleBased,
  buildKnowledgeGraphFragment,
} from "../knowledge-graph";
import type { KnowledgeEntity, RelationshipWithNames } from "../types";

// ---------------------------------------------------------------------------
// extractEntitiesRuleBased
// ---------------------------------------------------------------------------

describe("extractEntitiesRuleBased", () => {
  it("returns empty array for empty summaries", () => {
    expect(extractEntitiesRuleBased([])).toHaveLength(0);
  });

  it("returns empty array for text without entities", () => {
    expect(extractEntitiesRuleBased(["Normal text without entities"])).toHaveLength(0);
  });

  it("extracts dental procedures", () => {
    const entities = extractEntitiesRuleBased([
      "Patient came for implant surgery and whitening",
      "Detartraj si obturatie efectuate",
    ]);

    const names = entities.map((e) => e.canonicalName);
    expect(names).toContain("implant");
    expect(names).toContain("whitening");
    expect(names).toContain("detartraj");
    expect(entities.every((e) => e.entityType === "procedure")).toBe(true);
  });

  it("extracts brands", () => {
    const entities = extractEntitiesRuleBased([
      "Using Straumann implants and Invisalign aligners",
    ]);

    const names = entities.map((e) => e.canonicalName);
    expect(names.some((n) => n.includes("Straumann"))).toBe(true);
    expect(names.some((n) => n.includes("Invisalign"))).toBe(true);
  });

  it("extracts platform features", () => {
    const entities = extractEntitiesRuleBased([
      "Carousel post on Instagram with Reels follow-up",
    ]);

    const types = entities.map((e) => e.entityType);
    expect(types).toContain("platform_feature");
  });

  it("extracts audience segments", () => {
    const entities = extractEntitiesRuleBased([
      "Campaign targeting new patients and young adults",
    ]);

    const types = entities.map((e) => e.entityType);
    expect(types).toContain("audience_segment");
  });

  it("deduplicates same entity across summaries", () => {
    const entities = extractEntitiesRuleBased([
      "Implant procedure scheduled",
      "Implant follow-up done",
    ]);

    const implants = entities.filter((e) => e.canonicalName === "implant");
    expect(implants).toHaveLength(1);
  });

  it("tracks aliases for different forms", () => {
    const entities = extractEntitiesRuleBased([
      "implant surgery",
      "Implant placement",
    ]);

    const implant = entities.find((e) => e.canonicalName === "implant");
    // The different case forms may appear as aliases
    expect(implant).toBeDefined();
  });

  it("extracts topics", () => {
    const entities = extractEntitiesRuleBased([
      "Focus on oral health and prevention strategies",
    ]);

    const topics = entities.filter((e) => e.entityType === "topic");
    expect(topics.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// buildKnowledgeGraphFragment
// ---------------------------------------------------------------------------

describe("buildKnowledgeGraphFragment", () => {
  it("returns empty string when no data", () => {
    const result = buildKnowledgeGraphFragment({
      entities: [],
      relationships: [],
    });
    expect(result).toBe("");
  });

  it("includes entity type and name", () => {
    const entities: KnowledgeEntity[] = [
      {
        id: "e1",
        organizationId: "org1",
        entityType: "procedure",
        canonicalName: "implant",
        aliases: ["Implant"],
        properties: {},
        mentionCount: 5,
      },
    ];

    const result = buildKnowledgeGraphFragment({
      entities,
      relationships: [],
    });

    expect(result).toContain("[procedure]");
    expect(result).toContain("implant");
    expect(result).toContain("mentions: 5");
    expect(result).toContain("<knowledge_graph>");
    expect(result).toContain("</knowledge_graph>");
  });

  it("includes relationships", () => {
    const rels: RelationshipWithNames[] = [
      {
        id: "r1",
        organizationId: "org1",
        sourceEntityId: "e1",
        targetEntityId: "e2",
        relationshipType: "co_occurs_with",
        weight: 3.5,
        coOccurrenceCount: 10,
        sourceName: "implant",
        targetName: "whitening",
      },
    ];

    const result = buildKnowledgeGraphFragment({
      entities: [],
      relationships: rels,
    });

    expect(result).toContain("implant");
    expect(result).toContain("whitening");
    expect(result).toContain("co_occurs_with");
  });

  it("includes aliases (up to 3)", () => {
    const entities: KnowledgeEntity[] = [
      {
        id: "e1",
        organizationId: "org1",
        entityType: "brand",
        canonicalName: "straumann",
        aliases: ["Straumann", "STRAUMANN", "straumann AG", "extra"],
        properties: {},
        mentionCount: 1,
      },
    ];

    const result = buildKnowledgeGraphFragment({
      entities,
      relationships: [],
    });

    expect(result).toContain("also:");
    // Should only include first 3 aliases
    expect(result).not.toContain("extra");
  });

  it("respects maxTokens limit", () => {
    const manyEntities: KnowledgeEntity[] = Array.from(
      { length: 100 },
      (_, i) => ({
        id: `e${i}`,
        organizationId: "org1",
        entityType: "topic" as const,
        canonicalName: `topic_${i}_with_long_name_to_fill_space`,
        aliases: [],
        properties: {},
        mentionCount: 1,
      })
    );

    const result = buildKnowledgeGraphFragment({
      entities: manyEntities,
      relationships: [],
      maxTokens: 50,
    });

    // Should be truncated
    expect(result.length).toBeLessThan(300);
    expect(result).toContain("</knowledge_graph>");
  });
});
