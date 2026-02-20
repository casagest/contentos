/**
 * Benchmark API — Intelligence maturity dashboard for the organization.
 *
 * GET /api/ai/benchmark
 *
 * Returns:
 * - Voice DNA maturity (0-100%)
 * - Memory layer stats (episodic, semantic, procedural, working, metacognitive)
 * - AI accuracy (from metacognitive logs)
 * - Content stats (drafts, posts, braindumps)
 * - Switching cost estimate (what they'd lose by leaving)
 * - Learning velocity (memories/day trend)
 *
 * Cost: $0 (no AI calls, DB queries only)
 * Auth: requires authenticated session
 */

import { NextResponse } from "next/server";
import { getSessionUserWithOrg } from "@/lib/auth";

export async function GET() {
  const session = await getSessionUserWithOrg();
  if (session instanceof NextResponse) return session;

  const { supabase, organizationId } = session;

  // Run all queries in parallel
  const [
    episodic,
    semantic,
    procedural,
    working,
    metacognitive,
    drafts,
    posts,
    braindumps,
    orgData,
    recentAccuracy,
    aiUsage,
  ] = await Promise.all([
    // Memory layer counts
    supabase
      .schema("contentos")
      .from("episodic_memory")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .schema("contentos")
      .from("semantic_patterns")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .schema("contentos")
      .from("procedural_strategies")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .schema("contentos")
      .from("working_memory")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .schema("contentos")
      .from("metacognitive_log")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    // Content counts
    supabase
      .from("drafts")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("brain_dumps")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    // Org settings (Voice DNA)
    supabase
      .from("organizations")
      .select("settings, created_at")
      .eq("id", organizationId)
      .single(),
    // Recent accuracy from metacognitive_log
    supabase
      .schema("contentos")
      .from("metacognitive_log")
      .select("value, period_end")
      .eq("organization_id", organizationId)
      .eq("metric_type", "prediction_accuracy")
      .order("period_end", { ascending: false })
      .limit(10),
    // AI usage (total calls & cost)
    supabase
      .from("ai_usage_events")
      .select("estimated_cost_usd, created_at, success")
      .eq("organization_id", organizationId),
  ]);

  // Memory stats
  const memoryStats = {
    episodic: episodic.count ?? 0,
    semantic: semantic.count ?? 0,
    procedural: procedural.count ?? 0,
    working: working.count ?? 0,
    metacognitive: metacognitive.count ?? 0,
  };
  const totalMemories =
    memoryStats.episodic +
    memoryStats.semantic +
    memoryStats.procedural +
    memoryStats.working +
    memoryStats.metacognitive;

  // Voice DNA maturity
  const settings = (orgData.data?.settings as Record<string, unknown>) || {};
  const voiceDNA = settings.voiceDNA as Record<string, unknown> | undefined;
  const voiceDNASampleSize = (voiceDNA?.sampleSize as number) || 0;
  // Maturity: 0 samples = 0%, 3 = 20%, 10 = 50%, 20 = 80%, 30+ = 100%
  const voiceDNAMaturity = Math.min(100, Math.round((voiceDNASampleSize / 30) * 100));

  // AI accuracy
  const accuracyValues = (recentAccuracy.data || []).map(
    (r: { value: number }) => r.value
  );
  const avgAccuracy =
    accuracyValues.length > 0
      ? Math.round(
          (accuracyValues.reduce((a: number, b: number) => a + b, 0) /
            accuracyValues.length) *
            100
        )
      : null;

  // Content stats
  const contentStats = {
    drafts: drafts.count ?? 0,
    posts: posts.count ?? 0,
    braindumps: braindumps.count ?? 0,
    totalContent: (drafts.count ?? 0) + (posts.count ?? 0) + (braindumps.count ?? 0),
  };

  // AI usage stats
  const usageEvents = aiUsage.data || [];
  const totalAICalls = usageEvents.length;
  const successfulCalls = usageEvents.filter(
    (e: { success: boolean }) => e.success
  ).length;
  const totalCostUsd = usageEvents.reduce(
    (sum: number, e: { estimated_cost_usd: number | null }) =>
      sum + (e.estimated_cost_usd || 0),
    0
  );

  // Learning velocity (memories created in last 7 days vs previous 7)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000);
  const recentEvents = usageEvents.filter(
    (e: { created_at: string }) => new Date(e.created_at) >= sevenDaysAgo
  ).length;
  const olderEvents = usageEvents.filter(
    (e: { created_at: string }) =>
      new Date(e.created_at) >= fourteenDaysAgo &&
      new Date(e.created_at) < sevenDaysAgo
  ).length;
  const velocityTrend: "up" | "down" | "stable" =
    recentEvents > olderEvents * 1.2
      ? "up"
      : recentEvents < olderEvents * 0.8
        ? "down"
        : "stable";

  // Learning level
  let level: "empty" | "learning" | "active" | "expert" = "empty";
  if (totalMemories === 0 && contentStats.totalContent === 0) level = "empty";
  else if (totalMemories < 10 || voiceDNASampleSize < 5) level = "learning";
  else if (memoryStats.semantic < 5 || memoryStats.procedural < 2) level = "active";
  else level = "expert";

  // Overall maturity score (weighted average)
  const maturityScore = Math.min(
    100,
    Math.round(
      voiceDNAMaturity * 0.3 +
        Math.min(100, memoryStats.episodic * 5) * 0.2 +
        Math.min(100, memoryStats.semantic * 10) * 0.2 +
        Math.min(100, memoryStats.procedural * 20) * 0.15 +
        Math.min(100, contentStats.totalContent * 3) * 0.15
    )
  );

  // Switching cost (what they'd lose)
  const accountAge = orgData.data?.created_at
    ? Math.ceil(
        (now.getTime() - new Date(orgData.data.created_at as string).getTime()) /
          86400000
      )
    : 0;

  const switchingCost = {
    daysOfLearning: accountAge,
    memoriesAccumulated: totalMemories,
    voiceDNASamples: voiceDNASampleSize,
    patternsDiscovered: memoryStats.semantic,
    strategiesProven: memoryStats.procedural,
    contentCreated: contentStats.totalContent,
    aiInvestmentUsd: Math.round(totalCostUsd * 100) / 100,
  };

  return NextResponse.json({
    maturityScore,
    level,
    voiceDNA: {
      maturity: voiceDNAMaturity,
      sampleSize: voiceDNASampleSize,
      hasVerbalTics: Array.isArray(voiceDNA?.verbalTics) && (voiceDNA.verbalTics as string[]).length > 0,
      formalityLevel: (voiceDNA?.formalityLevel as number) || null,
    },
    memory: memoryStats,
    totalMemories,
    content: contentStats,
    accuracy: {
      current: avgAccuracy,
      samples: accuracyValues.length,
      trend: velocityTrend,
    },
    aiUsage: {
      totalCalls: totalAICalls,
      successRate:
        totalAICalls > 0 ? Math.round((successfulCalls / totalAICalls) * 100) : null,
      totalCostUsd: Math.round(totalCostUsd * 100) / 100,
    },
    velocity: {
      last7Days: recentEvents,
      previous7Days: olderEvents,
      trend: velocityTrend,
    },
    switchingCost,
    meta: {
      generatedAt: now.toISOString(),
      cost: 0,
    },
  });
}
