import { NextRequest, NextResponse } from "next/server";
import { ContentAIService } from "@contentos/content-engine";
import type { Platform, Post } from "@contentos/content-engine";
import { getSessionUserWithOrg } from "@/lib/auth";
import { buildOpenRouterModelChain, resolveAIProvider } from "@/lib/ai/provider";
import { buildDeterministicCoach } from "@/lib/ai/deterministic";
import {
  buildIntentCacheKey,
  decidePaidAIAccess,
  estimateAnthropicCostUsd,
  estimateTokensFromText,
  getIntentCache,
  logAIUsageEvent,
  setIntentCache,
  withCacheMeta,
} from "@/lib/ai/governor";

const ROUTE_KEY = "coach:v3";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

interface CoachBody {
  question?: string;
  platform?: Platform;
}

function averageEngagement(posts: Post[]): number {
  if (!posts.length) return 0;
  return (
    posts.reduce((sum, post) => sum + Math.max(0, Number(post.engagementRate || 0)), 0) /
    posts.length
  );
}

function buildContextFingerprint(recentPosts: Post[], topPerformingPosts: Post[]): Record<string, unknown> {
  return {
    recentPosts: recentPosts.slice(0, 8).map((post) => ({
      id: post.id,
      p: post.platform,
      e: Number((post.engagementRate || 0).toFixed(2)),
      d: post.publishedAt.toISOString().slice(0, 10),
    })),
    topPosts: topPerformingPosts.slice(0, 5).map((post) => ({
      id: post.id,
      p: post.platform,
      e: Number((post.engagementRate || 0).toFixed(2)),
      d: post.publishedAt.toISOString().slice(0, 10),
    })),
  };
}

function shouldEscalateCoachModel(params: {
  question: string;
  recentPosts: Post[];
  threshold: number;
}): boolean {
  const strategicKeywords =
    /(strategie|plan|roadmap|audit|campanie|funnel|conversion|lead|competitor|positionare|retentie|growth)/i;
  const isStrategic = strategicKeywords.test(params.question);
  const isLongQuestion = params.question.length > 220;
  const engagement = averageEngagement(params.recentPosts);

  return isStrategic || isLongQuestion || engagement < params.threshold;
}

export async function POST(request: NextRequest) {
  const session = await getSessionUserWithOrg();
  if (session instanceof NextResponse) return session;

  let body: CoachBody;
  try {
    body = (await request.json()) as CoachBody;
  } catch {
    return NextResponse.json({ error: "Body invalid. Trimite JSON valid." }, { status: 400 });
  }

  const question = body.question?.trim() || "";
  if (!question) {
    return NextResponse.json({ error: "Intrebarea nu poate fi goala." }, { status: 400 });
  }

  let recentPosts: Post[] = [];
  let topPerformingPosts: Post[] = [];

  const { data: recentRows } = await session.supabase
    .from("posts")
    .select("*")
    .eq("organization_id", session.organizationId)
    .order("published_at", { ascending: false })
    .limit(20);

  if (recentRows?.length) {
    recentPosts = recentRows.map(dbPostToEnginePost);
  }

  const { data: topRows } = await session.supabase
    .from("posts")
    .select("*")
    .eq("organization_id", session.organizationId)
    .order("engagement_rate", { ascending: false })
    .limit(8);

  if (topRows?.length) {
    topPerformingPosts = topRows.map(dbPostToEnginePost);
  }

  const deterministic = buildDeterministicCoach({
    question,
    platform: body.platform,
    recentPosts,
    topPosts: topPerformingPosts,
  });

  const provider = resolveAIProvider();
  const contextFingerprint = buildContextFingerprint(recentPosts, topPerformingPosts);
  const intentHash = buildIntentCacheKey(ROUTE_KEY, {
    question,
    platform: body.platform || null,
    context: contextFingerprint,
    version: 3,
  });

  const cached = await getIntentCache({
    supabase: session.supabase,
    organizationId: session.organizationId,
    routeKey: ROUTE_KEY,
    intentHash,
  });

  if (cached) {
    await logAIUsageEvent({
      supabase: session.supabase,
      organizationId: session.organizationId,
      userId: session.user.id,
      routeKey: ROUTE_KEY,
      intentHash,
      provider: "cache",
      model: "intent-cache",
      mode: "deterministic",
      cacheHit: true,
      success: true,
      metadata: { source: "ai_request_cache" },
    });

    return NextResponse.json(withCacheMeta(cached.response, { createdAt: cached.createdAt }));
  }

  const deterministicPayload = {
    ...deterministic,
    meta: {
      mode: "deterministic",
      provider: "template",
      warning: "AI indisponibil sau dezactivat. Recomandarile sunt generate local.",
    },
  };

  if (provider.mode === "template" || !provider.apiKey) {
    await setIntentCache({
      supabase: session.supabase,
      organizationId: session.organizationId,
      userId: session.user.id,
      routeKey: ROUTE_KEY,
      intentHash,
      provider: "template",
      model: "template",
      response: deterministicPayload,
      estimatedCostUsd: 0,
      ttlMs: CACHE_TTL_MS,
    });

    await logAIUsageEvent({
      supabase: session.supabase,
      organizationId: session.organizationId,
      userId: session.user.id,
      routeKey: ROUTE_KEY,
      intentHash,
      provider: "template",
      model: "template",
      mode: "deterministic",
      success: true,
      metadata: { reason: "provider_template_mode" },
    });

    return NextResponse.json(deterministicPayload);
  }

  const escalationThreshold = Number(process.env.AI_COACH_ESCALATE_BELOW_ENGAGEMENT || 2);
  const shouldEscalate = shouldEscalateCoachModel({
    question,
    recentPosts,
    threshold: escalationThreshold,
  });

  const economyModel =
    provider.mode === "openrouter"
      ? buildOpenRouterModelChain({
          quality: "economy",
          preferred:
            process.env.AI_MODEL_COACH_ECONOMY?.trim() ||
            process.env.AI_MODEL_COACH?.trim() ||
            provider.model,
        })
      : process.env.AI_MODEL_COACH_ECONOMY?.trim() ||
        process.env.AI_MODEL_COACH?.trim() ||
        "claude-3-5-haiku-latest";
  const premiumModel =
    provider.mode === "openrouter"
      ? buildOpenRouterModelChain({
          quality: "premium",
          preferred:
            process.env.AI_MODEL_COACH_PREMIUM?.trim() ||
            process.env.AI_MODEL_COACH?.trim() ||
            provider.model,
        })
      : process.env.AI_MODEL_COACH_PREMIUM?.trim() ||
        provider.model ||
        "claude-sonnet-4-5-20250929";
  const model = shouldEscalate ? premiumModel : economyModel;

  const recentPostsContext = recentPosts
    .slice(0, 8)
    .map((post) => `${post.platform}|${post.engagementRate}|${(post.textContent || "").slice(0, 180)}`)
    .join("\n");
  const topPostsContext = topPerformingPosts
    .slice(0, 5)
    .map((post) => `${post.platform}|${post.engagementRate}|${(post.textContent || "").slice(0, 180)}`)
    .join("\n");

  const estimatedInputTokens =
    estimateTokensFromText(question) +
    estimateTokensFromText(recentPostsContext) +
    estimateTokensFromText(topPostsContext) +
    380;
  const estimatedOutputTokens = 900;
  const estimatedCostUsd = estimateAnthropicCostUsd(
    model,
    estimatedInputTokens,
    estimatedOutputTokens
  );

  const budget = await decidePaidAIAccess({
    supabase: session.supabase,
    organizationId: session.organizationId,
    estimatedAdditionalCostUsd: estimatedCostUsd,
  });

  if (!budget.allowed) {
    const payload = {
      ...deterministic,
      meta: {
        mode: "deterministic",
        provider: "template",
        warning: `${budget.reason} Fallback deterministic activat.`,
      },
    };

    await setIntentCache({
      supabase: session.supabase,
      organizationId: session.organizationId,
      userId: session.user.id,
      routeKey: ROUTE_KEY,
      intentHash,
      provider: "template",
      model: "template",
      response: payload,
      estimatedCostUsd: 0,
      ttlMs: CACHE_TTL_MS,
    });

    await logAIUsageEvent({
      supabase: session.supabase,
      organizationId: session.organizationId,
      userId: session.user.id,
      routeKey: ROUTE_KEY,
      intentHash,
      provider: "template",
      model: "template",
      mode: "deterministic",
      success: true,
      budgetFallback: true,
      metadata: {
        reason: budget.reason,
        dailySpentUsd: budget.usage.dailySpentUsd,
        monthlySpentUsd: budget.usage.monthlySpentUsd,
      },
    });

    return NextResponse.json(payload);
  }

  const startedAt = Date.now();

  try {
    const service = new ContentAIService({
      apiKey: provider.apiKey,
      model,
      provider: provider.mode === "openrouter" ? "openrouter" : "anthropic",
      baseUrl: provider.baseUrl,
    });

    const aiResult = await service.chat({
      organizationId: session.organizationId,
      platform: body.platform,
      question,
      recentPosts,
      topPerformingPosts,
    });
    const resolvedModel = service.getLastResolvedModel() || model;

    const responsePayload = {
      ...aiResult,
      meta: {
        mode: "ai",
        provider: provider.mode,
        model: resolvedModel,
        modelChain: provider.mode === "openrouter" ? model : undefined,
        escalated: shouldEscalate,
      },
    };

    await setIntentCache({
      supabase: session.supabase,
      organizationId: session.organizationId,
      userId: session.user.id,
      routeKey: ROUTE_KEY,
      intentHash,
      provider: provider.mode,
      model: resolvedModel,
      response: responsePayload,
      estimatedCostUsd,
      ttlMs: CACHE_TTL_MS,
    });

    await logAIUsageEvent({
      supabase: session.supabase,
      organizationId: session.organizationId,
      userId: session.user.id,
      routeKey: ROUTE_KEY,
      intentHash,
      provider: provider.mode,
      model: resolvedModel,
      mode: "ai",
      inputTokens: estimatedInputTokens,
      outputTokens: estimatedOutputTokens,
      estimatedCostUsd,
      latencyMs: Date.now() - startedAt,
      success: true,
      metadata: {
        escalated: shouldEscalate,
        avgEngagement: averageEngagement(recentPosts),
        modelChain: provider.mode === "openrouter" ? model : undefined,
      },
    });

    return NextResponse.json(responsePayload);
  } catch (error) {
    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof (error as { status?: unknown }).status === "number"
        ? (error as { status: number }).status
        : null;
    const payload = {
      ...deterministic,
      meta: {
        mode: "deterministic",
        provider: "template",
        warning: status
          ? `AI indisponibil temporar (${status}). Am livrat fallback deterministic.`
          : "AI indisponibil temporar. Am livrat fallback deterministic.",
      },
    };

    await setIntentCache({
      supabase: session.supabase,
      organizationId: session.organizationId,
      userId: session.user.id,
      routeKey: ROUTE_KEY,
      intentHash,
      provider: "template",
      model: "template",
      response: payload,
      estimatedCostUsd: 0,
      ttlMs: CACHE_TTL_MS,
    });

    await logAIUsageEvent({
      supabase: session.supabase,
      organizationId: session.organizationId,
      userId: session.user.id,
      routeKey: ROUTE_KEY,
      intentHash,
      provider: provider.mode,
      model,
      mode: "ai",
      inputTokens: estimatedInputTokens,
      outputTokens: 0,
      estimatedCostUsd: 0,
      latencyMs: Date.now() - startedAt,
      success: false,
      errorCode: status ? `http_${status}` : "unknown",
      metadata: { fallback: "deterministic" },
    });

    return NextResponse.json(payload);
  }
}

function toNumber(value: unknown): number {
  if (typeof value !== "number") return 0;
  if (!Number.isFinite(value)) return 0;
  return value;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function dbPostToEnginePost(row: Record<string, unknown>): Post {
  const publishedAtValue = typeof row.published_at === "string" ? row.published_at : undefined;
  const publishedAt = publishedAtValue ? new Date(publishedAtValue) : new Date();

  return {
    id: String(row.id ?? ""),
    socialAccountId: String(row.social_account_id ?? ""),
    organizationId: String(row.organization_id ?? ""),
    platform: (row.platform ?? "facebook") as Post["platform"],
    platformPostId: String(row.platform_post_id ?? ""),
    platformUrl: typeof row.platform_url === "string" ? row.platform_url : undefined,
    contentType: (row.content_type ?? "text") as Post["contentType"],
    textContent: typeof row.text_content === "string" ? row.text_content : undefined,
    mediaUrls: toStringArray(row.media_urls),
    hashtags: toStringArray(row.hashtags),
    mentions: toStringArray(row.mentions),
    language: (row.language ?? "ro") as Post["language"],
    likesCount: toNumber(row.likes_count),
    commentsCount: toNumber(row.comments_count),
    sharesCount: toNumber(row.shares_count),
    savesCount: toNumber(row.saves_count),
    viewsCount: toNumber(row.views_count),
    reachCount: toNumber(row.reach_count),
    impressionsCount: toNumber(row.impressions_count),
    engagementRate: toNumber(row.engagement_rate),
    viralityScore: toNumber(row.virality_score),
    topicTags: toStringArray(row.topic_tags),
    sentiment: (row.sentiment ?? "neutral") as Post["sentiment"],
    hookType: typeof row.hook_type === "string" ? row.hook_type : undefined,
    ctaType: typeof row.cta_type === "string" ? row.cta_type : undefined,
    publishedAt: Number.isNaN(publishedAt.getTime()) ? new Date() : publishedAt,
    dentalCategory: row.dental_category as Post["dentalCategory"],
  };
}
