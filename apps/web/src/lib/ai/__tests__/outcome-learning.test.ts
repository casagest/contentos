import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  deriveCreativeSignals,
  selectBestVariantWithBandit,
  logDecisionForPublishedPost,
  logOutcomeForPost,
  refreshCreativeMemoryFromPost,
  type LearningPost,
  type DecisionDraftData,
} from "../outcome-learning";

// Minimal Supabase mock builder
function createMockSupabase(overrides: Record<string, unknown> = {}) {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    single: vi.fn().mockResolvedValue({ data: null }),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    update: vi.fn().mockReturnThis(),
    then: undefined as unknown,
    ...overrides,
  };
  // Allow .from() chains
  const from = vi.fn().mockReturnValue(chainable);
  return { from, _chain: chainable };
}

describe("outcome-learning", () => {
  describe("deriveCreativeSignals", () => {
    it("returns unknown hook/framework/cta for empty text", () => {
      const result = deriveCreativeSignals({ text: "" });
      expect(result.hookType).toBe("unknown");
      expect(result.framework).toBe("unknown");
      expect(result.ctaType).toBe("none");
      expect(result.memoryKey).toBe("unknown|unknown|none");
    });

    it("returns unknown for null text", () => {
      const result = deriveCreativeSignals({ text: null });
      expect(result.hookType).toBe("unknown");
      expect(result.framework).toBe("unknown");
      expect(result.ctaType).toBe("none");
    });

    it("detects question hook from text containing ?", () => {
      const result = deriveCreativeSignals({ text: "De ce e importanta albirea?" });
      expect(result.hookType).toBe("question");
    });

    it("detects interrupt hook from attention words", () => {
      const result = deriveCreativeSignals({ text: "STOP! Nu mai face aceasta greseala." });
      expect(result.hookType).toBe("interrupt");
    });

    it("detects list hook from numbered text", () => {
      const result = deriveCreativeSignals({ text: "Top 5 sfaturi pentru sănătate" });
      expect(result.hookType).toBe("list");
    });

    it("detects story hook from narrative starters", () => {
      const result = deriveCreativeSignals({ text: "Azi am descoperit ceva incredibil" });
      expect(result.hookType).toBe("story");
    });

    it("detects educational hook from explanation starters", () => {
      const result = deriveCreativeSignals({ text: "Cum sa iti protejezi pielea de soare" });
      expect(result.hookType).toBe("educational");
    });

    it("returns statement for plain declarative text", () => {
      const result = deriveCreativeSignals({ text: "Serviciul nostru premium disponibil acum." });
      expect(result.hookType).toBe("statement");
    });

    it("uses explicit hookType override when provided", () => {
      const result = deriveCreativeSignals({ text: "some text", hookType: "custom_hook" });
      expect(result.hookType).toBe("custom_hook");
    });

    it("uses explicit ctaType override when provided", () => {
      const result = deriveCreativeSignals({ text: "some text", ctaType: "custom_cta" });
      expect(result.ctaType).toBe("custom_cta");
    });

    it("ignores whitespace-only hookType override", () => {
      const result = deriveCreativeSignals({ text: "De ce este important?", hookType: "   " });
      expect(result.hookType).toBe("question");
    });

    // Framework detection
    it("detects PAS framework from problem-related words", () => {
      const result = deriveCreativeSignals({ text: "Problema ta cu durerea de spate" });
      expect(result.framework).toBe("pas");
    });

    it("detects BAB framework from transformation words", () => {
      const result = deriveCreativeSignals({ text: "Inainte aveam probleme, dupa transformare totul a fost bine" });
      expect(result.framework).toBe("bab");
    });

    it("detects listicle framework from numbered patterns", () => {
      const result = deriveCreativeSignals({ text: "3 pasi simpli pentru succes" });
      expect(result.framework).toBe("listicle");
    });

    it("detects story framework from narrative words", () => {
      const result = deriveCreativeSignals({ text: "Am o poveste incredibila de spus" });
      expect(result.framework).toBe("story");
    });

    it("detects AIDA framework from attention words", () => {
      const result = deriveCreativeSignals({ text: "Atentie! Dorinta ta de actiune" });
      expect(result.framework).toBe("aida");
    });

    it("returns generic framework for unmatched text", () => {
      const result = deriveCreativeSignals({ text: "Serviciul premium disponibil." });
      expect(result.framework).toBe("generic");
    });

    // CTA detection
    it("detects comment CTA", () => {
      const result = deriveCreativeSignals({ text: "Comenteaza mai jos parerea ta" });
      expect(result.ctaType).toBe("comment");
    });

    it("detects save CTA", () => {
      const result = deriveCreativeSignals({ text: "Salveaza acest post pentru mai tarziu" });
      expect(result.ctaType).toBe("save");
    });

    it("detects share CTA", () => {
      const result = deriveCreativeSignals({ text: "Distribuie cu prietenii tai" });
      expect(result.ctaType).toBe("share");
    });

    it("detects follow CTA", () => {
      const result = deriveCreativeSignals({ text: "Urmareste pagina noastra" });
      expect(result.ctaType).toBe("follow");
    });

    it("detects click CTA", () => {
      const result = deriveCreativeSignals({ text: "Click pe link pentru detalii" });
      expect(result.ctaType).toBe("click");
    });

    it("returns none CTA for text without CTA", () => {
      const result = deriveCreativeSignals({ text: "Un text fara apel la actiune." });
      expect(result.ctaType).toBe("none");
    });

    // memoryKey format
    it("builds memoryKey as hookType|framework|ctaType", () => {
      const result = deriveCreativeSignals({ text: "De ce e importanta albirea? Salveaza!" });
      expect(result.memoryKey).toMatch(/^[a-z]+\|[a-z]+\|[a-z]+$/);
      expect(result.memoryKey.split("|")).toHaveLength(3);
    });
  });

  describe("selectBestVariantWithBandit", () => {
    it("returns single_variant for empty variants array", async () => {
      const supabase = createMockSupabase();
      const result = await selectBestVariantWithBandit({
        supabase,
        organizationId: "org-1",
        platform: "instagram",
        variants: [],
      });
      expect(result.selectedIndex).toBe(0);
      expect(result.reason).toBe("single_variant");
      expect(result.scores).toHaveLength(1);
    });

    it("returns single_variant for one variant", async () => {
      const supabase = createMockSupabase();
      const result = await selectBestVariantWithBandit({
        supabase,
        organizationId: "org-1",
        platform: "facebook",
        variants: ["Post about dental care"],
      });
      expect(result.selectedIndex).toBe(0);
      expect(result.reason).toBe("single_variant");
    });

    it("returns bandit result for multiple variants", async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [] }),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [] }),
      };
      const supabase = { from: vi.fn().mockReturnValue(chain) };

      const result = await selectBestVariantWithBandit({
        supabase,
        organizationId: "org-1",
        platform: "instagram",
        objective: "engagement",
        variants: ["De ce e importanta albirea?", "Top 5 sfaturi pentru dinti albi"],
      });

      expect(result.selectedIndex).toBeGreaterThanOrEqual(0);
      expect(result.selectedIndex).toBeLessThan(2);
      expect(result.reason).toContain("bandit_ucb_objective_engagement");
      expect(result.scores).toHaveLength(2);
    });

    it("scores contain required fields", async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [] }),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [] }),
      };
      const supabase = { from: vi.fn().mockReturnValue(chain) };

      const result = await selectBestVariantWithBandit({
        supabase,
        organizationId: "org-1",
        platform: "tiktok",
        variants: ["Variant A text here", "Variant B different text"],
      });

      for (const score of result.scores) {
        expect(score).toHaveProperty("index");
        expect(score).toHaveProperty("memoryKey");
        expect(score).toHaveProperty("score");
        expect(score).toHaveProperty("successRate");
        expect(score).toHaveProperty("sampleSize");
        expect(score).toHaveProperty("avgEngagement");
        expect(typeof score.score).toBe("number");
        expect(score.successRate).toBeGreaterThanOrEqual(0);
        expect(score.successRate).toBeLessThanOrEqual(1);
      }
    });

    it("defaults objective to engagement when not specified", async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [] }),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [] }),
      };
      const supabase = { from: vi.fn().mockReturnValue(chain) };

      const result = await selectBestVariantWithBandit({
        supabase,
        organizationId: "org-1",
        platform: "facebook",
        variants: ["A", "B"],
      });

      expect(result.reason).toContain("engagement");
    });

    it("handles Supabase error gracefully", async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockRejectedValue(new Error("DB error")),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockRejectedValue(new Error("DB error")),
      };
      const supabase = { from: vi.fn().mockReturnValue(chain) };

      const result = await selectBestVariantWithBandit({
        supabase,
        organizationId: "org-1",
        platform: "instagram",
        variants: ["Variant A", "Variant B"],
      });

      // Should still return a valid result even if DB fails
      expect(result.selectedIndex).toBeGreaterThanOrEqual(0);
      expect(result.scores.length).toBe(2);
    });

    it("normalizes whitespace but keeps unique text as separate variants", async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [] }),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [] }),
      };
      const supabase = { from: vi.fn().mockReturnValue(chain) };

      const result = await selectBestVariantWithBandit({
        supabase,
        organizationId: "org-1",
        platform: "instagram",
        variants: ["Text one here", "  Text  two  here  "],
      });

      // Two different texts after normalization → bandit selection
      expect(result.scores).toHaveLength(2);
      expect(result.reason).toContain("bandit_ucb");
    });

    it("uses leads objective correctly", async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [] }),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [] }),
      };
      const supabase = { from: vi.fn().mockReturnValue(chain) };

      const result = await selectBestVariantWithBandit({
        supabase,
        organizationId: "org-1",
        platform: "facebook",
        objective: "leads",
        variants: [
          "Click pe link pentru programare",
          "O poveste frumoasa despre tratament",
        ],
      });

      expect(result.reason).toBe("bandit_ucb_objective_leads");
      expect(result.scores).toHaveLength(2);
    });

    it("applies objective bonus for leads + click CTA", async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [] }),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [] }),
      };
      const supabase = { from: vi.fn().mockReturnValue(chain) };

      // Variant with click CTA should get bonus for leads objective
      const result = await selectBestVariantWithBandit({
        supabase,
        organizationId: "org-1",
        platform: "facebook",
        objective: "leads",
        variants: [
          "Click pe link pentru detalii complete",
          "Un text generic fara apel la actiune particular",
        ],
      });

      // The click variant should have a higher score due to objective bonus
      const clickVariantScore = result.scores.find((s) => {
        const signals = deriveCreativeSignals({ text: "Click pe link pentru detalii complete" });
        return s.memoryKey === signals.memoryKey;
      });
      const genericVariantScore = result.scores.find((s) => {
        const signals = deriveCreativeSignals({ text: "Un text generic fara apel la actiune particular" });
        return s.memoryKey === signals.memoryKey;
      });

      expect(clickVariantScore).toBeDefined();
      expect(genericVariantScore).toBeDefined();
      if (clickVariantScore && genericVariantScore) {
        expect(clickVariantScore.score).toBeGreaterThan(genericVariantScore.score);
      }
    });

    it("scores are sorted descending by score", async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [] }),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [] }),
      };
      const supabase = { from: vi.fn().mockReturnValue(chain) };

      const result = await selectBestVariantWithBandit({
        supabase,
        organizationId: "org-1",
        platform: "instagram",
        objective: "engagement",
        variants: ["Variant A comment", "Variant B save", "Variant C share"],
      });

      for (let i = 1; i < result.scores.length; i++) {
        expect(result.scores[i - 1].score).toBeGreaterThanOrEqual(result.scores[i].score);
      }
    });

    it("filters out empty variants", async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [] }),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [] }),
      };
      const supabase = { from: vi.fn().mockReturnValue(chain) };

      const result = await selectBestVariantWithBandit({
        supabase,
        organizationId: "org-1",
        platform: "instagram",
        variants: ["Real variant text", "", "   "],
      });

      expect(result.reason).toBe("single_variant");
    });
  });

  describe("logOutcomeForPost", () => {
    it("returns false when metrics already exist (dedup by hash)", async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: "existing-id" } }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
      const supabase = { from: vi.fn().mockReturnValue(chain) };

      const post: LearningPost = {
        id: "post-1",
        organization_id: "org-1",
        platform: "instagram",
      };

      const result = await logOutcomeForPost({
        supabase,
        post,
        source: "sync",
        eventType: "snapshot",
      });

      expect(result).toBe(false);
    });

    it("inserts outcome and returns true for new metrics", async () => {
      const insertFn = vi.fn().mockResolvedValue({ error: null });
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        insert: insertFn,
      };
      const supabase = { from: vi.fn().mockReturnValue(chain) };

      const post: LearningPost = {
        id: "post-2",
        organization_id: "org-1",
        platform: "facebook",
        likes_count: 50,
        comments_count: 10,
        engagement_rate: 5.2,
      };

      const result = await logOutcomeForPost({
        supabase,
        post,
        source: "publish",
        eventType: "published",
        objective: "engagement",
      });

      expect(result).toBe(true);
      expect(insertFn).toHaveBeenCalled();
    });

    it("returns false on Supabase insert error", async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        insert: vi.fn().mockResolvedValue({ error: { message: "DB error" } }),
      };
      const supabase = { from: vi.fn().mockReturnValue(chain) };

      const post: LearningPost = {
        id: "post-3",
        organization_id: "org-1",
        platform: "tiktok",
      };

      const result = await logOutcomeForPost({
        supabase,
        post,
        source: "manual",
        eventType: "manual",
      });

      expect(result).toBe(false);
    });

    it("returns false on exception", async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockRejectedValue(new Error("network")),
      };
      const supabase = { from: vi.fn().mockReturnValue(chain) };

      const post: LearningPost = {
        id: "post-4",
        organization_id: "org-1",
        platform: "youtube",
      };

      const result = await logOutcomeForPost({
        supabase,
        post,
        source: "sync",
        eventType: "snapshot",
      });

      expect(result).toBe(false);
    });
  });

  describe("logDecisionForPublishedPost", () => {
    it("inserts decision log without errors", async () => {
      const insertFn = vi.fn().mockResolvedValue({ error: null });
      const chain = { insert: insertFn };
      const supabase = { from: vi.fn().mockReturnValue(chain) };

      await logDecisionForPublishedPost({
        supabase,
        organizationId: "org-1",
        userId: "user-1",
        routeKey: "generate:v4",
        platform: "instagram",
        postId: "post-1",
      });

      expect(insertFn).toHaveBeenCalled();
      const insertedData = insertFn.mock.calls[0][0];
      expect(insertedData.organization_id).toBe("org-1");
      expect(insertedData.post_id).toBe("post-1");
      expect(insertedData.platform).toBe("instagram");
      expect(insertedData.decision_type).toBe("generation");
    });

    it("resolves meta from draft's ai_suggestions", async () => {
      const insertFn = vi.fn().mockResolvedValue({ error: null });
      const chain = { insert: insertFn };
      const supabase = { from: vi.fn().mockReturnValue(chain) };

      const draft: DecisionDraftData = {
        id: "draft-1",
        source: "ai_generated",
        ai_suggestions: {
          meta: {
            mode: "ai",
            provider: "anthropic",
            model: "claude-sonnet-4-5-20250929",
            objective: "leads",
            escalated: true,
            roiGate: {
              roiMultiple: 2.5,
              incrementalCostUsd: 0.05,
              expectedUpliftPoints: 12,
              reason: "roi_sufficient",
            },
          },
        },
        algorithm_scores: {
          instagram: { overallScore: 85 },
        },
        platform_versions: {
          instagram: {
            text: "Primary text",
            selectedVariant: 0,
            alternativeVersions: ["Alt 1"],
          },
        },
      };

      await logDecisionForPublishedPost({
        supabase,
        organizationId: "org-1",
        routeKey: "generate:v4",
        platform: "instagram",
        postId: "post-2",
        draft,
        objective: "leads",
      });

      const insertedData = insertFn.mock.calls[0][0];
      expect(insertedData.provider).toBe("anthropic");
      expect(insertedData.model).toBe("claude-sonnet-4-5-20250929");
      expect(insertedData.mode).toBe("ai");
      expect(insertedData.objective).toBe("leads");
      expect(insertedData.expected_score).toBe(85);
      expect(insertedData.roi_multiple).toBe(2.5);
    });

    it("handles exception gracefully (best-effort)", async () => {
      const supabase = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockRejectedValue(new Error("DB down")),
        }),
      };

      // Should not throw
      await expect(
        logDecisionForPublishedPost({
          supabase,
          organizationId: "org-1",
          routeKey: "generate:v4",
          platform: "facebook",
          postId: "post-3",
        })
      ).resolves.toBeUndefined();
    });
  });

  describe("refreshCreativeMemoryFromPost", () => {
    it("inserts new creative memory when none exists", async () => {
      const insertFn = vi.fn().mockResolvedValue({ error: null });
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        insert: insertFn,
      };
      const supabase = { from: vi.fn().mockReturnValue(chain) };

      const post: LearningPost = {
        id: "post-1",
        organization_id: "org-1",
        platform: "instagram",
        text_content: "De ce e importanta albirea? Comenteaza!",
        engagement_rate: 5.5,
      };

      await refreshCreativeMemoryFromPost({
        supabase,
        post,
        objective: "engagement",
      });

      expect(insertFn).toHaveBeenCalled();
      const data = insertFn.mock.calls[0][0];
      expect(data.organization_id).toBe("org-1");
      expect(data.platform).toBe("instagram");
      expect(data.sample_size).toBe(1);
      expect(data.avg_engagement).toBe(5.5);
    });

    it("updates existing creative memory with incremented counts", async () => {
      const updateFn = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: "mem-1",
            sample_size: 5,
            success_count: 3,
            total_engagement: 20,
          },
        }),
        update: updateFn,
      };
      const supabase = { from: vi.fn().mockReturnValue(chain) };

      const post: LearningPost = {
        id: "post-2",
        organization_id: "org-1",
        platform: "facebook",
        text_content: "Top 5 sfaturi pentru albire dentara",
        engagement_rate: 4.0,
      };

      await refreshCreativeMemoryFromPost({
        supabase,
        post,
        objective: "engagement",
      });

      expect(updateFn).toHaveBeenCalled();
      const data = updateFn.mock.calls[0][0];
      expect(data.sample_size).toBe(6);
      expect(data.total_engagement).toBeCloseTo(24, 2);
      expect(data.avg_engagement).toBeCloseTo(4, 2);
    });

    it("handles exception gracefully", async () => {
      const supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockRejectedValue(new Error("DB down")),
        }),
      };

      const post: LearningPost = {
        id: "post-3",
        organization_id: "org-1",
        platform: "tiktok",
      };

      // Should not throw
      await expect(
        refreshCreativeMemoryFromPost({ supabase, post })
      ).resolves.toBeUndefined();
    });
  });
});
