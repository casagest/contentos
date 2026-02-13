import { NextRequest, NextResponse } from "next/server";
import { ContentAIService } from "@contentos/content-engine";
import type { ContentType, Platform } from "@contentos/content-engine";
import { getSessionUserWithOrg } from "@/lib/auth";
import { buildOpenRouterModelChain, resolveAIProvider, resolveAIProviderForTask } from "@/lib/ai/provider";
import { scrapeUrlContent } from "@/lib/scrape";
import { expiresAtIso, hashUrl, RESEARCH_CACHE_TTL_MS, SCRAPE_CACHE_TTL_MS } from "@/lib/url-cache";
import {
  buildIntentCacheKey,
  decidePaidAIAccess,
  estimateAnthropicCostUsd,
  estimateTokensFromText,
  logAIUsageEvent,
} from "@/lib/ai/governor";

interface ResearchRequestBody {
  url?: string;
  platform?: Platform;
  forceRefresh?: boolean;
}

type SyntheticPost = {
  text: string;
  engagement: number;
  publishedAt: Date;
  contentType: ContentType;
};

type StoredResearchAnalysis = {
  id: string;
  username: string | null;
  summary: string;
  content_strategy: string;
  top_topics: string[] | null;
  best_posting_times: string[] | null;
  recommendations: string[] | null;
  mode: "ai" | "deterministic";
  scrape_source: "firecrawl" | "fallback";
  raw_result: Record<string, unknown> | null;
  created_at: string;
};

type ComputedResearchResult = {
  username: string;
  platform: Platform;
  summary: string;
  contentStrategy: string;
  topTopics: string[];
  bestPostingTimes: string[];
  recommendations: string[];
  mode: "ai" | "deterministic";
  warning?: string;
};

const VALID_PLATFORMS: Platform[] = [
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "twitter",
];
const ROUTE_KEY = "research:v2";

const STOP_WORDS = new Set([
  "acest", "aceasta", "aceste", "adica", "aici", "apoi", "asupra", "avand", "avem",
  "bine", "care", "catre", "ceea", "cele", "celor", "chiar", "cumva", "cand", "daca",
  "decat", "deci", "deja", "despre", "dintre", "doar", "fara", "fiind", "foarte", "fost",
  "inca", "insa", "intre", "langa", "mai", "mult", "multe", "pentru", "peste", "poate",
  "prin", "sau", "sunt", "toate", "totul", "unde", "with", "that", "this", "from", "have",
  "will", "your", "you", "what", "when", "were", "them", "they", "then", "into", "about",
  "after", "before", "while", "been", "being",
]);

function toUsername(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./i, "");
    const firstSegment = parsed.pathname.split("/").filter(Boolean)[0];
    if (firstSegment && !["p", "reel", "shorts", "watch"].includes(firstSegment)) {
      return firstSegment.startsWith("@") ? firstSegment : `@${firstSegment}`;
    }
    return host;
  } catch {
    return "competitor";
  }
}

function normalizePlatform(value?: Platform): Platform {
  if (value && VALID_PLATFORMS.includes(value)) return value;
  return "facebook";
}

function normalizePlatformUserId(username: string, urlHash: string): string {
  const candidate = username.replace(/^@/, "").trim().toLowerCase();
  if (!candidate) return urlHash.slice(0, 24);
  return candidate.slice(0, 120);
}

function inferContentType(text: string): ContentType {
  const value = text.toLowerCase();
  if (value.includes("video") || value.includes("reel") || value.includes("clip")) return "video";
  if (value.includes("carousel") || value.includes("carusel")) return "carousel";
  if (value.includes("thread")) return "thread";
  return "text";
}

function splitToSegments(content: string): string[] {
  const blockSegments = content
    .split(/\n{2,}/)
    .map((value) => value.trim())
    .filter((value) => value.length >= 60);

  if (blockSegments.length >= 3) return blockSegments.slice(0, 8);

  const sentenceSegments = content
    .split(/(?<=[.!?])\s+/)
    .map((value) => value.trim())
    .filter((value) => value.length >= 50);

  if (sentenceSegments.length >= 3) return sentenceSegments.slice(0, 8);

  return [content.slice(0, 1000)];
}

function buildSyntheticPosts(content: string): SyntheticPost[] {
  const segments = splitToSegments(content);
  const now = Date.now();

  return segments.slice(0, 8).map((text, index) => {
    const trimmed = text.slice(0, 800);
    const engagementBase = 7 - index * 0.45 + Math.min(trimmed.length, 800) / 220;
    const engagement = Math.max(1, Math.min(15, Number(engagementBase.toFixed(1))));

    return {
      text: trimmed,
      engagement,
      publishedAt: new Date(now - index * 24 * 60 * 60 * 1000),
      contentType: inferContentType(trimmed),
    };
  });
}

function extractTopTopics(content: string): string[] {
  const words = content.toLowerCase().match(/\p{L}{4,}/gu) ?? [];
  const counts = new Map<string, number>();

  for (const word of words) {
    if (STOP_WORDS.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word]) => word);
}

function deterministicResearchSnapshot(username: string, content: string) {
  const topTopics = extractTopTopics(content);

  return {
    summary: `Analiza rapida pentru ${username}: continutul este orientat pe ${topTopics.slice(0, 3).join(", ") || "educatie si awareness"}.`,
    contentStrategy:
      "Continut informativ cu potential bun pentru adaptare in format educational + social proof.",
    topTopics,
    bestPostingTimes: ["Marti 10:00", "Joi 14:00", "Duminica 19:00"],
    hashtagStrategy:
      "Combina hashtag-uri de nisa cu hashtag-uri de audienta si evita listele lungi irelevante.",
    toneAnalysis:
      "Ton predominant educativ-informativ, cu accent pe claritate si beneficii concrete.",
    recommendations: [
      "Transforma ideile principale in carusele scurte (5-7 slide-uri).",
      "Foloseste hook-uri cu intrebare in primele 120 de caractere.",
      "Inchide fiecare postare cu un CTA clar pentru comentarii.",
    ],
    whatToLearn: [
      "Frecventa consistenta pe topicuri recurente.",
      "Structura repetabila: hook -> valoare -> CTA.",
      "Reutilizarea aceluiasi subiect in unghiuri diferite.",
    ],
  };
}

async function loadResearchCache(params: {
  supabase: any;
  organizationId: string;
  urlHash: string;
  platform: Platform;
}): Promise<StoredResearchAnalysis | null> {
  const since = new Date(Date.now() - RESEARCH_CACHE_TTL_MS).toISOString();

  const { data } = await params.supabase
    .from("research_analyses")
    .select(
      "id,username,summary,content_strategy,top_topics,best_posting_times,recommendations,mode,scrape_source,raw_result,created_at"
    )
    .eq("organization_id", params.organizationId)
    .eq("url_hash", params.urlHash)
    .eq("platform", params.platform)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as StoredResearchAnalysis | null) ?? null;
}

async function loadScrapeCache(params: {
  supabase: any;
  organizationId: string;
  urlHash: string;
}) {
  const { data } = await params.supabase
    .from("scrape_cache")
    .select("url,title,description,content,source,metadata,expires_at")
    .eq("organization_id", params.organizationId)
    .eq("url_hash", params.urlHash)
    .gt("expires_at", new Date().toISOString())
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as
    | {
        url: string;
        title: string | null;
        description: string | null;
        content: string;
        source: "firecrawl" | "fallback";
        metadata: Record<string, unknown> | null;
        expires_at: string;
      }
    | null) ?? null;
}

export async function GET() {
  const session = await getSessionUserWithOrg();
  if (session instanceof NextResponse) return session;

  const { data, error } = await session.supabase
    .from("research_analyses")
    .select(
      "id,url,platform,username,mode,scrape_source,summary,content_strategy,top_topics,best_posting_times,recommendations,raw_result,created_at"
    )
    .eq("organization_id", session.organizationId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json(
      { error: "Nu s-a putut incarca istoricul de research." },
      { status: 500 }
    );
  }

  const analyses = (data || []).map((row) => {
    const raw = (row.raw_result ?? {}) as Record<string, unknown>;
    return {
      id: row.id,
      url: row.url,
      platform: row.platform,
      username: row.username,
      mode: row.mode,
      scrapeSource: row.scrape_source,
      summary: row.summary,
      contentStrategy: row.content_strategy,
      topTopics: row.top_topics || [],
      bestPostingTimes: row.best_posting_times || [],
      recommendations: row.recommendations || [],
      title: typeof raw.title === "string" ? raw.title : undefined,
      description: typeof raw.description === "string" ? raw.description : undefined,
      warning: typeof raw.warning === "string" ? raw.warning : undefined,
      createdAt: row.created_at,
    };
  });

  return NextResponse.json({ analyses });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUserWithOrg();
    if (session instanceof NextResponse) return session;

    let body: ResearchRequestBody;
    try {
      body = (await request.json()) as ResearchRequestBody;
    } catch {
      return NextResponse.json(
        { error: "Body invalid. Trimite JSON valid." },
        { status: 400 }
      );
    }

    const url = body.url?.trim();
    if (!url) {
      return NextResponse.json(
        { error: "URL-ul competitorului este obligatoriu." },
        { status: 400 }
      );
    }

    const platform = normalizePlatform(body.platform);
    const username = toUsername(url);
    const urlHash = hashUrl(url);
    const forceRefresh = body.forceRefresh === true;
    const intentHash = buildIntentCacheKey(ROUTE_KEY, {
      urlHash,
      platform,
      forceRefresh,
      version: 2,
    });

    if (!forceRefresh) {
      try {
        const cachedAnalysis = await loadResearchCache({
          supabase: session.supabase,
          organizationId: session.organizationId,
          urlHash,
          platform,
        });

        if (cachedAnalysis) {
          const raw = (cachedAnalysis.raw_result ?? {}) as Record<string, unknown>;
          await logAIUsageEvent({
            supabase: session.supabase,
            organizationId: session.organizationId,
            userId: session.user.id,
            routeKey: ROUTE_KEY,
            intentHash,
            provider: "cache",
            model: "research_analyses",
            mode: "deterministic",
            cacheHit: true,
            success: true,
            metadata: { source: "research_analyses" },
          });

          return NextResponse.json({
            id: cachedAnalysis.id,
            url,
            username: cachedAnalysis.username || username,
            platform,
            summary: cachedAnalysis.summary,
            contentStrategy: cachedAnalysis.content_strategy,
            topTopics: cachedAnalysis.top_topics || [],
            bestPostingTimes: cachedAnalysis.best_posting_times || [],
            recommendations: cachedAnalysis.recommendations || [],
            scrapeSource: cachedAnalysis.scrape_source,
            mode: cachedAnalysis.mode,
            title: typeof raw.title === "string" ? raw.title : undefined,
            description: typeof raw.description === "string" ? raw.description : undefined,
            warning: typeof raw.warning === "string" ? raw.warning : undefined,
            cached: true,
            cacheAgeMs: Math.max(0, Date.now() - Date.parse(cachedAnalysis.created_at)),
          });
        }
      } catch {
        // Continue without cache when table/migration is not yet present.
      }
    }

    let scraped = null as null | {
      url: string;
      content: string;
      source: "firecrawl" | "fallback";
      title?: string;
      description?: string;
      language?: string;
      links?: string[];
    };

    if (!forceRefresh) {
      try {
        const cachedScrape = await loadScrapeCache({
          supabase: session.supabase,
          organizationId: session.organizationId,
          urlHash,
        });
        if (cachedScrape?.content) {
          const metadata = (cachedScrape.metadata ?? {}) as Record<string, unknown>;
          scraped = {
            url: cachedScrape.url,
            content: cachedScrape.content,
            source: cachedScrape.source,
            title: cachedScrape.title ?? undefined,
            description: cachedScrape.description ?? undefined,
            language:
              typeof metadata.language === "string" ? metadata.language : undefined,
            links: Array.isArray(metadata.links)
              ? metadata.links.filter((value): value is string => typeof value === "string")
              : undefined,
          };
        }
      } catch {
        // Continue to fresh scrape.
      }
    }

    if (!scraped) {
      scraped = await scrapeUrlContent(url, {
        maxChars: 15_000,
        minChars: 120,
        timeoutMs: 12_000,
      });
    }

    if (!scraped) {
      return NextResponse.json(
        {
          error:
            "Nu am putut extrage continut relevant din URL. Incearca un link public (blog, pagina, canal).",
        },
        { status: 422 }
      );
    }

    try {
      await session.supabase.from("scrape_cache").upsert(
        {
          organization_id: session.organizationId,
          created_by: session.user.id,
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
      // Best-effort cache write.
    }

    const deterministic = deterministicResearchSnapshot(username, scraped.content);
    const aiProvider = resolveAIProviderForTask("research");
    const startedAt = Date.now();

    let final: ComputedResearchResult = {
      username,
      platform,
      summary: deterministic.summary,
      contentStrategy: deterministic.contentStrategy,
      topTopics: deterministic.topTopics,
      bestPostingTimes: deterministic.bestPostingTimes,
      recommendations: deterministic.recommendations,
      mode: "deterministic" as const,
      warning: undefined as string | undefined,
    };

    const baseResearchModel =
      aiProvider.mode === "openrouter"
        ? buildOpenRouterModelChain({
            quality: "economy",
            preferred:
              process.env.AI_MODEL_RESEARCH_ECONOMY?.trim() ||
              process.env.AI_MODEL_RESEARCH?.trim() ||
              aiProvider.model,
          })
        : process.env.AI_MODEL_RESEARCH_ECONOMY?.trim() ||
          process.env.AI_MODEL_RESEARCH?.trim() ||
          aiProvider.model ||
          "claude-3-5-haiku-latest";
    const premiumResearchModel =
      aiProvider.mode === "openrouter"
        ? buildOpenRouterModelChain({
            quality: "premium",
            preferred:
              process.env.AI_MODEL_RESEARCH_PREMIUM?.trim() ||
              process.env.AI_MODEL_RESEARCH?.trim() ||
              aiProvider.model,
          })
        : process.env.AI_MODEL_RESEARCH_PREMIUM?.trim() ||
          aiProvider.model ||
          "claude-sonnet-4-5-20250929";
    const shouldEscalate = scraped.content.length > 8500;
    const model = shouldEscalate ? premiumResearchModel : baseResearchModel;

    const estimatedInputTokens =
      estimateTokensFromText(scraped.content.slice(0, 10_000)) +
      estimateTokensFromText(username) +
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

    if (aiProvider.mode === "template" || !aiProvider.apiKey) {
      final = {
        ...final,
        warning: "AI indisponibil sau dezactivat. Am folosit analiza deterministica.",
      };

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
    } else if (!budget.allowed) {
      final = {
        ...final,
        warning: `${budget.reason} Fallback deterministic activat.`,
      };

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
    } else {
      try {
        const service = new ContentAIService({
          apiKey: aiProvider.apiKey,
          model,
          provider: aiProvider.mode === "openrouter" ? "openrouter" : "anthropic",
          baseUrl: aiProvider.baseUrl,
        });

        const posts = buildSyntheticPosts(scraped.content);
        const aiAnalysis = await service.analyzeAccount({ username, platform, posts });
        const resolvedModel = service.getLastResolvedModel() || model;

        final = {
          username,
          platform,
          summary: aiAnalysis.summary,
          contentStrategy: aiAnalysis.contentStrategy,
          topTopics: aiAnalysis.topTopics,
          bestPostingTimes: aiAnalysis.bestPostingTimes,
          recommendations: aiAnalysis.recommendations,
          mode: "ai",
          warning: undefined,
        };

        await logAIUsageEvent({
          supabase: session.supabase,
          organizationId: session.organizationId,
          userId: session.user.id,
          routeKey: ROUTE_KEY,
          intentHash,
          provider: aiProvider.mode,
          model: resolvedModel,
          mode: "ai",
          inputTokens: estimatedInputTokens,
          outputTokens: estimatedOutputTokens,
          estimatedCostUsd,
          latencyMs: Date.now() - startedAt,
          success: true,
          metadata: {
            scrapedSource: scraped.source,
            escalated: shouldEscalate,
            modelChain: aiProvider.mode === "openrouter" ? model : undefined,
          },
        });
      } catch (error) {
        const status =
          typeof error === "object" &&
          error !== null &&
          "status" in error &&
          typeof (error as { status?: unknown }).status === "number"
            ? (error as { status: number }).status
            : null;

        final = {
          ...final,
          mode: "deterministic",
          warning: status
            ? `AI indisponibil temporar (${status}). Am folosit fallback deterministic.`
            : "AI indisponibil temporar. Am folosit fallback deterministic.",
        };

        await logAIUsageEvent({
          supabase: session.supabase,
          organizationId: session.organizationId,
          userId: session.user.id,
          routeKey: ROUTE_KEY,
          intentHash,
          provider: aiProvider.mode,
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
      }
    }

    const rawResult = {
      title: scraped.title ?? null,
      description: scraped.description ?? null,
      scrapeSource: scraped.source,
      warning: final.warning ?? null,
      hashtagStrategy: deterministic.hashtagStrategy,
      toneAnalysis: deterministic.toneAnalysis,
      whatToLearn: deterministic.whatToLearn,
    };

    let analysisId: string | null = null;
    try {
      const { data: inserted } = await session.supabase
        .from("research_analyses")
        .insert({
          organization_id: session.organizationId,
          created_by: session.user.id,
          url: scraped.url,
          url_hash: urlHash,
          platform,
          username,
          mode: final.mode,
          scrape_source: scraped.source,
          summary: final.summary,
          content_strategy: final.contentStrategy,
          top_topics: final.topTopics,
          best_posting_times: final.bestPostingTimes,
          recommendations: final.recommendations,
          raw_result: rawResult,
        })
        .select("id")
        .single();

      analysisId = inserted?.id ?? null;
    } catch {
      // Best-effort persistence.
    }

    try {
      await session.supabase.from("tracked_competitors").upsert(
        {
          organization_id: session.organizationId,
          platform,
          platform_user_id: normalizePlatformUserId(username, urlHash),
          platform_username: username,
          display_name: username,
          top_topics: final.topTopics,
          content_strategy: {
            summary: final.summary,
            contentStrategy: final.contentStrategy,
            recommendations: final.recommendations,
            sourceUrl: scraped.url,
            mode: final.mode,
          },
          last_analyzed_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,platform,platform_user_id" }
      );
    } catch {
      // Best-effort competitor tracking.
    }

    return NextResponse.json({
      id: analysisId,
      url: scraped.url,
      title: scraped.title,
      description: scraped.description,
      scrapeSource: scraped.source,
      ...final,
      cached: false,
    });
  } catch (error) {
    console.error("Research AI Error:", error);
    return NextResponse.json(
      { error: "A aparut o eroare neasteptata. Te rugam sa incerci din nou." },
      { status: 500 }
    );
  }
}
