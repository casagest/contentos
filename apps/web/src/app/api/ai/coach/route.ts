import { NextRequest, NextResponse } from "next/server";
import type { Platform, Post } from "@contentos/content-engine";
import { getSessionUserWithOrg } from "@/lib/auth";
import { routeAICall } from "@/lib/ai/multi-model-router";
import { buildDeterministicCoach } from "@/lib/ai/deterministic";
import {
  fetchCognitiveContextV4,
  trackMemoryAccess,
} from "@/lib/ai/cognitive-memory";
import { buildMemoryPromptFragment } from "@/lib/ai/memory-sanitizer";
import { parseAIJson, JSON_FORMAT_RULES } from "@/lib/ai/parse-ai-json";
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
const ERROR_CACHE_TTL_MS = 5 * 60 * 1000;

interface CoachBody {
  question?: string;
  platform?: Platform;
  conversationHistory?: Array<{ role: string; content: string }>;
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

  // Extract conversation history from UI (last 10 messages for context)
  const rawHistory = Array.isArray(body.conversationHistory) ? body.conversationHistory : [];
  const conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const msg of rawHistory.slice(-10)) {
    if (msg && typeof msg.content === "string" && msg.content.trim()) {
      conversationHistory.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content.substring(0, 2000),
      });
    }
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

  // Load business profile for personalized coaching
  let businessContext = "";
  const { data: orgData } = await session.supabase
    .from("organizations")
    .select("settings")
    .eq("id", session.organizationId)
    .single();

  const orgSettings = orgData?.settings as Record<string, unknown> | null;
  if (orgSettings?.businessProfile) {
    const bp = orgSettings.businessProfile as Record<string, unknown>;
    const bpName = typeof bp.name === "string" ? bp.name : "";
    if (bpName) {
      const lines = [`Context about the business you're coaching:`];
      lines.push(`- Business: ${bpName}`);
      if (typeof bp.industry === "string") lines.push(`- Industry: ${bp.industry}`);
      if (typeof bp.description === "string" && bp.description) lines.push(`- Description: ${bp.description}`);
      if (typeof bp.targetAudience === "string" && bp.targetAudience) lines.push(`- Target audience: ${bp.targetAudience}`);
      const tones = Array.isArray(bp.tones) ? bp.tones.filter((t): t is string => typeof t === "string") : [];
      if (tones.length) lines.push(`- Communication tones: ${tones.join(", ")}`);
      if (typeof bp.usps === "string" && bp.usps.trim()) lines.push(`- USPs: ${bp.usps}`);
      if (typeof bp.preferredPhrases === "string" && bp.preferredPhrases.trim()) lines.push(`- Preferred phrases: ${bp.preferredPhrases}`);
      if (typeof bp.avoidPhrases === "string" && bp.avoidPhrases.trim()) lines.push(`- Phrases to avoid: ${bp.avoidPhrases}`);
      businessContext = "\n\n" + lines.join("\n");
    }
  }

  const deterministic = buildDeterministicCoach({
    question,
    platform: body.platform,
    recentPosts,
    topPosts: topPerformingPosts,
  });

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

  const hasAnyProvider = [
    process.env.ANTHROPIC_API_KEY,
    process.env.OPENAI_API_KEY,
    process.env.GOOGLE_AI_API_KEY,
    process.env.OPENROUTER_API_KEY,
  ].some((k) => k?.trim());

  if (!hasAnyProvider) {
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
      ttlMs: ERROR_CACHE_TTL_MS,
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
      metadata: { reason: "no_provider_available" },
    });

    return NextResponse.json(deterministicPayload);
  }

  const escalationThreshold = Number(process.env.AI_COACH_ESCALATE_BELOW_ENGAGEMENT || 2);
  const shouldEscalate = shouldEscalateCoachModel({
    question,
    recentPosts,
    threshold: escalationThreshold,
  });

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
  const estimatedOutputTokens = 2048;
  const estimatedCostUsd = estimateAnthropicCostUsd(
    shouldEscalate ? "claude-sonnet-4-5-20250929" : "claude-3-5-haiku-latest",
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
      ttlMs: ERROR_CACHE_TTL_MS,
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

  // ── Cognitive Memory (NON-FATAL) ──
  let memoryFragment = "";
  try {
    const ctxResult = await fetchCognitiveContextV4({
      supabase: session.supabase,
      organizationId: session.organizationId,
      platform: body.platform || null,
    });
    if (ctxResult.ok) {
      memoryFragment = buildMemoryPromptFragment(ctxResult.value, session.organizationId);
      trackMemoryAccess({ supabase: session.supabase, organizationId: session.organizationId, context: ctxResult.value }).catch(() => {});
    }
  } catch {
    // Silent
  }

  try {
    const platformContext = body.platform ? `Platform focus: ${body.platform}\n\n` : "";
    const postsContext = recentPostsContext
      ? `REAL recent posts from user's account (platform|engagement%|content excerpt):\n${recentPostsContext}\n\n`
      : "NOTE: User has NO recent posts in the database. Do NOT invent fake post data.\n\n";
    const topContext = topPostsContext
      ? `REAL top performing posts (platform|engagement%|content excerpt):\n${topPostsContext}\n\n`
      : "";

    // Build messages: system → conversation history → current question → assistant prefill
    const aiMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      {
        role: "system",
        content: `You are a senior social media strategist and coach. Analyze the user's question in the context of their ACTUAL posting history provided below. Provide actionable, data-driven recommendations.${businessContext}
${memoryFragment ? `\nCognitive memory (past performance, patterns, strategies):\n${memoryFragment}\n` : ""}

CRITICAL RULES:
1. NEVER invent patient names, stories, or fake testimonials. Only reference data from the context provided.
2. NEVER fabricate statistics (e.g., "73% of...") unless they come from the user's actual data.
3. Base ALL recommendations on the user's real posts, engagement rates, and business profile above.
4. If insufficient data is available, say so honestly — do NOT fill gaps with made-up examples.
5. Speak in Romanian (the user's language). Be direct, practical, no fluff.
6. actionItems must be plain strings — short, actionable tasks the user can do TODAY.

${JSON_FORMAT_RULES}

Return ONLY valid JSON with this exact structure:
{
  "answer": string (detailed coaching response in Romanian),
  "recommendations": [string] (3-5 specific recommendations),
  "actionItems": [string] (3-5 concrete action steps as plain strings),
  "metrics": { "currentAvgEngagement": number, "projectedImprovement": string }
}`,
      },
    ];

    // Add conversation history for multi-turn context
    for (const msg of conversationHistory) {
      aiMessages.push({ role: msg.role, content: msg.content });
    }

    // Current question with context
    aiMessages.push({
      role: "user",
      content: `${platformContext}${postsContext}${topContext}Question: ${question}`,
    });

    // Assistant prefill for JSON output
    aiMessages.push({ role: "assistant", content: "{" });

    const aiResult = await routeAICall({
      task: "coach",
      messages: aiMessages,
      maxTokens: estimatedOutputTokens,
    });

    // Prepend the opening brace used as assistant prefill
    aiResult.text = "{" + (aiResult.text || "");

    const parsed = parseAIJson(aiResult.text);

    if (!parsed || typeof parsed.answer !== "string") {
      const payload = {
        ...deterministic,
        meta: {
          mode: "deterministic",
          provider: aiResult.provider,
          model: aiResult.model,
          warning: "AI response could not be parsed. Deterministic fallback used.",
        },
      };
      return NextResponse.json(payload);
    }

    const responsePayload = {
      ...parsed,
      meta: {
        mode: "ai",
        provider: aiResult.provider,
        model: aiResult.model,
        escalated: shouldEscalate,
      },
    };

    await setIntentCache({
      supabase: session.supabase,
      organizationId: session.organizationId,
      userId: session.user.id,
      routeKey: ROUTE_KEY,
      intentHash,
      provider: aiResult.provider,
      model: aiResult.model,
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
      provider: aiResult.provider,
      model: aiResult.model,
      mode: "ai",
      inputTokens: aiResult.inputTokens || estimatedInputTokens,
      outputTokens: aiResult.outputTokens || estimatedOutputTokens,
      estimatedCostUsd,
      latencyMs: aiResult.latencyMs,
      success: true,
      metadata: {
        escalated: shouldEscalate,
        avgEngagement: averageEngagement(recentPosts),
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
      ttlMs: ERROR_CACHE_TTL_MS,
    });

    await logAIUsageEvent({
      supabase: session.supabase,
      organizationId: session.organizationId,
      userId: session.user.id,
      routeKey: ROUTE_KEY,
      intentHash,
      provider: "router",
      model: "unknown",
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
