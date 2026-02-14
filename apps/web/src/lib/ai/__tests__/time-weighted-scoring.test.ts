import { describe, it, expect } from "vitest";
import {
  recencyBias,
  scoreEpisodicEntry,
  scoreSemanticEntry,
  scoreProceduralEntry,
  crossLayerScore,
  rankMemories,
  DEFAULT_LAYER_WEIGHTS,
} from "../time-weighted-scoring";
import type { EpisodicEntryV2, SemanticEntry, ProceduralEntry } from "../types";

// ---------------------------------------------------------------------------
// recencyBias
// ---------------------------------------------------------------------------

describe("recencyBias", () => {
  it("returns 2.0 for < 1 day old", () => {
    const now = Date.now();
    const recent = new Date(now - 3_600_000).toISOString(); // 1 hour ago
    expect(recencyBias(recent, now)).toBe(2.0);
  });

  it("returns 1.5 for 1-3 days old", () => {
    const now = Date.now();
    const twoDay = new Date(now - 2 * 86_400_000).toISOString();
    expect(recencyBias(twoDay, now)).toBe(1.5);
  });

  it("returns 1.2 for 3-7 days old", () => {
    const now = Date.now();
    const fiveDay = new Date(now - 5 * 86_400_000).toISOString();
    expect(recencyBias(fiveDay, now)).toBe(1.2);
  });

  it("returns 1.1 for 7-14 days old", () => {
    const now = Date.now();
    const tenDay = new Date(now - 10 * 86_400_000).toISOString();
    expect(recencyBias(tenDay, now)).toBe(1.1);
  });

  it("returns 1.0 for > 14 days old", () => {
    const now = Date.now();
    const old = new Date(now - 30 * 86_400_000).toISOString();
    expect(recencyBias(old, now)).toBe(1.0);
  });
});

// ---------------------------------------------------------------------------
// scoreEpisodicEntry
// ---------------------------------------------------------------------------

describe("scoreEpisodicEntry", () => {
  it("uses composite_score if pre-computed", () => {
    const entry: EpisodicEntryV2 = {
      summary: "test",
      event_type: "post_success",
      composite_score: 0.75,
    };
    expect(scoreEpisodicEntry(entry)).toBe(0.75);
  });

  it("computes from fields when no composite_score", () => {
    const now = Date.now();
    const entry: EpisodicEntryV2 = {
      summary: "test",
      event_type: "post_success",
      strength: 0.8,
      importance: 0.7,
      half_life_days: 30,
      created_at: new Date(now).toISOString(),
    };
    const score = scoreEpisodicEntry(entry, now);
    // At t=0: 0.8 * 0.7 * 1.0 * 2.0 (recency) = 1.12
    expect(score).toBeCloseTo(1.12, 1);
  });

  it("uses defaults for missing fields", () => {
    const entry: EpisodicEntryV2 = {
      summary: "test",
      event_type: "post_success",
    };
    const score = scoreEpisodicEntry(entry);
    expect(score).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// scoreSemanticEntry
// ---------------------------------------------------------------------------

describe("scoreSemanticEntry", () => {
  it("uses Bayesian confidence with small samples", () => {
    const entry: SemanticEntry = {
      pattern_type: "topic",
      pattern_key: "test",
      pattern_value: {},
      confidence: 1.0,
      sample_size: 1,
    };
    const score = scoreSemanticEntry(entry);
    // (0.5*3 + 1.0*1) / (3+1) = 2.5/4 = 0.625
    // With no recency: 0.625 * 1.0 = 0.625
    expect(score).toBeCloseTo(0.625, 2);
  });

  it("converges to actual confidence with large samples", () => {
    const entry: SemanticEntry = {
      pattern_type: "topic",
      pattern_key: "test",
      pattern_value: {},
      confidence: 0.9,
      sample_size: 100,
    };
    const score = scoreSemanticEntry(entry);
    // (0.5*3 + 0.9*100) / (3+100) = 91.5/103 ≈ 0.8883
    expect(score).toBeCloseTo(0.888, 1);
  });

  it("applies recency for recent updates", () => {
    const now = Date.now();
    const entry: SemanticEntry = {
      pattern_type: "topic",
      pattern_key: "test",
      pattern_value: {},
      confidence: 0.8,
      sample_size: 10,
      updated_at: new Date(now - 3_600_000).toISOString(), // 1 hour ago
    };
    const score = scoreSemanticEntry(entry, now);
    // effectiveConfidence * 2.0 (recency)
    expect(score).toBeGreaterThan(1.0);
  });
});

// ---------------------------------------------------------------------------
// scoreProceduralEntry
// ---------------------------------------------------------------------------

describe("scoreProceduralEntry", () => {
  it("uses effectiveness for new strategies", () => {
    const entry: ProceduralEntry = {
      name: "test",
      strategy_type: "content_recipe",
      effectiveness: 0.8,
      times_applied: 0,
      times_succeeded: 0,
    };
    const score = scoreProceduralEntry(entry);
    // dataWeight=0, so score = effectiveness = 0.8
    expect(score).toBeCloseTo(0.8, 2);
  });

  it("blends with success rate for experienced strategies", () => {
    const entry: ProceduralEntry = {
      name: "test",
      strategy_type: "content_recipe",
      effectiveness: 0.5,
      times_applied: 10,
      times_succeeded: 8,
    };
    const score = scoreProceduralEntry(entry);
    // dataWeight = min(1, 10/10) = 1.0
    // successRate = (8+1)/(10+2) = 0.75
    // score = 0 * 0.5 + 1.0 * 0.75 = 0.75
    expect(score).toBeCloseTo(0.75, 2);
  });

  it("applies Laplace smoothing", () => {
    const entry: ProceduralEntry = {
      name: "test",
      strategy_type: "content_recipe",
      times_applied: 1,
      times_succeeded: 1,
    };
    const score = scoreProceduralEntry(entry);
    // successRate = (1+1)/(1+2) = 0.667
    // dataWeight = 0.1
    // score = 0.9 * 0.5 + 0.1 * 0.667 ≈ 0.517
    expect(score).toBeGreaterThan(0.5);
    expect(score).toBeLessThan(0.7);
  });
});

// ---------------------------------------------------------------------------
// crossLayerScore
// ---------------------------------------------------------------------------

describe("crossLayerScore", () => {
  it("returns 0 when all inputs are empty", () => {
    const score = crossLayerScore({
      episodicScores: [],
      semanticScore: null,
      proceduralScore: null,
    });
    expect(score).toBe(0);
  });

  it("normalizes to available layers", () => {
    const score = crossLayerScore({
      episodicScores: [0.8],
      semanticScore: null,
      proceduralScore: null,
    });
    // Only episodic available, normalized to 1.0 weight → avg = 0.8
    expect(score).toBeCloseTo(0.8, 4);
  });

  it("weights correctly across all layers", () => {
    const score = crossLayerScore({
      episodicScores: [1.0],
      semanticScore: 1.0,
      proceduralScore: 1.0,
    });
    // All inputs 1.0 → weighted average = 1.0
    expect(score).toBeCloseTo(1.0, 2);
  });

  it("averages multiple episodic scores", () => {
    const score = crossLayerScore({
      episodicScores: [0.5, 1.0],
      semanticScore: null,
      proceduralScore: null,
    });
    expect(score).toBeCloseTo(0.75, 4);
  });
});

// ---------------------------------------------------------------------------
// rankMemories
// ---------------------------------------------------------------------------

describe("rankMemories", () => {
  it("returns empty arrays for empty input", () => {
    const result = rankMemories({
      episodic: [],
      semantic: [],
      procedural: [],
    });
    expect(result.rankedEpisodic).toHaveLength(0);
    expect(result.rankedSemantic).toHaveLength(0);
    expect(result.rankedProcedural).toHaveLength(0);
  });

  it("ranks and slices to topK", () => {
    const episodic: EpisodicEntryV2[] = Array.from({ length: 20 }, (_, i) => ({
      summary: `event ${i}`,
      event_type: "post_success",
      composite_score: i / 20,
    }));

    const result = rankMemories({
      episodic,
      semantic: [],
      procedural: [],
      topK: 5,
    });

    // Should return topK proportional to episodic weight
    expect(result.rankedEpisodic.length).toBeLessThanOrEqual(10);
    expect(result.rankedEpisodic.length).toBeGreaterThan(0);
    // Highest score first
    expect(result.rankedEpisodic[0].score).toBeGreaterThanOrEqual(
      result.rankedEpisodic[result.rankedEpisodic.length - 1].score
    );
  });

  it("distributes across layers proportionally", () => {
    const result = rankMemories({
      episodic: Array.from({ length: 20 }, (_, i) => ({
        summary: `e${i}`,
        event_type: "post_success",
        composite_score: 0.5,
      })),
      semantic: Array.from({ length: 20 }, (_, i) => ({
        pattern_type: "topic",
        pattern_key: `s${i}`,
        pattern_value: {},
        confidence: 0.5,
        sample_size: 5,
      })),
      procedural: Array.from({ length: 20 }, (_, i) => ({
        name: `p${i}`,
        strategy_type: "content_recipe",
        effectiveness: 0.5,
      })),
      topK: 15,
    });

    // All three layers should have entries
    expect(result.rankedEpisodic.length).toBeGreaterThan(0);
    expect(result.rankedSemantic.length).toBeGreaterThan(0);
    expect(result.rankedProcedural.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// DEFAULT_LAYER_WEIGHTS
// ---------------------------------------------------------------------------

describe("DEFAULT_LAYER_WEIGHTS", () => {
  it("sums to 1.0", () => {
    const sum =
      DEFAULT_LAYER_WEIGHTS.episodic +
      DEFAULT_LAYER_WEIGHTS.semantic +
      DEFAULT_LAYER_WEIGHTS.procedural +
      DEFAULT_LAYER_WEIGHTS.working;
    expect(sum).toBeCloseTo(1.0);
  });
});
