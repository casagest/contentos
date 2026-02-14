import { NextRequest, NextResponse } from "next/server";
import { getSessionUserWithOrg } from "@/lib/auth";
import { scrapeUrlContent } from "@/lib/scrape";
import { expiresAtIso, hashUrl, SCRAPE_CACHE_TTL_MS } from "@/lib/url-cache";
import { routeAICall, resolveEffectiveProvider } from "@/lib/ai/multi-model-router";
import { buildDeterministicBrainDump } from "@/lib/ai/deterministic";
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
import type { BusinessProfile } from "@contentos/database";
import {
  classifyIntent,
  type IntentClassification,
} from "@/lib/ai/intent-classifier";
import {
  processBrainDumpInput,
  buildBrainDumpAnswerSystemPrompt,
  buildEnrichedGenerationPrompt,
  type ConversationMessage,
} from "@/lib/ai/braindump-coach";
import {
  loadCreativeInsights,
  generateCreativeAngles,
  buildCreativeBrief,
  type Platform as CreativePlatform,
} from "@/lib/ai/creative-intelligence";

const URL_REGEX = /https?:\/\/[^\s)>\]"']+/g;
const MAX_URLS = 3;
const FETCH_TIMEOUT_MS = 10_000;
const VALID_PLATFORMS = ["facebook", "instagram", "tiktok", "youtube"] as const;
const ROUTE_KEY = "braindump:v4";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type BrainDumpPlatform = (typeof VALID_PLATFORMS)[number];
type Language = "ro" | "en";
type QualityMode = "economy" | "balanced" | "premium";

interface BrainDumpRequest {
  rawInput?: string;
  platforms?: string[];
  language?: Language;
  qualityMode?: QualityMode;
  objective?: AIObjective;
  /** Conversation history for multi-turn mode */
  conversationHistory?: ConversationMessage[];
  /** Whether to use conversational mode with intent detection */
  conversationMode?: boolean;
}

interface SessionContext {
  supabase: any;
  organizationId: string;
  userId: string;
}

function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX);
  if (!matches) return [];
  return [...new Set(matches)].slice(0, MAX_URLS);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function estimateMaxTokens(params: {
  platformCount: number;
  inputChars: number;
  urlChars: number;
  qualityMode: QualityMode;
}): number {
  const baseByMode: Record<QualityMode, number> = {
    economy: 2400,
    balanced: 3600,
    premium: 5200,
  };

  const perPlatformByMode: Record<QualityMode, number> = {
    economy: 550,
    balanced: 850,
    premium: 1100,
  };

  const contextBudget = Math.min(1400, Math.floor((params.inputChars + params.urlChars) / 9));
  const raw =
    baseByMode[params.qualityMode] +
    params.platformCount * perPlatformByMode[params.qualityMode] +
    contextBudget;

  return Math.max(2000, Math.min(8192, raw));
}

function parseModelJson(rawText: string): Record<string, unknown> {
  let text = rawText.trim();

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    text = fenced[1].trim();
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    // continue
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = text.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate) as Record<string, unknown>;
    } catch {
      // continue
    }

    // repair by closing unbalanced braces/brackets
    let repaired = candidate;
    const openBraces = (repaired.match(/\{/g) || []).length;
    const closeBraces = (repaired.match(/\}/g) || []).length;
    const openBrackets = (repaired.match(/\[/g) || []).length;
    const closeBrackets = (repaired.match(/\]/g) || []).length;

    for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += "]";
    for (let i = 0; i < openBraces - closeBraces; i++) repaired += "}";

    return JSON.parse(repaired) as Record<string, unknown>;
  }

  throw new Error("No JSON object found in model response.");
}

function sanitizePlatforms(
  payload: Record<string, unknown>,
  requestedPlatforms: BrainDumpPlatform[]
): Record<string, unknown> {
  const rawPlatforms =
    typeof payload.platforms === "object" && payload.platforms !== null
      ? (payload.platforms as Record<string, unknown>)
      : payload;

  const normalized: Record<string, unknown> = {};

  for (const platform of requestedPlatforms) {
    const row = rawPlatforms[platform];
    if (typeof row !== "object" || row === null) continue;
    const source = row as Record<string, unknown>;

    if (platform === "facebook") {
      normalized.facebook = {
        content: asString(source.content) || "",
        hashtags: asStringArray(source.hashtags),
        estimatedEngagement: asString(source.estimatedEngagement) || "Medium",
        tips: asStringArray(source.tips),
      };
      continue;
    }

    if (platform === "instagram") {
      normalized.instagram = {
        caption: asString(source.caption) || asString(source.content) || "",
        hashtags: asStringArray(source.hashtags),
        altText: asString(source.altText) || "",
        bestTimeToPost: asString(source.bestTimeToPost) || "",
        tips: asStringArray(source.tips),
      };
      continue;
    }

    if (platform === "tiktok") {
      normalized.tiktok = {
        hook: asString(source.hook) || "",
        script: asString(source.script) || asString(source.content) || "",
        hashtags: asStringArray(source.hashtags),
        soundSuggestion: asString(source.soundSuggestion) || "",
        tips: asStringArray(source.tips),
      };
      continue;
    }

    if (platform === "youtube") {
      normalized.youtube = {
        title: asString(source.title) || "",
        description: asString(source.description) || asString(source.content) || "",
        tags: asStringArray(source.tags),
        thumbnailIdea: asString(source.thumbnailIdea) || "",
        tips: asStringArray(source.tips),
      };
    }
  }

  return normalized;
}

function buildBusinessContextPrompt(profile: BusinessProfile | null): string {
  if (!profile) return "";

  const lines = [
    "BUSINESS_CONTEXT:",
    `- Name: ${profile.name}`,
    `- Industry: ${profile.industry}`,
    `- Description: ${profile.description}`,
    `- Target audience: ${profile.targetAudience}`,
    `- Tone: ${profile.tones.join(", ")}`,
    `- USP: ${profile.usps}`,
  ];

  if (profile.preferredPhrases) {
    lines.push(`- Preferred phrases: ${profile.preferredPhrases}`);
  }

  if (profile.avoidPhrases) {
    lines.push(`- Avoid phrases: ${profile.avoidPhrases}`);
  }

  if (profile.compliance.includes("cmsr_2025")) {
    lines.push("- Compliance: CMSR_2025 strict mode (no absolute claims, no guaranteed results).");
  }

  if (profile.compliance.includes("anaf")) {
    lines.push("- Compliance: ANAF awareness for financial statements.");
  }

  return `${lines.join("\n")}\n`;
}

function buildSystemPrompt(params: {
  platforms: BrainDumpPlatform[];
  businessProfile: BusinessProfile | null;
  language: Language;
  qualityMode: QualityMode;
}): string {
  const businessContext = buildBusinessContextPrompt(params.businessProfile);

  return [
    "You are a senior social media strategist for Romanian market brands.",
    "Turn raw thoughts into high-performing platform-native drafts.",
    "",
    businessContext,
    `QUALITY_MODE: ${params.qualityMode}`,
    `TARGET_LANGUAGE: ${params.language === "en" ? "English" : "Romanian with correct diacritics"}`,
    `TARGET_PLATFORMS: ${params.platforms.join(", ")}`,
    "",
    "STRICT_RULES:",
    "1) Use only user-provided facts and URL context. Do not invent claims.",
    "2) Return strict JSON only, no markdown, no prose outside JSON.",
    "3) Generate only requested platforms.",
    "4) Keep hooks practical and clear. Include CTA and platform-specific hashtags/tags.",
    "5) If medical/dental context exists, avoid absolute claims and guaranteed outcomes.",
    "",
    "JSON_SCHEMA:",
    "{",
    '  "platforms": {',
    '    "facebook": { "content": "", "hashtags": [""], "estimatedEngagement": "Low|Medium|High|Viral Potential", "tips": [""] },',
    '    "instagram": { "caption": "", "hashtags": [""], "altText": "", "bestTimeToPost": "", "tips": [""] },',
    '    "tiktok": { "hook": "", "script": "", "hashtags": [""], "soundSuggestion": "", "tips": [""] },',
    '    "youtube": { "title": "", "description": "", "tags": [""], "thumbnailIdea": "", "tips": [""] }',
    "  }",
    "}",
  ]
    .filter(Boolean)
    .join("\n");
}

function selectModelForCostEstimate(qualityMode: QualityMode): string {
  if (qualityMode === "economy")
    return process.env.BRAINDUMP_MODEL_ECONOMY?.trim() || "claude-3-5-haiku-latest";
  if (qualityMode === "premium")
    return process.env.BRAINDUMP_MODEL_PREMIUM?.trim() || "claude-sonnet-4-5-20250929";
  return process.env.BRAINDUMP_MODEL_BALANCED?.trim() || "claude-sonnet-4-5-20250929";
}

function normalizeQualityMode(value?: string): QualityMode {
  if (value === "premium") return "premium";
  if (value === "balanced") return "balanced";
  if (value === "economy") return "economy";

  const envDefault = process.env.BRAINDUMP_DEFAULT_QUALITY?.trim().toLowerCase();
  if (envDefault === "premium") return "premium";
  if (envDefault === "balanced") return "balanced";
  return "economy";
}

function decideEscalation(params: {
  qualityMode: QualityMode;
  rawInput: string;
  urlContextChars: number;
  platformCount: number;
}): boolean {
  if (params.qualityMode === "premium") return false;

  const threshold = Number(process.env.AI_BRAINDUMP_PREMIUM_THRESHOLD || 5200);
  const complexityScore =
    params.rawInput.length + params.urlContextChars + params.platformCount * 900;

  return complexityScore >= threshold;
}

function effectiveQualityMode(params: {
  requested: QualityMode;
  escalated: boolean;
}): QualityMode {
  if (params.requested === "premium") return "premium";
  if (!params.escalated) return params.requested;
  return params.requested === "economy" ? "balanced" : "premium";
}

function estimateBaselineScore(params: {
  rawInputChars: number;
  urlContextChars: number;
  platformCount: number;
  qualityMode: QualityMode;
}): number {
  const qualityBias =
    params.qualityMode === "premium"
      ? 4
      : params.qualityMode === "balanced"
        ? 0
        : -4;

  const base =
    52 +
    params.rawInputChars / 180 +
    params.urlContextChars / 800 +
    params.platformCount * 4 +
    qualityBias;

  return Math.min(90, Math.max(35, base));
}

function estimateProjectedPremiumScore(params: {
  baselineScore: number;
  urlContextChars: number;
  platformCount: number;
}): number {
  const uplift =
    4 +
    params.platformCount * 2.1 +
    Math.min(7, params.urlContextChars / 900) +
    Math.max(0, (78 - params.baselineScore) * 0.15);

  return Math.min(96, params.baselineScore + Math.min(18, uplift));
}

async function fetchUrlContent(
  url: string,
  context: SessionContext
): Promise<{ url: string; content: string } | null> {
  const urlHash = hashUrl(url);

  try {
    const { data: cached } = await context.supabase
      .from("scrape_cache")
      .select("url,content")
      .eq("organization_id", context.organizationId)
      .eq("url_hash", urlHash)
      .gt("expires_at", new Date().toISOString())
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const cachedRow = cached as { url: string; content: string } | null;
    if (cachedRow?.content) {
      return {
        url: cachedRow.url,
        content: cachedRow.content.slice(0, 5000),
      };
    }
  } catch {
    // continue with live scrape
  }

  const scraped = await scrapeUrlContent(url, {
    maxChars: 5000,
    minChars: 50,
    timeoutMs: FETCH_TIMEOUT_MS,
  });

  if (!scraped) return null;

  try {
    await context.supabase.from("scrape_cache").upsert(
      {
        organization_id: context.organizationId,
        created_by: context.userId,
        url: scraped.url,
        url_hash: urlHash,
        source: scraped.source,
        title: scraped.title ?? null,
        description: scraped.description ?? null,
        content: scraped.content,
        metadata: {
          language: scraped.language ?? null,
          links: scraped.links ?? [],
        },
        fetched_at: new Date().toISOString(),
        expires_at: expiresAtIso(SCRAPE_CACHE_TTL_MS),
      },
      { onConflict: "organization_id,url_hash" }
    );
  } catch {
    // best effort cache
  }

  return {
    url: scraped.url,
    content: scraped.content,
  };
}

export async function POST(request: NextRequest) {
  const session = await getSessionUserWithOrg();
  if (session instanceof NextResponse) return session;

  let body: BrainDumpRequest;
  try {
    body = (await request.json()) as BrainDumpRequest;
  } catch {
    return NextResponse.json({ error: "Body invalid. Trimite JSON valid." }, { status: 400 });
  }

  const rawInput = body.rawInput?.trim() || "";
  if (!rawInput) {
    return NextResponse.json({ error: "Textul nu poate fi gol." }, { status: 400 });
  }

  const requestedPlatforms = (body.platforms || []).filter(
    (platform): platform is BrainDumpPlatform =>
      VALID_PLATFORMS.includes(platform as BrainDumpPlatform)
  );

  if (!requestedPlatforms.length) {
    return NextResponse.json({ error: "Selecteaza cel putin o platforma valida." }, { status: 400 });
  }

  const language: Language = body.language === "en" ? "en" : "ro";
  const qualityMode = normalizeQualityMode(body.qualityMode);
  const objective: AIObjective = body.objective || "engagement";

  // --- Conversational Intent Detection ---
  if (body.conversationMode !== false) {
    const coachResult = processBrainDumpInput({
      input: rawInput,
      conversationHistory: body.conversationHistory || [],
      platforms: requestedPlatforms,
    });

    // If it's a question, return a conversational response asking for AI to answer
    if (coachResult.action === "answer") {
      // Use multi-model router to answer with the best available provider
      try {
        const answerConfig = resolveEffectiveProvider("braindump");
        // Check if any provider is available
        const hasProvider = (() => {
          const keys = [
            process.env.ANTHROPIC_API_KEY,
            process.env.OPENAI_API_KEY,
            process.env.GOOGLE_AI_API_KEY,
            process.env.OPENROUTER_API_KEY,
          ];
          return keys.some((k) => k?.trim());
        })();

        if (!hasProvider) {
          return NextResponse.json({
            type: "conversation",
            action: "answer",
            intent: coachResult.intent,
            messages: [
              ...coachResult.messages,
              {
                id: `msg_${Date.now()}_answer`,
                role: "assistant",
                content: "Buna intrebare! Din pacate, nu am acces la AI in acest moment pentru a-ti raspunde. Dar poti reformula ca idee de continut si o transform in postari!",
              },
            ],
          });
        }

        const aiResult = await routeAICall({
          task: "braindump",
          messages: [
            { role: "system", content: buildBrainDumpAnswerSystemPrompt() },
            { role: "user", content: rawInput },
          ],
          maxTokens: 1200,
        });

        return NextResponse.json({
          type: "conversation",
          action: "answer",
          intent: coachResult.intent,
          messages: [
            ...coachResult.messages,
            {
              id: `msg_${Date.now()}_answer`,
              role: "assistant",
              content: aiResult.text,
            },
          ],
          meta: { provider: aiResult.provider, model: aiResult.model },
        });
      } catch {
        return NextResponse.json({
          type: "conversation",
          action: "answer",
          intent: coachResult.intent,
          messages: [
            ...coachResult.messages,
            {
              id: `msg_${Date.now()}_answer`,
              role: "assistant",
              content: "Am inteles intrebarea ta, dar am intampinat o eroare. Reformuleaz-o ca idee de continut si o transform in postari!",
            },
          ],
        });
      }
    }

    // If it's vague, return clarification questions
    if (coachResult.action === "clarify") {
      return NextResponse.json({
        type: "conversation",
        action: "clarify",
        intent: coachResult.intent,
        messages: coachResult.messages,
        clarifications: coachResult.clarifications,
      });
    }

    // If enriched, use the enriched input for generation
    if (coachResult.action === "enriched_generate" && coachResult.enrichedInput) {
      // Continue with generation but use enriched input
      // rawInput stays the same for cache key, but we'll add context to the prompt
    }
  }
  // --- End Intent Detection ---

  let businessProfile: BusinessProfile | null = null;
  const { data: org } = await session.supabase
    .from("organizations")
    .select("settings")
    .eq("id", session.organizationId)
    .single();

  const settings = org?.settings as Record<string, unknown> | null;
  if (settings?.businessProfile) {
    businessProfile = settings.businessProfile as BusinessProfile;
  }

  // --- Creative Intelligence Integration ---
  const primaryPlatform = requestedPlatforms[0] as CreativePlatform;
  const creativeInsights = await loadCreativeInsights({
    supabase: session.supabase,
    organizationId: session.organizationId,
    platform: primaryPlatform,
    objective,
  });

  const creativeAngles = generateCreativeAngles({
    input: rawInput,
    platform: primaryPlatform,
    objective,
    insights: creativeInsights,
  });

  const creativeBrief = buildCreativeBrief({
    input: rawInput,
    platform: primaryPlatform,
    objective,
    angles: creativeAngles.slice(0, 2),
    insights: creativeInsights,
    businessProfile: businessProfile
      ? {
          name: businessProfile.name,
          description: businessProfile.description,
          industry: businessProfile.industry,
          tones: businessProfile.tones,
          targetAudience: businessProfile.targetAudience,
          usps: Array.isArray(businessProfile.usps) ? businessProfile.usps : [],
        }
      : undefined,
  });
  // --- End Creative Intelligence ---

  const urls = extractUrls(rawInput);
  const urlResults =
    urls.length > 0
      ? await Promise.all(
          urls.map((url) =>
            fetchUrlContent(url, {
              supabase: session.supabase,
              organizationId: session.organizationId,
              userId: session.user.id,
            })
          )
        )
      : [];

  const fetchedUrls = urlResults.filter(
    (result): result is { url: string; content: string } => result !== null
  );

  const urlContext = fetchedUrls
    .map((result) => `SOURCE: ${result.url}\n${result.content}`)
    .join("\n\n---\n\n");

  const hasAnyProvider = [
    process.env.ANTHROPIC_API_KEY,
    process.env.OPENAI_API_KEY,
    process.env.GOOGLE_AI_API_KEY,
    process.env.OPENROUTER_API_KEY,
  ].some((k) => k?.trim());

  const deterministicFallback = (warning?: string) =>
    buildDeterministicBrainDump({
      rawInput: rawInput + (urlContext ? `\n\n${urlContext}` : ""),
      platforms: requestedPlatforms,
      language,
      warning,
    });

  const urlHashes = urls.map((url) => hashUrl(url));
  const intentHash = buildIntentCacheKey(ROUTE_KEY, {
    rawInput,
    platforms: requestedPlatforms,
    language,
    qualityMode,
    objective,
    urlHashes,
    version: 4,
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

  const deterministicPayload = deterministicFallback(
    "AI disabled or unavailable, deterministic mode used."
  );

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

  const escalated = decideEscalation({
    qualityMode,
    rawInput,
    urlContextChars: urlContext.length,
    platformCount: requestedPlatforms.length,
  });

  const baseQualityMode = qualityMode;
  const escalatedQualityMode = effectiveQualityMode({ requested: qualityMode, escalated: true });
  const baseModel = selectModelForCostEstimate(baseQualityMode);
  const premiumModel = selectModelForCostEstimate("premium");

  const baseMaxTokens = estimateMaxTokens({
    platformCount: requestedPlatforms.length,
    inputChars: rawInput.length,
    urlChars: urlContext.length,
    qualityMode: baseQualityMode,
  });
  const premiumMaxTokens = estimateMaxTokens({
    platformCount: requestedPlatforms.length,
    inputChars: rawInput.length,
    urlChars: urlContext.length,
    qualityMode: escalatedQualityMode,
  });

  const baseSystemPromptRaw = buildSystemPrompt({
    platforms: requestedPlatforms,
    businessProfile,
    language,
    qualityMode: baseQualityMode,
  });
  const premiumSystemPromptRaw = buildSystemPrompt({
    platforms: requestedPlatforms,
    businessProfile,
    language,
    qualityMode: escalatedQualityMode,
  });

  // Inject creative brief into system prompts
  const creativeSuffix = creativeBrief.creativeBriefPrompt
    ? `\n\n--- CREATIVE INTELLIGENCE BRIEF ---\n${creativeBrief.creativeBriefPrompt}`
    : "";
  const baseSystemPrompt = baseSystemPromptRaw + creativeSuffix;
  const premiumSystemPrompt = premiumSystemPromptRaw + creativeSuffix;

  const userMessage = [
    `RAW_INPUT:\n"""${rawInput.slice(0, 5000)}"""`,
    urlContext ? `URL_CONTEXT:\n"""${urlContext.slice(0, 9000)}"""` : "",
    `TARGET_PLATFORMS: ${requestedPlatforms.join(", ")}`,
    "Return strict JSON only.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const baseInputTokens =
    estimateTokensFromText(rawInput) +
    estimateTokensFromText(urlContext) +
    estimateTokensFromText(baseSystemPrompt) +
    240;
  const premiumInputTokens =
    estimateTokensFromText(rawInput) +
    estimateTokensFromText(urlContext) +
    estimateTokensFromText(premiumSystemPrompt) +
    240;
  const baseOutputTokens = Math.round(baseMaxTokens * 0.72);
  const premiumOutputTokens = Math.round(premiumMaxTokens * 0.72);

  const baseCostUsd = estimateAnthropicCostUsd(
    baseModel,
    baseInputTokens,
    baseOutputTokens
  );
  const premiumCostUsd = estimateAnthropicCostUsd(
    premiumModel,
    premiumInputTokens,
    premiumOutputTokens
  );

  const baselineScore = estimateBaselineScore({
    rawInputChars: rawInput.length,
    urlContextChars: urlContext.length,
    platformCount: requestedPlatforms.length,
    qualityMode: baseQualityMode,
  });
  const projectedPremiumScore = estimateProjectedPremiumScore({
    baselineScore,
    urlContextChars: urlContext.length,
    platformCount: requestedPlatforms.length,
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
          process.env.AI_BRAINDUMP_VALUE_PER_SCORE_POINT_USD_LEADS ||
            process.env.AI_BRAINDUMP_VALUE_PER_SCORE_POINT_USD ||
            0.11
        )
      : Number(process.env.AI_BRAINDUMP_VALUE_PER_SCORE_POINT_USD || 0.035);
  const valueConfig = await resolveObjectiveValueConfig({
    supabase: session.supabase,
    organizationId: session.organizationId,
    objective,
    organizationSettings: settings,
    fallbackMinRoiMultiple,
    fallbackValuePerScorePointUsd,
    learningScope: { draftSource: "braindump" },
  });
  const roiDecision = evaluatePremiumRoiGate({
    baselineScore,
    projectedPremiumScore,
    economyCostUsd: baseCostUsd,
    premiumCostUsd,
    objective,
    minRoiMultiple: valueConfig.minRoiMultiple,
    valuePerScorePointUsd: valueConfig.valuePerScorePointUsd,
  });

  const shouldEscalate = escalated && roiDecision.shouldEscalate;
  const tunedQualityMode = shouldEscalate ? escalatedQualityMode : baseQualityMode;
  const model = shouldEscalate ? premiumModel : baseModel;
  const maxTokens = shouldEscalate ? premiumMaxTokens : baseMaxTokens;
  const systemPrompt = shouldEscalate ? premiumSystemPrompt : baseSystemPrompt;
  const estimatedInputTokens = shouldEscalate ? premiumInputTokens : baseInputTokens;
  const estimatedOutputTokens = shouldEscalate ? premiumOutputTokens : baseOutputTokens;
  const estimatedCostUsd = shouldEscalate ? premiumCostUsd : baseCostUsd;

  const budget = await decidePaidAIAccess({
    supabase: session.supabase,
    organizationId: session.organizationId,
    estimatedAdditionalCostUsd: estimatedCostUsd,
    organizationSettings: settings,
  });

  if (!budget.allowed) {
    const payload = deterministicFallback(`${budget.reason} Deterministic fallback used.`);

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
        objectiveValueConfig: valueConfig,
        roiGate: roiDecision,
      },
    });

    return NextResponse.json(payload);
  }

  const startedAt = Date.now();

  try {
    const aiResult = await routeAICall({
      task: "braindump",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      maxTokens,
    });
    const modelText = aiResult.text;
    const resolvedModel = aiResult.model;

    if (!modelText.trim()) {
      const payload = deterministicFallback("Model response had no text block. Deterministic fallback used.");

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
        provider: aiResult.provider,
        model: resolvedModel,
        mode: "ai",
        inputTokens: estimatedInputTokens,
        outputTokens: 0,
        estimatedCostUsd: 0,
        latencyMs: aiResult.latencyMs,
        success: false,
        errorCode: "missing_text_block",
        metadata: {
          fallback: "deterministic",
          objective,
          objectiveValueConfig: valueConfig,
          roiGate: roiDecision,
        },
      });

      return NextResponse.json(payload);
    }

    const parsed = parseModelJson(modelText);
    const normalizedPlatforms = sanitizePlatforms(parsed, requestedPlatforms);

    if (!Object.keys(normalizedPlatforms).length) {
      const payload = deterministicFallback("Model response did not match schema. Deterministic fallback used.");

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
        provider: aiResult.provider,
        model: resolvedModel,
        mode: "ai",
        inputTokens: estimatedInputTokens,
        outputTokens: 0,
        estimatedCostUsd: 0,
        latencyMs: aiResult.latencyMs,
        success: false,
        errorCode: "invalid_schema",
        metadata: {
          fallback: "deterministic",
          objective,
          objectiveValueConfig: valueConfig,
          roiGate: roiDecision,
        },
      });

      return NextResponse.json(payload);
    }

    const responsePayload = {
      platforms: normalizedPlatforms,
      meta: {
        mode: "ai",
        provider: aiResult.provider,
        model: resolvedModel,
        maxTokens,
        qualityMode: tunedQualityMode,
        urlContextCount: fetchedUrls.length,
        escalated: shouldEscalate,
        escalationCandidate: escalated,
        objective,
        objectiveValueConfig: valueConfig,
        roiGate: roiDecision,
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
      provider: aiResult.provider,
      model: resolvedModel,
      mode: "ai",
      inputTokens: aiResult.inputTokens || estimatedInputTokens,
      outputTokens: aiResult.outputTokens || estimatedOutputTokens,
      estimatedCostUsd,
      latencyMs: aiResult.latencyMs,
      success: true,
      metadata: {
        qualityMode: tunedQualityMode,
        requestedQualityMode: qualityMode,
        urlContextCount: fetchedUrls.length,
        escalated: shouldEscalate,
        escalationCandidate: escalated,
        objective,
        objectiveValueConfig: valueConfig,
        baselineScore,
        projectedPremiumScore,
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
    const payload = deterministicFallback(
      status
        ? `AI temporarily unavailable (${status}). Deterministic fallback used.`
        : "AI temporarily unavailable. Deterministic fallback used."
    );

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
