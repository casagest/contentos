import { describe, it, expect, vi } from "vitest";
import { checkPlatformLimit, checkPostLimit } from "./plan-limits";

function createMockSupabase(countResult: number | null) {
  const builder: Record<string, any> = {};
  builder.from = vi.fn().mockReturnValue(builder);
  builder.select = vi.fn().mockReturnValue(builder);
  builder.eq = vi.fn().mockReturnValue(builder);
  builder.gte = vi.fn().mockReturnValue(builder);
  // Make it thenable so await works
  builder.then = (resolve: (v: any) => void, reject?: (e: any) => void) =>
    Promise.resolve({ count: countResult }).then(resolve, reject);
  return builder as any;
}

describe("plan-limits", () => {
  describe("checkPlatformLimit", () => {
    it("allows when under limit (free plan, 0 accounts)", async () => {
      const supabase = createMockSupabase(0);
      const result = await checkPlatformLimit(supabase, "org-1", "free");
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(1);
      expect(result.currentCount).toBe(0);
    });

    it("blocks when at limit (free plan, 1 account)", async () => {
      const supabase = createMockSupabase(1);
      const result = await checkPlatformLimit(supabase, "org-1", "free");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Free");
      expect(result.reason).toContain("1");
    });

    it("allows pro plan with 4 accounts (limit is 5)", async () => {
      const supabase = createMockSupabase(4);
      const result = await checkPlatformLimit(supabase, "org-1", "pro");
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(5);
    });

    it("handles null count as 0", async () => {
      const supabase = createMockSupabase(null);
      const result = await checkPlatformLimit(supabase, "org-1", "free");
      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(0);
    });
  });

  describe("checkPostLimit", () => {
    it("allows when under limit (free plan, 49 posts)", async () => {
      const supabase = createMockSupabase(49);
      const result = await checkPostLimit(supabase, "org-1", "free");
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(50);
    });

    it("blocks when at limit (free plan, 50 posts)", async () => {
      const supabase = createMockSupabase(50);
      const result = await checkPostLimit(supabase, "org-1", "free");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("50");
      expect(result.reason).toContain("Free");
    });

    it("always allows unlimited plans (starter, postsPerMonth=-1)", async () => {
      const supabase = createMockSupabase(9999);
      const result = await checkPostLimit(supabase, "org-1", "starter");
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(-1);
    });

    it("always allows pro plan (unlimited)", async () => {
      const supabase = createMockSupabase(500);
      const result = await checkPostLimit(supabase, "org-1", "pro");
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(-1);
    });

    it("handles null count as 0", async () => {
      const supabase = createMockSupabase(null);
      const result = await checkPostLimit(supabase, "org-1", "free");
      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(0);
    });
  });
});
