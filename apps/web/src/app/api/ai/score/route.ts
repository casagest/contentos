import { NextRequest, NextResponse } from "next/server";
import { ContentAIService } from "@contentos/content-engine";
import type { Platform, ContentType, Language } from "@contentos/content-engine";
import { getSessionUserWithOrg } from "@/lib/auth";
import { buildOpenRouterModelChain, resolveAIProvider } from "@/lib/ai/provider";
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
  const provider = resolveAIProvider();

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

  const premiumThreshold = Number(process.env.AI_SCORE_PREMIUM_THRESHOLD || 68);
  const economyModel =
    provider.mode === "openrouter"
      ? buildOpenRouterModelChain({
          quality: "economy",
          preferred:
            process.env.AI_MODEL_SCORE_ECONOMY?.trim() ||
            process.env.AI_MODEL_SCORE?.trim() ||
            provider.model,
        })
      : process.env.AI_MODEL_SCORE_ECONOMY?.trim() ||
        process.env.AI_MODEL_SCORE?.trim() ||
        "claude-3-5-haiku-latest";
  const premiumModel =
    provider.mode === "openrouter"
      ? buildOpenRouterModelChain({
          quality: "premium",
          preferred:
            process.env.AI_MODEL_SCORE_PREMIUM?.trim() ||
            process.env.AI_MODEL_SCORE?.trim() ||
            provider.model,
        })
      : process.env.AI_MODEL_SCORE_PREMIUM?.trim() ||
        provider.model ||
        "claude-sonnet-4-5-20250929";

  const shouldEscalate = deterministic.overallScore < premiumThreshold;
  const model = shouldEscalate ? premiumModel : economyModel;

  const estimatedInputTokens = estimateTokensFromText(content) + 420;
  const estimatedOutputTokens = 700;
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

    const aiResult = await service.scoreContent({
      content,
      platform,
      contentType,
      language,
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
        deterministicScore: deterministic.overallScore,
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
      metadata: {
        fallback: "deterministic",
      },
    });

    return NextResponse.json(payload);
  }
}
