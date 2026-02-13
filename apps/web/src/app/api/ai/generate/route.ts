import { NextRequest, NextResponse } from "next/server";
import { ContentAIService } from "@contentos/content-engine";
import type { Platform, Language } from "@contentos/content-engine";
import { getSessionUserWithOrg } from "@/lib/auth";
import { buildOpenRouterModelChain, resolveAIProvider } from "@/lib/ai/provider";
import { buildDeterministicGeneration } from "@/lib/ai/deterministic";
import {
  type AIObjective,
  buildIntentCacheKey,
  decidePaidAIAccess,
  evaluatePremiumRoiGate,
  estimateAnthropicCostUsd,
  estimateTokensFromText,
  getIntentCache,
  logAIUsageEvent,
  resolveObjectiveValueConfig,
  setIntentCache,
  withCacheMeta,
} from "@/lib/ai/governor";
import { selectBestVariantWithBandit } from "@/lib/ai/outcome-learning";

const ROUTE_KEY = "generate:v3";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const VALID_PLATFORMS: Platform[] = ["facebook", "instagram", "tiktok", "youtube"];

interface GenerateBody {
  input?: string;
  platforms?: string[];
  objective?: AIObjective;
  tone?: "professional" | "casual" | "funny" | "educational" | "inspirational";
  includeHashtags?: boolean;
  includeEmoji?: boolean;
  language?: Language;
}

interface VariantSelectionMeta {
  selectedVariant: number;
  reason: string;
  score?: number;
}

function averageScore(platformVersions: Record<string, { algorithmScore?: { overallScore: number } }>): number {
  const scores = Object.values(platformVersions)
    .map((row) => row.algorithmScore?.overallScore)
    .filter((value): value is number => typeof value === "number");

  if (!scores.length) return 0;
  return scores.reduce((sum, value) => sum + value, 0) / scores.length;
}

function estimateProjectedPremiumScore(params: {
  avgDeterministicScore: number;
  platformCount: number;
  inputChars: number;
}): number {
  const gap = Math.max(0, 85 - params.avgDeterministicScore);
  const uplift =
    4 +
    gap * 0.28 +
    params.platformCount * 1.4 +
    (params.inputChars > 900 ? 2.5 : params.inputChars > 400 ? 1.2 : 0);

  return Math.min(96, params.avgDeterministicScore + Math.min(22, uplift));
}

async function applyVariantBanditSelection(params: {
  supabase: any;
  organizationId: string;
  objective: AIObjective;
  platformVersions: Record<string, any>;
}): Promise<{
  platformVersions: Record<string, any>;
  variantSelector: Record<string, VariantSelectionMeta>;
}> {
  const nextPlatformVersions: Record<string, any> = {};
  const variantSelector: Record<string, VariantSelectionMeta> = {};

  for (const [platform, version] of Object.entries(params.platformVersions || {})) {
    const primary = typeof version?.text === "string" ? version.text.trim() : "";
    const alternatives = Array.isArray(version?.alternativeVersions)
      ? version.alternativeVersions.filter(
          (item: unknown): item is string => typeof item === "string" && item.trim().length > 0
        )
      : [];

    const candidates = [...new Set([primary, ...alternatives].map((item) => item.trim()).filter(Boolean))];

    if (candidates.length <= 1) {
      nextPlatformVersions[platform] = {
        ...version,
        text: candidates[0] || primary,
        alternativeVersions: [],
        selectedVariant: 0,
      };
      variantSelector[platform] = {
        selectedVariant: 0,
        reason: "single_variant",
      };
      continue;
    }

    const selection = await selectBestVariantWithBandit({
      supabase: params.supabase,
      organizationId: params.organizationId,
      platform: platform as "facebook" | "instagram" | "tiktok" | "youtube",
      objective: params.objective,
      variants: candidates,
    });

    const selectedIndex = Math.max(
      0,
      Math.min(selection.selectedIndex, candidates.length - 1)
    );
    const selectedText = candidates[selectedIndex] || primary;
    const selectedAlternativeVersions = candidates.filter((_, idx) => idx !== selectedIndex);
    const selectedScore = selection.scores.find((row) => row.index === selectedIndex);

    nextPlatformVersions[platform] = {
      ...version,
      text: selectedText,
      alternativeVersions: selectedAlternativeVersions,
      selectedVariant: selectedIndex,
    };
    variantSelector[platform] = {
      selectedVariant: selectedIndex,
      reason: selection.reason,
      score: selectedScore?.score,
    };
  }

  return { platformVersions: nextPlatformVersions, variantSelector };
}

export async function POST(request: NextRequest) {
  const session = await getSessionUserWithOrg();
  if (session instanceof NextResponse) return session;

  let body: GenerateBody;
  try {
    body = (await request.json()) as GenerateBody;
  } catch {
    return NextResponse.json({ error: "Body invalid. Trimite JSON valid." }, { status: 400 });
  }

  const input = body.input?.trim() || "";
  if (!input) {
    return NextResponse.json({ error: "Textul nu poate fi gol." }, { status: 400 });
  }

  const platforms = (body.platforms || []).filter((platform): platform is Platform =>
    VALID_PLATFORMS.includes(platform as Platform)
  );

  if (!platforms.length) {
    return NextResponse.json({ error: "Selecteaza cel putin o platforma valida." }, { status: 400 });
  }

  const language = (body.language || "ro") as Language;
  const deterministicLanguage = language === "en" ? "en" : "ro";
  const objective: AIObjective = body.objective || "engagement";
  const tone = body.tone || "casual";
  const includeHashtags = body.includeHashtags ?? true;
  const includeEmoji = body.includeEmoji ?? true;

  const deterministic = buildDeterministicGeneration({
    input,
    targetPlatforms: platforms,
    tone,
    includeHashtags,
    includeEmoji,
    language: deterministicLanguage,
  });

  const provider = resolveAIProvider();
  const intentHash = buildIntentCacheKey(ROUTE_KEY, {
    input,
    platforms,
    tone,
    includeHashtags,
    includeEmoji,
    language,
    objective,
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
      metadata: { source: "ai_request_cache", objective },
    });

    return NextResponse.json(withCacheMeta(cached.response, { createdAt: cached.createdAt }));
  }

  const deterministicSelected = await applyVariantBanditSelection({
    supabase: session.supabase,
    organizationId: session.organizationId,
    objective,
    platformVersions: deterministic.platformVersions as Record<string, any>,
  });

  const deterministicPayload = {
    ...deterministic,
    platformVersions: deterministicSelected.platformVersions,
    meta: {
      mode: "deterministic",
      provider: "template",
      warning: "AI indisponibil sau dezactivat. Rezultatul este generat local.",
      variantSelector: deterministicSelected.variantSelector,
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
      metadata: { reason: "provider_template_mode", objective },
    });

    return NextResponse.json(deterministicPayload);
  }

  let userVoiceDescription: string | undefined;
  const { data: org } = await session.supabase
    .from("organizations")
    .select("settings")
    .eq("id", session.organizationId)
    .single();

  const settings = org?.settings as Record<string, unknown> | null;
  if (settings?.businessProfile) {
    const profile = settings.businessProfile as { description?: string };
    userVoiceDescription = profile.description;
  }

  const avgDeterministicScore = averageScore(deterministic.platformVersions);
  const premiumThreshold = Number(process.env.AI_GENERATE_PREMIUM_THRESHOLD || 70);
  const economyModel =
    provider.mode === "openrouter"
      ? buildOpenRouterModelChain({
          quality: "economy",
          preferred:
            process.env.AI_MODEL_GENERATE_ECONOMY?.trim() ||
            process.env.AI_MODEL_GENERATE?.trim() ||
            provider.model,
        })
      : process.env.AI_MODEL_GENERATE_ECONOMY?.trim() || "claude-3-5-haiku-latest";
  const premiumModel =
    provider.mode === "openrouter"
      ? buildOpenRouterModelChain({
          quality: "premium",
          preferred:
            process.env.AI_MODEL_GENERATE_PREMIUM?.trim() ||
            process.env.AI_MODEL_GENERATE?.trim() ||
            provider.model,
        })
      : process.env.AI_MODEL_GENERATE_PREMIUM?.trim() ||
        provider.model ||
        process.env.AI_MODEL_GENERATE?.trim() ||
        "claude-sonnet-4-5-20250929";

  const estimatedInputTokens =
    estimateTokensFromText(input) +
    520 +
    Math.max(1, platforms.length) * 280 +
    estimateTokensFromText(userVoiceDescription || "");
  const estimatedOutputTokens = Math.max(1, platforms.length) * 920;
  const economyCostUsd = estimateAnthropicCostUsd(
    economyModel,
    estimatedInputTokens,
    estimatedOutputTokens
  );
  const premiumCostUsd = estimateAnthropicCostUsd(
    premiumModel,
    estimatedInputTokens,
    estimatedOutputTokens
  );

  const lowQualitySignal = avgDeterministicScore < premiumThreshold;
  const projectedPremiumScore = estimateProjectedPremiumScore({
    avgDeterministicScore,
    platformCount: platforms.length,
    inputChars: input.length,
  });
  const fallbackMinRoiMultiple =
    objective === "leads"
      ? Number(
          process.env.AI_PREMIUM_MIN_ROI_MULTIPLE_LEADS ||
            process.env.AI_PREMIUM_MIN_ROI_MULTIPLE ||
            1.8
        )
      : Number(process.env.AI_PREMIUM_MIN_ROI_MULTIPLE || 3);
  const fallbackValuePerScorePointUsd =
    objective === "leads"
      ? Number(
          process.env.AI_GENERATE_VALUE_PER_SCORE_POINT_USD_LEADS ||
            process.env.AI_GENERATE_VALUE_PER_SCORE_POINT_USD ||
            0.09
        )
      : Number(process.env.AI_GENERATE_VALUE_PER_SCORE_POINT_USD || 0.03);
  const valueConfig = await resolveObjectiveValueConfig({
    supabase: session.supabase,
    organizationId: session.organizationId,
    objective,
    organizationSettings: settings,
    fallbackMinRoiMultiple,
    fallbackValuePerScorePointUsd,
  });
  const roiDecision = evaluatePremiumRoiGate({
    baselineScore: avgDeterministicScore,
    projectedPremiumScore,
    economyCostUsd,
    premiumCostUsd,
    objective,
    minRoiMultiple: valueConfig.minRoiMultiple,
    valuePerScorePointUsd: valueConfig.valuePerScorePointUsd,
  });

  const shouldEscalate = lowQualitySignal && roiDecision.shouldEscalate;
  const model = shouldEscalate ? premiumModel : economyModel;
  const estimatedCostUsd = shouldEscalate ? premiumCostUsd : economyCostUsd;

  const budget = await decidePaidAIAccess({
    supabase: session.supabase,
    organizationId: session.organizationId,
    estimatedAdditionalCostUsd: estimatedCostUsd,
    organizationSettings: settings,
  });

  if (!budget.allowed) {
    const payload = {
      ...deterministicPayload,
      meta: {
        ...(deterministicPayload.meta || {}),
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
        objective,
        roiGate: roiDecision,
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

    const aiResult = await service.generateContent({
      organizationId: session.organizationId,
      input,
      inputType: "text",
      targetPlatforms: platforms,
      language,
      tone,
      includeHashtags,
      includeEmoji,
      userVoiceDescription,
    });
    const resolvedModel = service.getLastResolvedModel() || model;
    const aiSelected = await applyVariantBanditSelection({
      supabase: session.supabase,
      organizationId: session.organizationId,
      objective,
      platformVersions: aiResult.platformVersions as Record<string, any>,
    });

    const responsePayload = {
      ...aiResult,
      platformVersions: aiSelected.platformVersions,
      meta: {
        mode: "ai",
        provider: provider.mode,
        model: resolvedModel,
        modelChain: provider.mode === "openrouter" ? model : undefined,
        escalated: shouldEscalate,
        objective,
        objectiveValueConfig: valueConfig,
        roiGate: roiDecision,
        variantSelector: aiSelected.variantSelector,
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
        avgDeterministicScore,
        objective,
        lowQualitySignal,
        projectedPremiumScore,
        modelChain: provider.mode === "openrouter" ? model : undefined,
        objectiveValueConfig: valueConfig,
        roiGate: roiDecision,
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
      ...deterministicPayload,
      meta: {
        ...(deterministicPayload.meta || {}),
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
        objective,
        objectiveValueConfig: valueConfig,
        roiGate: roiDecision,
      },
    });

    return NextResponse.json(payload);
  }
}
