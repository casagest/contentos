import { describe, it, expect } from "vitest";
import { sm2Next } from "../spaced-repetition";
import type { SM2State, SM2Quality } from "../types";

// ---------------------------------------------------------------------------
// SM2 Algorithm — Pure function tests
// ---------------------------------------------------------------------------

const defaultState: SM2State = {
  easeFactor: 2.5,
  interval: 1,
  strength: 0.5,
  recallCount: 0,
};

describe("sm2Next", () => {
  it("first review with quality 5 → interval=1, strength increases", () => {
    const next = sm2Next(defaultState, 5);
    expect(next.interval).toBe(1);
    expect(next.recallCount).toBe(1);
    expect(next.strength).toBeGreaterThan(defaultState.strength);
    expect(next.easeFactor).toBeGreaterThanOrEqual(2.5);
  });

  it("second review with quality 5 → interval=6", () => {
    const after1 = sm2Next(defaultState, 5);
    const after2 = sm2Next(after1, 5);
    expect(after2.interval).toBe(6);
    expect(after2.recallCount).toBe(2);
  });

  it("third review multiplies by ease factor", () => {
    const s1 = sm2Next(defaultState, 4);
    const s2 = sm2Next(s1, 4);
    const s3 = sm2Next(s2, 4);
    // interval = round(6 * EF)
    expect(s3.interval).toBeGreaterThan(6);
    expect(s3.recallCount).toBe(3);
  });

  it("quality 0 resets interval to 1 and drops strength", () => {
    const strong = sm2Next(
      { ...defaultState, strength: 0.8, recallCount: 5, interval: 30 },
      0
    );
    expect(strong.interval).toBe(1);
    expect(strong.strength).toBeLessThan(0.8);
    expect(strong.strength).toBeCloseTo(0.56, 1); // 0.8 * 0.7
  });

  it("quality 1 drops strength by 30%", () => {
    const result = sm2Next({ ...defaultState, strength: 1.0 }, 1);
    expect(result.strength).toBeCloseTo(0.7, 2);
  });

  it("quality 2 drops strength by 10%", () => {
    const result = sm2Next({ ...defaultState, strength: 1.0 }, 2);
    expect(result.strength).toBeCloseTo(0.9, 2);
  });

  it("quality 3 increases strength slightly", () => {
    const result = sm2Next({ ...defaultState, strength: 0.5 }, 3);
    expect(result.strength).toBeGreaterThan(0.5);
    expect(result.strength).toBeLessThan(0.6);
  });

  it("quality 4 increases strength more", () => {
    const result = sm2Next({ ...defaultState, strength: 0.5 }, 4);
    expect(result.strength).toBeGreaterThan(0.55);
  });

  it("strength never exceeds 1.0", () => {
    const result = sm2Next({ ...defaultState, strength: 0.99 }, 5);
    expect(result.strength).toBeLessThanOrEqual(1.0);
  });

  it("strength never goes below 0.0", () => {
    const result = sm2Next({ ...defaultState, strength: 0.01 }, 0);
    expect(result.strength).toBeGreaterThanOrEqual(0.0);
  });

  it("ease factor never goes below 1.3", () => {
    let state = defaultState;
    for (let i = 0; i < 10; i++) {
      state = sm2Next(state, 0);
    }
    expect(state.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it("ease factor increases with quality 5", () => {
    const result = sm2Next(defaultState, 5);
    expect(result.easeFactor).toBeGreaterThan(defaultState.easeFactor);
  });

  it("ease factor decreases with quality 0", () => {
    const result = sm2Next(defaultState, 0);
    expect(result.easeFactor).toBeLessThan(defaultState.easeFactor);
  });

  it("all quality levels (0-5) produce valid state", () => {
    for (const q of [0, 1, 2, 3, 4, 5] as SM2Quality[]) {
      const result = sm2Next(defaultState, q);
      expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
      expect(result.easeFactor).toBeLessThanOrEqual(5.0);
      expect(result.strength).toBeGreaterThanOrEqual(0.0);
      expect(result.strength).toBeLessThanOrEqual(1.0);
      expect(result.interval).toBeGreaterThanOrEqual(1);
      expect(result.recallCount).toBe(1);
    }
  });
});
