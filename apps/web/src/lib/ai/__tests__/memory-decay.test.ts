import { describe, it, expect } from "vitest";
import {
  calculateDecayWeight,
  calculateCompositeScore,
  resolveDecayConfig,
  halfLifeToDecayRate,
  decayRateToHalfLife,
  estimateMemoryLifespan,
  daysSince,
  EVENT_HALF_LIVES,
} from "../memory-decay";

// ---------------------------------------------------------------------------
// calculateDecayWeight
// ---------------------------------------------------------------------------

describe("calculateDecayWeight", () => {
  it("returns strength * importance at t=0", () => {
    const w = calculateDecayWeight({
      strength: 0.8,
      importance: 0.7,
      halfLifeDays: 30,
      daysSinceCreated: 0,
    });
    expect(w).toBeCloseTo(0.56, 4);
  });

  it("returns half the initial weight at t=halfLife", () => {
    const w = calculateDecayWeight({
      strength: 1.0,
      importance: 1.0,
      halfLifeDays: 30,
      daysSinceCreated: 30,
    });
    expect(w).toBeCloseTo(0.5, 4);
  });

  it("returns quarter at t=2*halfLife", () => {
    const w = calculateDecayWeight({
      strength: 1.0,
      importance: 1.0,
      halfLifeDays: 30,
      daysSinceCreated: 60,
    });
    expect(w).toBeCloseTo(0.25, 4);
  });

  it("returns 0 for strength=0", () => {
    expect(
      calculateDecayWeight({
        strength: 0,
        importance: 0.5,
        halfLifeDays: 30,
        daysSinceCreated: 5,
      })
    ).toBe(0);
  });

  it("returns 0 for importance=0", () => {
    expect(
      calculateDecayWeight({
        strength: 0.5,
        importance: 0,
        halfLifeDays: 30,
        daysSinceCreated: 5,
      })
    ).toBe(0);
  });

  it("returns 0 for halfLifeDays=0", () => {
    expect(
      calculateDecayWeight({
        strength: 0.5,
        importance: 0.5,
        halfLifeDays: 0,
        daysSinceCreated: 5,
      })
    ).toBe(0);
  });

  it("handles negative daysSinceCreated as 0", () => {
    const w = calculateDecayWeight({
      strength: 0.8,
      importance: 0.6,
      halfLifeDays: 30,
      daysSinceCreated: -5,
    });
    expect(w).toBeCloseTo(0.48, 4);
  });
});

// ---------------------------------------------------------------------------
// calculateCompositeScore
// ---------------------------------------------------------------------------

describe("calculateCompositeScore", () => {
  it("includes similarity multiplier", () => {
    const score = calculateCompositeScore({
      similarity: 0.5,
      strength: 1.0,
      importance: 1.0,
      halfLifeDays: 30,
      daysSinceCreated: 0,
    });
    expect(score).toBeCloseTo(0.5, 4);
  });

  it("defaults similarity to 1.0", () => {
    const score = calculateCompositeScore({
      strength: 1.0,
      importance: 1.0,
      halfLifeDays: 30,
      daysSinceCreated: 0,
    });
    expect(score).toBeCloseTo(1.0, 4);
  });

  it("includes recency bias multiplier", () => {
    const score = calculateCompositeScore({
      strength: 1.0,
      importance: 1.0,
      halfLifeDays: 30,
      daysSinceCreated: 0,
      recencyBiasMultiplier: 2.0,
    });
    expect(score).toBeCloseTo(2.0, 4);
  });
});

// ---------------------------------------------------------------------------
// resolveDecayConfig
// ---------------------------------------------------------------------------

describe("resolveDecayConfig", () => {
  it("uses event-type-specific half-life", () => {
    const config = resolveDecayConfig("viral_moment");
    expect(config.halfLifeDays).toBe(60);
  });

  it("falls back to 30 for unknown event types", () => {
    const config = resolveDecayConfig("unknown_event");
    expect(config.halfLifeDays).toBe(30);
  });

  it("respects overrides", () => {
    const config = resolveDecayConfig("post_success", {
      halfLifeDays: 90,
      minStrength: 0.1,
    });
    expect(config.halfLifeDays).toBe(90);
    expect(config.minStrength).toBe(0.1);
  });
});

// ---------------------------------------------------------------------------
// halfLifeToDecayRate / decayRateToHalfLife (round-trip)
// ---------------------------------------------------------------------------

describe("half-life ↔ decay rate conversion", () => {
  it("round-trips correctly", () => {
    const halfLife = 30;
    const rate = halfLifeToDecayRate(halfLife);
    const backToHalfLife = decayRateToHalfLife(rate);
    expect(backToHalfLife).toBeCloseTo(halfLife, 8);
  });

  it("halfLifeToDecayRate returns 1 for 0", () => {
    expect(halfLifeToDecayRate(0)).toBe(1);
  });

  it("decayRateToHalfLife returns Infinity for 0", () => {
    expect(decayRateToHalfLife(0)).toBe(Infinity);
  });
});

// ---------------------------------------------------------------------------
// estimateMemoryLifespan
// ---------------------------------------------------------------------------

describe("estimateMemoryLifespan", () => {
  it("estimates correct lifespan", () => {
    const days = estimateMemoryLifespan({
      strength: 1.0,
      importance: 1.0,
      halfLifeDays: 30,
      minThreshold: 0.05,
    });
    // 0.05 = exp(-ln2/30 * t) → t = -30 * ln(0.05) / ln2 ≈ 129.66
    expect(days).toBeCloseTo(129.66, 0);
  });

  it("returns 0 for initial weight below threshold", () => {
    expect(
      estimateMemoryLifespan({
        strength: 0.01,
        importance: 0.01,
        halfLifeDays: 30,
        minThreshold: 0.05,
      })
    ).toBe(0);
  });

  it("returns 0 for zero strength", () => {
    expect(
      estimateMemoryLifespan({
        strength: 0,
        importance: 1.0,
        halfLifeDays: 30,
      })
    ).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// daysSince
// ---------------------------------------------------------------------------

describe("daysSince", () => {
  it("computes correct days", () => {
    const now = Date.now();
    const twoDaysAgo = new Date(now - 2 * 86_400_000).toISOString();
    const days = daysSince(twoDaysAgo, now);
    expect(days).toBeCloseTo(2, 1);
  });

  it("returns 0 for invalid date", () => {
    expect(daysSince("not-a-date")).toBe(0);
  });

  it("returns 0 for future date", () => {
    const now = Date.now();
    const future = new Date(now + 86_400_000).toISOString();
    expect(daysSince(future, now)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// EVENT_HALF_LIVES
// ---------------------------------------------------------------------------

describe("EVENT_HALF_LIVES", () => {
  it("has all expected event types", () => {
    expect(EVENT_HALF_LIVES.post_success).toBe(30);
    expect(EVENT_HALF_LIVES.viral_moment).toBe(60);
    expect(EVENT_HALF_LIVES.budget_exhausted).toBe(7);
    expect(EVENT_HALF_LIVES.trend_detected).toBe(14);
  });
});
