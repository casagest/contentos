import { NextRequest, NextResponse } from "next/server";
import type { Platform, ContentType, Language } from "@contentos/content-engine";
import { getSessionUserWithOrg } from "@/lib/auth";
import { routeAICall } from "@/lib/ai/multi-model-router";
import { buildDeterministicScore } from "@/lib/ai/deterministic";
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

const ROUTE_KEY = "score:v3";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const VALID_PLATFORMS: Platform[] = ["facebook", "instagram", "tiktok", "youtube"];

interface ScoreBody {
  content?: string;
  platform?: Platform;
  contentType?: ContentType;
  language?: Language;
}

export async function POST(request: NextRequest) {
  const session = await getSessionUserWithOrg();
  if (session instanceof NextResponse) return session;

  let body: ScoreBody;
  try {
    body = (await request.json()) as ScoreBody;
  } catch {
    return NextResponse.json({ error: "Body invalid. Trimite JSON valid." }, { status: 400 });
  }

  const content = body.content?.trim() || "";
  if (!content) {
    return NextResponse.json({ error: "Continutul nu poate fi gol." }, { status: 400 });
  }

  const platform = body.platform;
  if (!platform || !VALID_PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: "Platforma invalida." }, { status: 400 });
  }

  const contentType = (body.contentType || "text") as ContentType;
  const language = (body.language || "ro") as Language;

  // Load business profile for context-aware scoring
  let scoreBusinessContext = "";
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
      const lines = [`Business context for scoring:`];
      lines.push(`- Business: ${bpName}`);
      if (typeof bp.industry === "string") lines.push(`- Industry: ${bp.industry}`);
      if (typeof bp.targetAudience === "string" && bp.targetAudience) lines.push(`- Target audience: ${bp.targetAudience}`);
      const tones = Array.isArray(bp.tones) ? bp.tones.filter((t): t is string => typeof t === "string") : [];
      if (tones.length) lines.push(`- Tones: ${tones.join(", ")}`);
      if (typeof bp.usps === "string" && bp.usps.trim()) lines.push(`- USPs: ${bp.usps}`);
      scoreBusinessContext = "\n\n" + lines.join("\n");
    }
  }

  const deterministic = buildDeterministicScore({ content, platform, contentType });

  const intentHash = buildIntentCacheKey(ROUTE_KEY, {
    content,
    platform,
    contentType,
    language,
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
      warning: "AI indisponibil sau dezactivat. Rezultatul este calculat local.",
    },
  };

  // Check if any AI provider is available
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
      metadata: { reason: "no_provider_available" },
    });

    return NextResponse.json(deterministicPayload);
  }

  const premiumThreshold = Number(process.env.AI_SCORE_PREMIUM_THRESHOLD || 68);
  const shouldEscalate = deterministic.overallScore < premiumThreshold;

  const estimatedInputTokens = estimateTokensFromText(content) + 420;
  const estimatedOutputTokens = 700;
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
    const aiResult = await routeAICall({
      task: "score",
      messages: [
        {
          role: "system",
          content: `You are a senior social media content analyst. Score the following ${platform} ${contentType} content on a 0-100 scale. Evaluate: hook strength, clarity, CTA effectiveness, platform fit, emotional resonance, visual description quality, hashtag strategy, content length optimization, and overall engagement potential.${scoreBusinessContext}

Return ONLY valid JSON with this exact structure:
{
  "overallScore": number,
  "grade": "S"|"A"|"B"|"C"|"D"|"F",
  "metrics": [{"name": string, "score": number, "maxScore": number, "feedback": string}],
  "summary": string,
  "improvements": [string],
  "alternativeVersions": [string]
}`,
        },
        {
          role: "user",
          content: `Language: ${language}\nPlatform: ${platform}\nContent type: ${contentType}\n\nContent:\n${content}`,
        },
      ],
      maxTokens: estimatedOutputTokens,
    });

    let parsed;
    try {
      const jsonMatch = aiResult.text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      parsed = null;
    }

    // Fallback to deterministic if JSON parsing fails
    if (!parsed || typeof parsed.overallScore !== "number") {
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
        deterministicScore: deterministic.overallScore,
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
