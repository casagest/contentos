import { NextRequest, NextResponse } from "next/server";
import type { Platform, Language } from "@contentos/content-engine";
import { getSessionUserWithOrg } from "@/lib/auth";
import { routeAICall } from "@/lib/ai/multi-model-router";
import { parseAIJson, JSON_FORMAT_RULES } from "@/lib/ai/parse-ai-json";
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
  fetchCognitiveContextV4,
  assessContextQuality,
  trackMemoryAccess,
} from "@/lib/ai/cognitive-memory";
import {
  buildMemoryPromptFragment,
} from "@/lib/ai/memory-sanitizer";
import {
  loadCreativeInsights,
  generateCreativeAngles,
  buildCreativeBrief,
  type Platform as CreativePlatform,
  type CreativeAngle,
} from "@/lib/ai/creative-intelligence";
import { voiceDNAToPrompt, extractVoiceDNA, type VoiceDNA } from "@/lib/ai/voice-dna";
import { fetchDiversityRules, diversityRulesToPrompt } from "@/lib/ai/cross-post-memory";

const ROUTE_KEY = "generate:v4";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const ERROR_CACHE_TTL_MS = 5 * 60 * 1000;
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

  // If it's a command (e.g. "make it shorter"), redirect to modification flow
  if (intentResult.intent === "command" && intentResult.confidence >= 0.8) {
    return NextResponse.json({
      intent: intentResult,
      platformVersions: {},
      meta: {
        mode: "command_redirect",
        message: "Ai dat o instructiune de modificare. Trimite continutul original pe care vrei sa-l modific.",
        suggestedFollowUp: "Furnizeaza textul pe care vrei sa il modific, apoi repeta instructiunea.",
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
      usps: Array.isArray(bp.usps)
        ? bp.usps.filter((u): u is string => typeof u === "string")
        : typeof bp.usps === "string" && bp.usps.trim()
          ? bp.usps.split(/[,;\n]+/).map((s: string) => s.trim()).filter(Boolean)
          : undefined,
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

  const compliance = Array.isArray((orgSettings?.businessProfile as Record<string, unknown>)?.compliance)
    ? ((orgSettings?.businessProfile as Record<string, unknown>).compliance as string[])
    : [];

  const deterministic = buildDeterministicGeneration({
    input,
    targetPlatforms: platforms,
    tone,
    includeHashtags,
    includeEmoji,
    language: deterministicLanguage,
    compliance,
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
      metadata: { reason: "no_provider_available", objective },
    });

    return NextResponse.json(deterministicPayload);
  }

  // Reuse org settings already loaded for creative brief
  const settings = orgSettings;
  let userVoiceDescription: string | undefined;
  let brandGuidelinesBlock = "";
  if (settings?.businessProfile) {
    const profile = settings.businessProfile as Record<string, unknown>;
    userVoiceDescription = typeof profile.description === "string" ? profile.description : undefined;

    const avoidPhrases = typeof profile.avoidPhrases === "string" ? profile.avoidPhrases.trim() : "";
    const preferredPhrases = typeof profile.preferredPhrases === "string" ? profile.preferredPhrases.trim() : "";
    const compliance = Array.isArray(profile.compliance)
      ? profile.compliance.filter((c): c is string => typeof c === "string").join(", ")
      : typeof profile.compliance === "string" ? profile.compliance : "";
    const bpLanguage = typeof profile.language === "string" ? profile.language : "";

    const lines: string[] = [];
    if (avoidPhrases) lines.push(`Fraze de EVITAT (nu folosi niciodata): ${avoidPhrases}`);
    if (preferredPhrases) lines.push(`Fraze PREFERATE (foloseste cand e relevant): ${preferredPhrases}`);
    if (compliance) lines.push(`Reguli de conformitate: ${compliance}`);
    if (bpLanguage) lines.push(`Limba continutului: ${bpLanguage === "ro" ? "Romana" : bpLanguage}`);
    if (lines.length) brandGuidelinesBlock = "\n" + lines.join("\n");
  }

  // Combine voice description with creative brief for genius-level output
  const enhancedVoiceDescription = [
    userVoiceDescription || "",
    brandGuidelinesBlock,
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
  const estimatedOutputTokens = Math.max(2048, Math.max(1, platforms.length) * 1500);
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
        objective,
        roiGate: roiDecision,
      },
    });

    return NextResponse.json(payload);
  }

  const startedAt = Date.now();

  // ── Cognitive Memory (NON-FATAL: failure doesn't block generation) ──
  let memoryFragment = "";
  let cognitiveTemperature: number | null = null;
  try {
    const ctxResult = await fetchCognitiveContextV4({
      supabase: session.supabase,
      organizationId: session.organizationId,
      platform: platforms[0] || null,
    });
    if (ctxResult.ok) {
      const ctx = ctxResult.value;
      memoryFragment = buildMemoryPromptFragment(ctx, session.organizationId);
      cognitiveTemperature = ctx.metacognitive.calculated_temperature ?? null;
      // Fire-and-forget: track which memories were accessed
      trackMemoryAccess({ supabase: session.supabase, organizationId: session.organizationId, context: ctx }).catch(() => {});
    }
  } catch {
    // Silent: cognitive memory is non-critical
  }

  // ── Voice DNA + Diversity Rules (NON-FATAL) ──
  let voiceDNAFragment = "";
  let diversityFragment = "";
  try {
    const { data: orgVoice } = await session.supabase
      .from("organizations")
      .select("settings")
      .eq("id", session.organizationId)
      .single();
    const voiceSettings = orgVoice?.settings as Record<string, unknown> | null;
    if (voiceSettings?.voiceDNA) {
      voiceDNAFragment = voiceDNAToPrompt(voiceSettings.voiceDNA as VoiceDNA);
    }
  } catch { /* silent */ }

  try {
    const rules = await fetchDiversityRules({
      supabase: session.supabase,
      organizationId: session.organizationId,
    });
    diversityFragment = diversityRulesToPrompt(rules);
  } catch { /* silent */ }

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

HUMANIZATION RULES (CRITICAL — follow these to produce natural, human-sounding content):
- Vary sentence length dramatically: mix 2-5 word punches with 15-25 word flowing sentences
- NEVER use these AI-ism phrases: "în concluzie", "este important de menționat", "mai mult decât atât", "haideți să explorăm", "în era digitală", "peisajul digital", "fără îndoială", "un rol crucial", "aspecte esențiale", "abordare holistică", "let's delve", "it's worth noting", "digital landscape", "furthermore", "moreover", "paradigm shift", "seamless", "leverage", "game-changer"
- Include at least one unexpected word choice or colloquial expression
- Vary paragraph lengths (1 line, then 3 lines, then 1 line)
- Use active voice, specific numbers, and concrete examples over abstractions

${voiceDNAFragment ? `\n${voiceDNAFragment}\n` : ""}
${diversityFragment ? `\n${diversityFragment}\n` : ""}
${enhancedVoiceDescription ? `Brand voice & creative brief:\n${enhancedVoiceDescription}\n` : ""}
${memoryFragment ? `Cognitive memory (past performance, patterns, strategies):\n${memoryFragment}\n` : ""}
${JSON_FORMAT_RULES}

JSON structure:
{
  "platformVersions": {
    "${platforms[0]}": {
      "text": "the post content as a single string",
      "hashtags": ["tag1", "tag2"],
      "alternativeVersions": ["version2", "version3"],
      "algorithmScore": { "overallScore": 82 }
    }
  }
}`,
        },
        {
          role: "user",
          content: `Create content about: ${input}`,
        },
        {
          role: "assistant",
          content: `{`,
        },
      ],
      maxTokens: estimatedOutputTokens,
    });

    // Prepend the opening brace that was used as assistant prefill
    aiResult.text = "{" + (aiResult.text || "");

    const parsed = parseAIJson(aiResult.text);

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
            rawFirst500: aiResult.text?.substring(0, 500) || "",
            rawLast200: aiResult.text?.substring(Math.max(0, (aiResult.text?.length || 0) - 200)) || "",
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

    // ── Record episodic memory (fire-and-forget) ──
    void Promise.resolve(
      session.supabase
        .schema("contentos")
        .from("episodic_memory")
        .insert({
          organization_id: session.organizationId,
          event_type: "content_created",
          content: {
            summary: `Generated ${platforms.join(", ")} content: "${input.slice(0, 100)}"`,
            text: input.slice(0, 500),
            platforms,
            tone,
            objective,
            score: averageScore(responsePayload.platformVersions || {}),
          },
          context: {
            platform: platforms[0],
            route: "generate",
            provider: responsePayload.meta?.provider,
            model: responsePayload.meta?.model,
          },
          importance_score: 0.6,
          decay_rate: 0.05,
        })
    ).catch(() => {});

    // ── Auto-update Voice DNA (fire-and-forget) ──
    void (async () => {
      try {
        const { data: drafts } = await session.supabase
          .from("drafts")
          .select("body")
          .eq("organization_id", session.organizationId)
          .order("created_at", { ascending: false })
          .limit(20);
        const userPosts = [
          input,
          ...(drafts || []).map((d: { body: string }) => d.body).filter(Boolean),
        ].filter((p) => typeof p === "string" && p.trim().length > 20);
        if (userPosts.length >= 3) {
          const dna = extractVoiceDNA(userPosts);
          const { data: org } = await session.supabase
            .from("organizations")
            .select("settings")
            .eq("id", session.organizationId)
            .single();
          const curSettings = (org?.settings as Record<string, unknown>) || {};
          await session.supabase
            .from("organizations")
            .update({ settings: { ...curSettings, voiceDNA: dna } })
            .eq("id", session.organizationId);
        }
      } catch { /* silent — voice DNA is non-critical */ }
    })();

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
