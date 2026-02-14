import { describe, it, expect, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock Supabase with chainable builder pattern
// ---------------------------------------------------------------------------

function createMockSupabase(mockData: Record<string, unknown[]> = {}) {
  function makeChain(data: unknown[]) {
    const chain: Record<string, unknown> = {
      data,
      error: null,
    };

    // All chainable methods return the same chain object
    const chainMethods = [
      "select", "eq", "gte", "order", "limit", "in", "not", "lte", "or",
    ];
    for (const method of chainMethods) {
      chain[method] = vi.fn().mockReturnValue(chain);
    }

    // Terminal methods
    chain.maybeSingle = vi.fn().mockReturnValue(
      Promise.resolve({ data: null, error: null })
    );
    chain.single = vi.fn().mockReturnValue(
      Promise.resolve({ data: data[0] ?? null, error: null })
    );
    chain.insert = vi.fn().mockReturnValue(
      Promise.resolve({ data: null, error: null })
    );

    // Make it thenable (Promise-like)
    chain.then = (
      resolve: (v: { data: unknown[]; error: null }) => void
    ) => resolve({ data, error: null });

    return chain;
  }

  const from = vi.fn().mockImplementation((table: string) => {
    const data = mockData[table] ?? [];
    return makeChain(data);
  });

  return { from, rpc: vi.fn() } as any;
}

import {
  detectFrequencyPatterns,
  detectCoOccurrencePatterns,
  detectTemporalPatterns,
} from "../pattern-detector";

// ---------------------------------------------------------------------------
// detectFrequencyPatterns
// ---------------------------------------------------------------------------

describe("detectFrequencyPatterns", () => {
  it("returns empty for no data", async () => {
    const supabase = createMockSupabase({ episodic_memory: [] });
    const result = await detectFrequencyPatterns({
      supabase,
      organizationId: "org-1",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(0);
    }
  });

  it("detects frequency patterns above threshold", async () => {
    const now = Date.now();
    const episodicData = Array.from({ length: 5 }, (_, i) => ({
      event_type: "post_success",
      platform: "instagram",
      importance: 0.7,
      created_at: new Date(now - i * 86_400_000).toISOString(),
    }));

    const supabase = createMockSupabase({ episodic_memory: episodicData });
    const result = await detectFrequencyPatterns({
      supabase,
      organizationId: "org-1",
      minOccurrences: 3,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBeGreaterThan(0);
      expect(result.value[0].eventType).toBe("post_success");
      expect(result.value[0].count).toBe(5);
    }
  });

  it("filters below minimum occurrences", async () => {
    const episodicData = [
      { event_type: "post_success", platform: null, importance: 0.5, created_at: new Date().toISOString() },
      { event_type: "post_failure", platform: null, importance: 0.5, created_at: new Date().toISOString() },
    ];

    const supabase = createMockSupabase({ episodic_memory: episodicData });
    const result = await detectFrequencyPatterns({
      supabase,
      organizationId: "org-1",
      minOccurrences: 3,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(0);
    }
  });
});

// ---------------------------------------------------------------------------
// detectTemporalPatterns
// ---------------------------------------------------------------------------

describe("detectTemporalPatterns", () => {
  it("returns empty for no data", async () => {
    const supabase = createMockSupabase({ episodic_memory: [] });
    const result = await detectTemporalPatterns({
      supabase,
      organizationId: "org-1",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(0);
    }
  });
});

// ---------------------------------------------------------------------------
// detectCoOccurrencePatterns
// ---------------------------------------------------------------------------

describe("detectCoOccurrencePatterns", () => {
  it("returns empty for less than 2 events", async () => {
    const supabase = createMockSupabase({
      episodic_memory: [
        { event_type: "post_success", created_at: new Date().toISOString() },
      ],
    });
    const result = await detectCoOccurrencePatterns({
      supabase,
      organizationId: "org-1",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(0);
    }
  });

  it("returns empty for empty data", async () => {
    const supabase = createMockSupabase({ episodic_memory: [] });
    const result = await detectCoOccurrencePatterns({
      supabase,
      organizationId: "org-1",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(0);
    }
  });
});
