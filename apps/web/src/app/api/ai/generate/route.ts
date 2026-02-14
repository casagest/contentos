import { NextRequest, NextResponse } from "next/server";
import type { Platform, Language } from "@contentos/content-engine";
import { getSessionUserWithOrg } from "@/lib/auth";
import { routeAICall } from "@/lib/ai/multi-model-router";
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
import { classifyIntent } from "@/lib/ai/intent-classifier";
import {
  loadCreativeInsights,
  generateCreativeAngles,
  buildCreativeBrief,
  type Platform as CreativePlatform,
  type CreativeAngle,
} from "@/lib/ai/creative-intelligence";

const ROUTE_KEY = "generate:v4";
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
  /** When set, skip angle exploration and generate directly */
  selectedAngleId?: string;
  /** Request creative angles without generating content */
  exploreOnly?: boolean;
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

  // --- Intent Classification ---
  const intentResult = classifyIntent(input);

  // If it's a question, respond helpfully instead of generating content
  if (intentResult.intent === "question" && intentResult.confidence >= 0.75) {
    return NextResponse.json({
      intent: intentResult,
      platformVersions: {},
      meta: {
        mode: "intent_redirect",
        message: "Ai pus o intrebare. Vrei sa raspundem la ea, sau sa cream continut pe aceasta tema?",
        suggestedFollowUp: intentResult.suggestedFollowUp,
      },
    });
  }

  // If it's vague, ask for clarification
  if (intentResult.intent === "vague_idea" && intentResult.confidence >= 0.65) {
    return NextResponse.json({
      intent: intentResult,
      platformVersions: {},
      meta: {
        mode: "clarification_needed",
        message: intentResult.clarificationNeeded || "Am nevoie de mai mult context. Pentru cine e continutul? Ce obiectiv ai?",
        suggestedFollowUp: intentResult.suggestedFollowUp,
      },
    });
  }

  // --- Creative Intelligence: Explore Phase ---
  const primaryPlatform = platforms[0] as CreativePlatform;
  const insights = await loadCreativeInsights({
    supabase: session.supabase,
    organizationId: session.organizationId,
    platform: primaryPlatform,
    objective,
  });

  const creativeAngles = generateCreativeAngles({
    input,
    platform: primaryPlatform,
    objective,
    insights,
    tone,
  });

  // If exploreOnly, return angles without generating content
  if (body.exploreOnly) {
    return NextResponse.json({
      intent: intentResult,
      angles: creativeAngles,
      insights: {
        topPerformers: insights.filter((i) => i.rank === "top").slice(0, 3),
        underexplored: insights.filter((i) => i.rank === "untested").slice(0, 3),
      },
      meta: { mode: "explore", platform: primaryPlatform, objective },
    });
  }

  // Build creative brief for selected angle or best angle
  const selectedAngle = body.selectedAngleId
    ? creativeAngles.find((a) => a.id === body.selectedAngleId) || creativeAngles[0]
    : creativeAngles[0];

  // Load business profile for creative brief
  let businessProfileForBrief: Parameters<typeof buildCreativeBrief>[0]["businessProfile"];
  const { data: orgForBrief } = await session.supabase
    .from("organizations")
    .select("settings")
    .eq("id", session.organizationId)
    .single();

  const orgSettings = orgForBrief?.settings as Record<string, unknown> | null;
  if (orgSettings?.businessProfile) {
    const bp = orgSettings.businessProfile as Record<string, unknown>;
    businessProfileForBrief = {
      name: typeof bp.name === "string" ? bp.name : undefined,
      description: typeof bp.description === "string" ? bp.description : undefined,
      industry: typeof bp.industry === "string" ? bp.industry : undefined,
      tones: Array.isArray(bp.tones) ? bp.tones.filter((t): t is string => typeof t === "string") : undefined,
      targetAudience: typeof bp.targetAudience === "string" ? bp.targetAudience : undefined,
      usps: Array.isArray(bp.usps) ? bp.usps.filter((u): u is string => typeof u === "string") : undefined,
    };
  }

  const creativeBrief = buildCreativeBrief({
    input,
    platform: primaryPlatform,
    objective,
    angles: selectedAngle ? [selectedAngle] : creativeAngles.slice(0, 2),
    insights,
    businessProfile: businessProfileForBrief,
  });

  const deterministic = buildDeterministicGeneration({
    input,
    targetPlatforms: platforms,
    tone,
    includeHashtags,
    includeEmoji,
    language: deterministicLanguage,
  });

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
      metadata: { reason: "no_provider_available", objective },
    });

    return NextResponse.json(deterministicPayload);
  }

  // Reuse org settings already loaded for creative brief
  const settings = orgSettings;
  let userVoiceDescription: string | undefined;
  if (settings?.businessProfile) {
    const profile = settings.businessProfile as { description?: string };
    userVoiceDescription = profile.description;
  }

  // Combine voice description with creative brief for genius-level output
  const enhancedVoiceDescription = [
    userVoiceDescription || "",
    "",
    creativeBrief.creativeBriefPrompt,
  ].filter(Boolean).join("\n");

  const avgDeterministicScore = averageScore(deterministic.platformVersions);
  const premiumThreshold = Number(process.env.AI_GENERATE_PREMIUM_THRESHOLD || 70);
  const economyModelRef = "claude-3-5-haiku-latest";
  const premiumModelRef = "claude-sonnet-4-5-20250929";

  const estimatedInputTokens =
    estimateTokensFromText(input) +
    520 +
    Math.max(1, platforms.length) * 280 +
    estimateTokensFromText(userVoiceDescription || "");
  const estimatedOutputTokens = Math.max(1, platforms.length) * 920;
  const economyCostUsd = estimateAnthropicCostUsd(
    economyModelRef,
    estimatedInputTokens,
    estimatedOutputTokens
  );
  const premiumCostUsd = estimateAnthropicCostUsd(
    premiumModelRef,
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
    learningScope: { draftSource: "ai_generated" },
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
    const platformsList = platforms.join(", ");
    const hashtagInstruction = includeHashtags ? "Include relevant hashtags." : "Do NOT include hashtags.";
    const emojiInstruction = includeEmoji ? "Include emojis where appropriate." : "Do NOT include emojis.";

    const aiResult = await routeAICall({
      task: "generate",
      messages: [
        {
          role: "system",
          content: `You are a world-class social media content creator. Generate engaging content for the following platforms: ${platformsList}.

Language: ${language}
Tone: ${tone}
${hashtagInstruction}
${emojiInstruction}

${enhancedVoiceDescription ? `Brand voice & creative brief:\n${enhancedVoiceDescription}\n` : ""}
Return ONLY valid JSON with this exact structure:
{
  "platformVersions": {
    "${platforms[0]}": {
      "text": string,
      "hashtags": [string],
      "alternativeVersions": [string],
      "algorithmScore": { "overallScore": number }
    }
    // ... one entry per platform
  }
}`,
        },
        {
          role: "user",
          content: `Create content about: ${input}`,
        },
      ],
      maxTokens: estimatedOutputTokens,
    });

    let parsed;
    try {
      // Step 1: Strip markdown code blocks if present
      let cleanText = aiResult.text;
      const codeBlockMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        cleanText = codeBlockMatch[1].trim();
      }

      // Step 1b: If text starts with a key (no outer braces), wrap in {}
      const trimmedText = cleanText.trimStart();
      if (trimmedText.startsWith("\"") && trimmedText.includes("\"platformVersions\"")) {
        cleanText = "{ " + cleanText + " }";
      }

      // Step 2: Try direct parse first (cleanest path)
      try {
        parsed = JSON.parse(cleanText);
      } catch {
        // Step 3: Extract JSON object with balanced braces
        const jsonStart = cleanText.indexOf("{");
        if (jsonStart !== -1) {
          let depth = 0;
          let jsonEnd = -1;
          let inString = false;
          let escapeNext = false;
          
          for (let i = jsonStart; i < cleanText.length; i++) {
            const char = cleanText[i];
            
            if (escapeNext) {
              escapeNext = false;
              continue;
            }
            
            if (char === '\\') {
              escapeNext = true;
              continue;
            }
            
            if (char === '"') {
              inString = !inString;
              continue;
            }
            
            if (!inString) {
              if (char === "{") depth++;
              else if (char === "}") {
                depth--;
                if (depth === 0) { jsonEnd = i; break; }
              }
            }
          }
          
          if (jsonEnd !== -1) {
            parsed = JSON.parse(cleanText.substring(jsonStart, jsonEnd + 1));
          }
        }
      }
    } catch {
      parsed = null;
    }

    if (!parsed || !parsed.platformVersions) {
      const payload = {
        ...deterministicPayload,
        meta: {
          ...(deterministicPayload.meta || {}),
          provider: aiResult.provider,
          model: aiResult.model,
          warning: "AI response could not be parsed. Deterministic fallback used.",
          debug: {
            rawLength: aiResult.text?.length || 0,
            rawPreview: aiResult.text?.substring(0, 500) || "",
            parsedKeys: parsed ? Object.keys(parsed) : null,
          },
        },
      };
      return NextResponse.json(payload);
    }

    const aiSelected = await applyVariantBanditSelection({
      supabase: session.supabase,
      organizationId: session.organizationId,
      objective,
      platformVersions: parsed.platformVersions as Record<string, any>,
    });

    const responsePayload = {
      ...parsed,
      platformVersions: aiSelected.platformVersions,
      intent: intentResult,
      angles: creativeAngles,
      selectedAngle: selectedAngle || null,
      meta: {
        mode: "ai",
        provider: aiResult.provider,
        model: aiResult.model,
        escalated: shouldEscalate,
        objective,
        objectiveValueConfig: valueConfig,
        roiGate: roiDecision,
        variantSelector: aiSelected.variantSelector,
        creativeBrief: {
          topPerformers: creativeBrief.topPerformers.length,
          avoidPatterns: creativeBrief.avoidPatterns.length,
          anglesGenerated: creativeAngles.length,
        },
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
        avgDeterministicScore,
        objective,
        lowQualitySignal,
        projectedPremiumScore,
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
      provider: "router",
      model: "unknown",
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
