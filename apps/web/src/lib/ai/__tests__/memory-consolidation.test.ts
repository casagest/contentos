import { describe, it, expect, vi } from "vitest";

// We test the audit trail query mapping and dry-run stats logic.
// Full integration requires a live DB. Here we test what we can
// with mocked Supabase.

function createMockSupabase(overrides: Record<string, unknown> = {}) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    data: [],
    error: null,
    then: (resolve: (v: { data: unknown[]; error: null }) => void) =>
      resolve({ data: overrides.data as unknown[] ?? [], error: null }),
  };

  return {
    from: vi.fn().mockReturnValue(chain),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  } as any;
}

import {
  appendAuditEntry,
  queryAuditTrail,
} from "../memory-consolidation";

// ---------------------------------------------------------------------------
// appendAuditEntry
// ---------------------------------------------------------------------------

describe("appendAuditEntry", () => {
  it("inserts audit entry successfully", async () => {
    const supabase = createMockSupabase();
    const result = await appendAuditEntry({
      supabase,
      entry: {
        organizationId: "org-1",
        actionType: "episodic_promoted",
        sourceIds: ["id-1", "id-2"],
        details: { count: 3 },
        actor: "system",
      },
    });

    expect(result.ok).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith("consolidation_audit_log");
  });

  it("handles insert error gracefully", async () => {
    const supabase = createMockSupabase();
    supabase.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({
        error: { message: "insert failed" },
      }),
    });

    const result = await appendAuditEntry({
      supabase,
      entry: {
        organizationId: "org-1",
        actionType: "pattern_merged",
        sourceIds: [],
        details: {},
        actor: "cron",
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("CONSOLIDATION_FAILED");
    }
  });
});

// ---------------------------------------------------------------------------
// queryAuditTrail
// ---------------------------------------------------------------------------

describe("queryAuditTrail", () => {
  it("maps DB rows to AuditEntry[]", async () => {
    const mockRows = [
      {
        organization_id: "org-1",
        action_type: "episodic_promoted",
        source_ids: ["s1"],
        target_id: null,
        details: { count: 1 },
        confidence: 0.8,
        actor: "system",
        created_at: "2024-01-01T00:00:00Z",
      },
    ];

    const supabase = createMockSupabase({ data: mockRows });
    const result = await queryAuditTrail({
      supabase,
      organizationId: "org-1",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].actionType).toBe("episodic_promoted");
      expect(result.value[0].sourceIds).toEqual(["s1"]);
      expect(result.value[0].actor).toBe("system");
    }
  });

  it("returns empty array when no data", async () => {
    const supabase = createMockSupabase({ data: [] });
    const result = await queryAuditTrail({
      supabase,
      organizationId: "org-1",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(0);
    }
  });
});
