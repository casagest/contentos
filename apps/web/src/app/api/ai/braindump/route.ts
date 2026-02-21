import { NextRequest, NextResponse } from "next/server";
import { getSessionUserWithOrg } from "@/lib/auth";
import { scrapeUrlContent } from "@/lib/scrape";
import { expiresAtIso, hashUrl, SCRAPE_CACHE_TTL_MS } from "@/lib/url-cache";
import { routeAICall, resolveEffectiveProvider } from "@/lib/ai/multi-model-router";
import { buildDeterministicBrainDump } from "@/lib/ai/deterministic";
import { parseAIJson, JSON_FORMAT_RULES } from "@/lib/ai/parse-ai-json";
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
import { voiceDNAToPrompt, extractVoiceDNA, type VoiceDNA } from "@/lib/ai/voice-dna";
import { fetchDiversityRules, diversityRulesToPrompt } from "@/lib/ai/cross-post-memory";
import {
  fetchCognitiveContextV4,
  trackMemoryAccess,
} from "@/lib/ai/cognitive-memory";
import { buildMemoryPromptFragment } from "@/lib/ai/memory-sanitizer";
import {
  processBrainDumpInput,
  buildBrainDumpAnswerSystemPrompt,
  buildEnrichedGenerationPrompt,
  type ConversationMessage,
} from "@/lib/ai/braindump-coach";
import {
  fetchBusinessIntelligence,
  buildCompactGroundingPrompt,
  buildCompletenessWarning,
} from "@/lib/ai/business-intel";
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
const ERROR_CACHE_TTL_MS = 5 * 60 * 1000;

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
  /** Skip intent cache — force fresh AI generation */
  skipCache?: boolean;
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

/** Lookup platform row with case-insensitive key match (facebook/Facebook/FACEBOOK). */
function findPlatformRow(
  obj: Record<string, unknown>,
  platform: BrainDumpPlatform
): Record<string, unknown> | null {
  const direct = obj[platform];
  if (typeof direct === "object" && direct !== null) return direct as Record<string, unknown>;
  const lower = platform.toLowerCase();
  for (const key of Object.keys(obj)) {
    if (key.toLowerCase() === lower) {
      const v = obj[key];
      if (typeof v === "object" && v !== null) return v as Record<string, unknown>;
    }
  }
  return null;
}

/** Extract first string from source, trying multiple aliases. */
function firstString(source: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = asString(source[k]);
    if (v) return v;
  }
  return "";
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
    const source = findPlatformRow(rawPlatforms as Record<string, unknown>, platform);
    if (!source) continue;

    if (platform === "facebook") {
      normalized.facebook = {
        content: firstString(source, "content", "text", "body", "post") || "",
        hashtags: asStringArray(source.hashtags ?? source.tags),
        estimatedEngagement: firstString(source, "estimatedEngagement", "engagement") || "Medium",
        tips: asStringArray(source.tips ?? source.suggestions),
      };
      continue;
    }

    if (platform === "instagram") {
      normalized.instagram = {
        caption:
          firstString(source, "caption", "content", "text", "body") || "",
        hashtags: asStringArray(source.hashtags ?? source.tags),
        altText: firstString(source, "altText", "alt_text", "alt") || "",
        bestTimeToPost: firstString(source, "bestTimeToPost", "best_time_to_post") || "",
        tips: asStringArray(source.tips ?? source.suggestions),
      };
      continue;
    }

    if (platform === "tiktok") {
      normalized.tiktok = {
        hook: firstString(source, "hook", "opening") || "",
        script:
          firstString(source, "script", "content", "text", "body") || "",
        hashtags: asStringArray(source.hashtags ?? source.tags),
        soundSuggestion: firstString(source, "soundSuggestion", "sound_suggestion", "sound") || "",
        tips: asStringArray(source.tips ?? source.suggestions),
      };
      continue;
    }

    if (platform === "youtube") {
      normalized.youtube = {
        title: firstString(source, "title", "headline") || "",
        description:
          firstString(source, "description", "content", "text", "body") || "",
        tags: asStringArray(source.tags ?? source.hashtags),
        thumbnailIdea: firstString(source, "thumbnailIdea", "thumbnail_idea", "thumbnail") || "",
        tips: asStringArray(source.tips ?? source.suggestions),
      };
    }
  }

  return normalized;
}

function buildBusinessContextPrompt(
  profile: BusinessProfile | null,
  brandVoice: Record<string, unknown> | null
): string {
  const lines: string[] = [];

  if (profile) {
    lines.push(
      "BUSINESS_CONTEXT:",
      `- Name: ${profile.name}`,
      `- Industry: ${profile.industry}`,
      `- Description: ${profile.description}`,
      `- Target audience: ${profile.targetAudience}`,
      `- Tone: ${profile.tones.join(", ")}`,
      `- USP: ${profile.usps}`
    );

    if (profile.preferredPhrases) {
      lines.push(`- Preferred phrases: ${profile.preferredPhrases}`);
    }

    if (profile.avoidPhrases) {
      lines.push(`- Avoid phrases: ${profile.avoidPhrases}`);
    }

  if (Array.isArray(profile.compliance)) {
    if (profile.compliance.includes("cmsr_2025")) {
      lines.push("- Compliance: CMSR_2025 strict mode (no absolute claims, no guaranteed results).");
    }
    if (profile.compliance.includes("anaf")) {
      lines.push("- Compliance: ANAF awareness for financial statements.");
    }
  }
  }

  if (brandVoice?.summary) {
    lines.push(
      "",
      "BRAND_VOICE (learned from past content — USE THIS):",
      `- Summary: ${brandVoice.summary}`,
      brandVoice.tone ? `- Tone: ${brandVoice.tone}` : "",
      Array.isArray(brandVoice.phrases) && brandVoice.phrases.length > 0
        ? `- Preferred phrases: ${brandVoice.phrases.join(", ")}`
        : "",
      Array.isArray(brandVoice.avoid) && brandVoice.avoid.length > 0
        ? `- Avoid: ${brandVoice.avoid.join(", ")}`
        : ""
    );
  }

  return lines.filter(Boolean).length ? `${lines.filter(Boolean).join("\n")}\n` : "";
}

function buildSystemPrompt(params: {
  platforms: BrainDumpPlatform[];
  businessProfile: BusinessProfile | null;
  brandVoice: Record<string, unknown> | null;
  language: Language;
  qualityMode: QualityMode;
}): string {
  const businessContext = buildBusinessContextPrompt(
    params.businessProfile,
    params.brandVoice
  );

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
    "1) ANTI-HALLUCINATION (ABSOLUTE — any violation = entire output REJECTED):",
    "   NUMBERS: ONLY use a number if that EXACT number appears in RAW_INPUT or BUSINESS_CONTEXT.",
    "   - FORBIDDEN examples: '190 intervenții', '500+ pacienți', '95% satisfaction' (unless that exact number is in the data)",
    "   - If no real number exists, use: 'numeroși pacienți', 'experiență vastă', 'rezultate dovedite'",
    "   NAMES: Use doctor/staff names ONLY if they appear in BUSINESS_CONTEXT. NEVER invent patient names or testimonials.",
    "   CLAIMS: NEVER fabricate awards, certifications, rankings, review counts, or prices not in the data.",
    "   RULE: If a specific fact (name, number, price) is NOT in the data, DO NOT USE IT. Use general language instead.",
    "2) Return strict JSON only, no markdown, no prose outside JSON.",
    "3) Generate ONLY requested platforms. Platform keys MUST be lowercase: facebook, instagram, tiktok, youtube.",
    "4) Keep hooks practical and clear. Include CTA and platform-specific hashtags/tags.",
    "5) If medical/dental context exists, avoid absolute claims and guaranteed outcomes (CMSR 2025).",
    "6) HUMANIZATION: Vary sentence length dramatically (mix 3-word punches with 20-word flowing sentences).",
    "7) NEVER use AI-ism phrases: 'în concluzie', 'este important de menționat', 'mai mult decât atât', 'haideți să explorăm', 'în era digitală', 'peisajul digital', 'un rol crucial', 'aspecte esențiale', 'let\\'s delve', 'furthermore', 'digital landscape'.",
    "8) Use at least one unexpected word, colloquial expression, or conversational break per platform output.",
    "",
    JSON_FORMAT_RULES,
    "",
    "JSON_SCHEMA (keys must be lowercase, wrap in \"platforms\" object):",
    '{ "platforms": { "facebook": { "content": "", "hashtags": [], "estimatedEngagement": "Medium", "tips": [] }, "instagram": { "caption": "", "hashtags": [], "altText": "", "bestTimeToPost": "", "tips": [] }, "tiktok": { "hook": "", "script": "", "hashtags": [], "soundSuggestion": "", "tips": [] }, "youtube": { "title": "", "description": "", "tags": [], "thumbnailIdea": "", "tips": [] } } }',
    "Return ONLY the requested platforms from the schema above. Example for facebook+instagram: {\"platforms\":{\"facebook\":{...},\"instagram\":{...}}}",
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

  let brandVoice: Record<string, unknown> | null = null;
  if (settings?.brandVoice && typeof settings.brandVoice === "object") {
    brandVoice = settings.brandVoice as Record<string, unknown>;
  }

  // --- Deep Business Intelligence (website crawl + social + posts) ---
  let businessIntelPrompt = "";
  let completenessWarning: string | null = null;
  try {
    const intel = await fetchBusinessIntelligence({
      supabase: session.supabase,
      organizationId: session.organizationId,
    });
    businessIntelPrompt = buildCompactGroundingPrompt(intel);
    completenessWarning = buildCompletenessWarning(intel);
  } catch {
    // Non-fatal — AI will work without grounding, just less accurately
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
          usps: Array.isArray(businessProfile.usps)
            ? businessProfile.usps.filter((u): u is string => typeof u === "string")
            : typeof businessProfile.usps === "string" && businessProfile.usps.trim()
              ? businessProfile.usps.split(/[,;\n]+/).map((s: string) => s.trim()).filter(Boolean)
              : [],
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
      compliance: businessProfile?.compliance || [],
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

  if (!body.skipCache) {
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
    brandVoice,
    language,
    qualityMode: baseQualityMode,
  });
  const premiumSystemPromptRaw = buildSystemPrompt({
    platforms: requestedPlatforms,
    businessProfile,
    brandVoice,
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
    businessIntelPrompt ? `\n${businessIntelPrompt}` : "",
    `TARGET_PLATFORMS: ${requestedPlatforms.join(", ")}`,
    "Return strict JSON only. Use ONLY facts from RAW_INPUT, URL_CONTEXT, and REAL BUSINESS DATA above. Do NOT invent any data.",
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
        objectiveValueConfig: valueConfig,
        roiGate: roiDecision,
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
      platform: requestedPlatforms[0] || null,
    });
    if (ctxResult.ok) {
      memoryFragment = buildMemoryPromptFragment(ctxResult.value, session.organizationId);
      trackMemoryAccess({ supabase: session.supabase, organizationId: session.organizationId, context: ctxResult.value }).catch(() => {});
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

  const enrichedSystemPrompt = [
    systemPrompt,
    memoryFragment ? `\nCognitive memory (past performance, patterns, strategies):\n${memoryFragment}` : "",
    voiceDNAFragment ? `\n${voiceDNAFragment}` : "",
    diversityFragment ? `\n${diversityFragment}` : "",
  ].filter(Boolean).join("\n");

  const logSchemaFailure = async (params: {
    provider: string;
    model: string;
    errorCode: string;
    latencyMs: number;
  }) => {
    await logAIUsageEvent({
      supabase: session.supabase,
      organizationId: session.organizationId,
      userId: session.user.id,
      routeKey: ROUTE_KEY,
      intentHash,
      provider: params.provider,
      model: params.model,
      mode: "ai",
      inputTokens: estimatedInputTokens,
      outputTokens: 0,
      estimatedCostUsd: 0,
      latencyMs: params.latencyMs,
      success: false,
      errorCode: params.errorCode,
      metadata: {
        objective,
        objectiveValueConfig: valueConfig,
        roiGate: roiDecision,
      },
    });
  };

  const schemaRetryHint = `\n\nCRITICAL: Your previous response did not match the required schema. Return ONLY valid JSON: {"platforms":{"facebook":{...},"instagram":{...}}} with lowercase keys and requested platforms only.`;

  let aiResult: Awaited<ReturnType<typeof routeAICall>> | null = null;
  let normalizedPlatforms: Record<string, unknown> = {};
  let resolvedModel = "";

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      aiResult = await routeAICall({
        task: "braindump",
        messages: [
          { role: "system", content: enrichedSystemPrompt },
          { role: "user", content: userMessage + (attempt === 1 ? schemaRetryHint : "") },
          { role: "assistant", content: "{" },
        ],
        maxTokens,
      });

      aiResult.text = "{" + (aiResult.text || "");
      resolvedModel = aiResult.model;

      if (!aiResult.text.trim()) {
        await logSchemaFailure({
          provider: aiResult.provider,
          model: resolvedModel,
          errorCode: "missing_text_block",
          latencyMs: aiResult.latencyMs,
        });
        return NextResponse.json(
          { error: "AI returned no content. Te rugăm încerci din nou." },
          { status: 503 }
        );
      }

      const parsed = parseAIJson(aiResult.text);
      normalizedPlatforms = parsed ? sanitizePlatforms(parsed, requestedPlatforms) : {};

      if (Object.keys(normalizedPlatforms).length > 0) break;

      if (attempt === 0) continue; // retry with schema hint
      await logSchemaFailure({
        provider: aiResult.provider,
        model: resolvedModel,
        errorCode: "invalid_schema",
        latencyMs: aiResult.latencyMs,
      });
      return NextResponse.json(
        { error: "Răspuns AI invalid (schema). Te rugăm încerci din nou." },
        { status: 503 }
      );
    }
  } catch (error) {
    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof (error as { status?: unknown }).status === "number"
        ? (error as { status: number }).status
        : null;
    await logAIUsageEvent({
      supabase: session.supabase,
      organizationId: session.organizationId,
      userId: session.user.id,
      routeKey: ROUTE_KEY,
      intentHash,
      provider: "unknown",
      model: "unknown",
      mode: "ai",
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
      latencyMs: 0,
      success: false,
      errorCode: "ai_unavailable",
      metadata: {
        objective,
        objectiveValueConfig: valueConfig,
        roiGate: roiDecision,
        httpStatus: status,
      },
    });
    return NextResponse.json(
      {
        error: status
          ? `AI temporar indisponibil (${status}). Te rugăm încerci din nou.`
          : "AI temporar indisponibil. Te rugăm încerci din nou.",
      },
      { status: 503 }
    );
  }

  if (!aiResult || !Object.keys(normalizedPlatforms).length) {
    return NextResponse.json(
      { error: "Răspuns AI invalid. Te rugăm încerci din nou." },
      { status: 503 }
    );
  }

  try {

    const responsePayload = {
      platforms: normalizedPlatforms,
      meta: {
        mode: "ai",
        provider: aiResult!.provider,
        model: resolvedModel,
        maxTokens,
        qualityMode: tunedQualityMode,
        urlContextCount: fetchedUrls.length,
        escalated: shouldEscalate,
        escalationCandidate: escalated,
        objective,
        objectiveValueConfig: valueConfig,
        roiGate: roiDecision,
        ...(completenessWarning ? { dataWarning: completenessWarning } : {}),
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
      provider: aiResult!.provider,
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
      provider: aiResult!.provider,
      model: resolvedModel,
      mode: "ai",
      inputTokens: aiResult!.inputTokens || estimatedInputTokens,
      outputTokens: aiResult!.outputTokens || estimatedOutputTokens,
      estimatedCostUsd,
      latencyMs: aiResult!.latencyMs,
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

    // ── Record episodic memory (fire-and-forget) ──
    void Promise.resolve(
      session.supabase
        .schema("contentos")
        .from("episodic_memory")
        .insert({
          organization_id: session.organizationId,
          event_type: "content_created",
          content: {
            summary: `Brain dump content for ${requestedPlatforms.join(", ")}: "${rawInput.slice(0, 100)}"`,
            text: rawInput.slice(0, 500),
            platforms: requestedPlatforms,
            objective: body.objective,
          },
          context: {
            platform: requestedPlatforms[0],
            route: "braindump",
            provider: responsePayload.meta?.provider,
            model: responsePayload.meta?.model,
          },
          importance_score: 0.6,
          decay_rate: 0.05,
        })
    ).catch(() => {});

    // ── Auto-update Voice DNA (fire-and-forget) ──
    // Every braindump contributes to learning the user's style
    void (async () => {
      try {
        const { data: drafts } = await session.supabase
          .from("drafts")
          .select("body")
          .eq("organization_id", session.organizationId)
          .order("created_at", { ascending: false })
          .limit(20);
        const posts = [
          rawInput, // Include current braindump input
          ...(drafts || []).map((d: { body: string }) => d.body).filter(Boolean),
        ].filter((p) => typeof p === "string" && p.trim().length > 20);
        if (posts.length >= 3) {
          const dna = extractVoiceDNA(posts);
          const { data: org } = await session.supabase
            .from("organizations")
            .select("settings")
            .eq("id", session.organizationId)
            .single();
          const settings = (org?.settings as Record<string, unknown>) || {};
          await session.supabase
            .from("organizations")
            .update({ settings: { ...settings, voiceDNA: dna } })
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
        objective,
        objectiveValueConfig: valueConfig,
        roiGate: roiDecision,
      },
    });
    return NextResponse.json(
      {
        error: status
          ? `AI temporar indisponibil (${status}). Te rugăm încerci din nou.`
          : "AI temporar indisponibil. Te rugăm încerci din nou.",
      },
      { status: 503 }
    );
  }
}
