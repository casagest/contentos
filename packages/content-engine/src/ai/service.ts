// packages/content-engine/src/ai/service.ts
// ============================================================
// ContentOS AI Service — Claude API Integration
// ============================================================

import Anthropic from "@anthropic-ai/sdk";
import type {
  Platform,
  Language,
  ContentType,
  AlgorithmScore,
  AlgorithmScoreMetric,
  CoachContext,
  CoachResponse,
  ContentGenerationRequest,
  ContentGenerationResult,
  CMSRComplianceResult,
  DentalCategory,
} from "../types";
import {
  buildCoachPrompt,
  buildGenerationPrompt,
  buildScoringPrompt,
  CMSR_COMPLIANCE_PROMPT,
} from "./prompts/system";

// ============================================================
// AI SERVICE
// ============================================================

export class ContentAIService {
  private anthropicClient?: Anthropic;
  private provider: "anthropic" | "openrouter";
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private lastResolvedModel?: string;

  constructor(config: {
    apiKey: string;
    model?: string;
    provider?: "anthropic" | "openrouter";
    baseUrl?: string;
  }) {
    const inferredProvider =
      config.provider ||
      (config.apiKey.startsWith("sk-or-") ? "openrouter" : "anthropic");

    this.provider = inferredProvider;
    this.apiKey = config.apiKey;
    this.baseUrl =
      config.baseUrl ||
      process.env.OPENROUTER_BASE_URL?.trim() ||
      "https://openrouter.ai/api/v1/chat/completions";
    this.model =
      config.model ||
      (this.provider === "openrouter"
        ? "openrouter/auto"
        : "claude-sonnet-4-5-20250929");

    if (this.provider === "anthropic") {
      this.anthropicClient = new Anthropic({ apiKey: config.apiKey });
    }
  }

  // ----------------------------------------------------------
  // CONTENT SCORING
  // ----------------------------------------------------------

  async scoreContent(params: {
    content: string;
    platform: Platform;
    contentType: ContentType;
    language: Language;
  }): Promise<AlgorithmScore> {
    const prompt = buildScoringPrompt(params);

    const text = await this.completeText({
      system: prompt,
      user: `Evaluează acest conținut pentru ${params.platform}:\n\n"""${params.content}"""`,
      maxTokens: 4096,
    });
    const parsed = this.parseJSON<RawScoreResponse>(text);

    return {
      platform: params.platform,
      overallScore: parsed.overallScore,
      grade: this.scoreToGrade(parsed.overallScore),
      metrics: parsed.metrics.map((m) => ({
        name: m.name,
        score: m.score,
        weight: m.weight,
        explanation: m.explanation,
        suggestion: m.suggestion,
      })),
      summary: parsed.summary,
      improvements: parsed.improvements,
      alternativeVersions: parsed.alternativeVersion
        ? [parsed.alternativeVersion]
        : undefined,
    };
  }

  // ----------------------------------------------------------
  // CONTENT GENERATION
  // ----------------------------------------------------------

  async generateContent(
    request: ContentGenerationRequest & {
      userVoiceDescription?: string;
    }
  ): Promise<ContentGenerationResult> {
    const results: ContentGenerationResult = {
      platformVersions: {} as ContentGenerationResult["platformVersions"],
      keyIdeas: [],
      suggestedTopics: [],
    };

    // Generate for each target platform in parallel
    const platformPromises = request.targetPlatforms.map(async (platform) => {
      const prompt = buildGenerationPrompt({
        platform,
        language: request.language,
        tone: request.tone || "professional",
        input: request.input,
        isDental: !!request.dentalCategory,
        dentalCategory: request.dentalCategory,
        userVoiceDescription: request.userVoiceDescription,
      });

      const text = await this.completeText({
        system: prompt,
        user: `Generează conținut optimizat pentru ${platform} bazat pe acest input:\n\n"""${request.input}"""`,
        maxTokens: 4096,
      });
      const parsed = this.parseJSON<RawGenerationResponse>(text);

      // Score the generated content
      const score = await this.scoreContent({
        content: parsed.primary.text,
        platform,
        contentType: (parsed.primary.contentType || "text") as ContentType,
        language: request.language,
      });

      return {
        platform,
        version: {
          text: parsed.primary.text,
          hashtags: parsed.primary.hashtags || [],
          contentType: (parsed.primary.contentType || "text") as ContentType,
          algorithmScore: score,
          alternativeVersions: parsed.alternatives.map((a) => a.text),
          mediaSuggestions: parsed.primary.mediaSuggestion
            ? [parsed.primary.mediaSuggestion]
            : undefined,
        },
      };
    });

    const platformResults = await Promise.all(platformPromises);

    for (const result of platformResults) {
      results.platformVersions[result.platform] = result.version;
    }

    return results;
  }

  // ----------------------------------------------------------
  // AI CONTENT COACH
  // ----------------------------------------------------------

  async chat(context: CoachContext): Promise<CoachResponse> {
    // Build context from posts
    const recentPostsSummary = context.recentPosts
      .slice(0, 10)
      .map(
        (p) =>
          `[${p.platform}] ${p.publishedAt.toISOString().split("T")[0]} | ` +
          `Engagement: ${p.engagementRate}% | Likes: ${p.likesCount} | ` +
          `Comments: ${p.commentsCount} | Shares: ${p.sharesCount}\n` +
          `"${(p.textContent || "").substring(0, 200)}..."`
      )
      .join("\n\n");

    const topPostsSummary = context.topPerformingPosts
      .slice(0, 5)
      .map(
        (p) =>
          `[${p.platform}] ${p.publishedAt.toISOString().split("T")[0]} | ` +
          `Engagement: ${p.engagementRate}% | Likes: ${p.likesCount} | ` +
          `Comments: ${p.commentsCount} | Shares: ${p.sharesCount}\n` +
          `"${(p.textContent || "").substring(0, 200)}..."`
      )
      .join("\n\n");

    // Calculate account metrics
    const totalPosts = context.recentPosts.length;
    const avgEngagement =
      totalPosts > 0
        ? context.recentPosts.reduce((sum, p) => sum + p.engagementRate, 0) / totalPosts
        : 0;

    const accountMetrics = `Total postări analizate: ${totalPosts}\nEngagement mediu: ${avgEngagement.toFixed(2)}%`;

    const systemPrompt = buildCoachPrompt({
      platform: context.platform,
      language: "ro",
      isDental: false, // Will be determined by organization type
      recentPostsSummary,
      topPostsSummary,
      accountMetrics,
    });

    const text = await this.completeText({
      system: systemPrompt,
      user: context.question,
      maxTokens: 4096,
    });

    // Try to parse structured response, fall back to plain text
    try {
      const parsed = this.parseJSON<RawCoachResponse>(text);
      return {
        answer: parsed.answer,
        actionItems: parsed.actionItems || [],
        suggestedContent: parsed.suggestedContent,
        dataReferences: parsed.dataReferences || [],
      };
    } catch {
      // If response isn't JSON, return as plain text
      return {
        answer: text,
        actionItems: [],
        dataReferences: [],
      };
    }
  }

  // ----------------------------------------------------------
  // CMSR COMPLIANCE CHECK (Dental)
  // ----------------------------------------------------------

  async checkCMSRCompliance(content: string): Promise<CMSRComplianceResult> {
    const text = await this.completeText({
      system: CMSR_COMPLIANCE_PROMPT,
      user: `Verifică conformitatea CMSR 2025 pentru acest conținut:\n\n"""${content}"""`,
      maxTokens: 2048,
    });
    const parsed = this.parseJSON<CMSRComplianceResult>(text);

    return parsed;
  }

  // ----------------------------------------------------------
  // BRAIN DUMP PROCESSING
  // ----------------------------------------------------------

  async processBrainDump(params: {
    input: string;
    inputType: "text" | "voice_transcript";
    targetPlatforms: Platform[];
    language: Language;
    isDental: boolean;
    dentalCategory?: DentalCategory;
  }): Promise<{
    keyIdeas: string[];
    suggestedTopics: string[];
    drafts: Record<Platform, { text: string; contentType: ContentType }[]>;
  }> {
    const systemPrompt = `${params.isDental ? "Ești expert în marketing dental pe social media." : "Ești expert în marketing pe social media."}
    
Primești un "brain dump" de la un creator — gânduri nestructurate, idei brute.

SARCINA TA:
1. Extrage ideile cheie din textul brut
2. Sugerează topicuri de conținut bazate pe aceste idei
3. Generează câte 2-3 drafturi de post pentru fiecare platformă țintă
4. Fiecare draft trebuie optimizat pentru platforma respectivă

PLATFORME ȚINTĂ: ${params.targetPlatforms.join(", ")}
LIMBA: ${params.language === "ro" ? "Română (cu diacritice corecte!)" : "English"}

${params.isDental && params.dentalCategory ? `CATEGORIE DENTARĂ: ${params.dentalCategory}\nRespectă regulile CMSR 2025.` : ""}

FORMAT RĂSPUNS (JSON):
{
  "keyIdeas": ["idee 1", "idee 2", ...],
  "suggestedTopics": ["topic 1", "topic 2", ...],
  "drafts": {
    "platform_name": [
      { "text": "...", "contentType": "text|image|video|carousel|reel" },
      ...
    ]
  }
}`;

    const text = await this.completeText({
      system: systemPrompt,
      user: `Brain dump:\n\n"""${params.input}"""`,
      maxTokens: 8192,
    });
    return this.parseJSON(text);
  }

  // ----------------------------------------------------------
  // ACCOUNT RESEARCH
  // ----------------------------------------------------------

  async analyzeAccount(params: {
    username: string;
    platform: Platform;
    posts: Array<{
      text: string;
      engagement: number;
      publishedAt: Date;
      contentType: ContentType;
    }>;
  }): Promise<{
    summary: string;
    contentStrategy: string;
    topTopics: string[];
    bestPostingTimes: string[];
    hashtagStrategy: string;
    toneAnalysis: string;
    recommendations: string[];
    whatToLearn: string[];
  }> {
    const postsSummary = params.posts
      .map(
        (p) =>
          `[${p.contentType}] Engagement: ${p.engagement}% | ${p.publishedAt.toISOString().split("T")[0]}\n"${p.text.substring(0, 200)}"`
      )
      .join("\n\n");

    const text = await this.completeText({
      system: `Ești expert în analiza conturilor de social media. 
Analizezi contul @${params.username} pe ${params.platform}.
Oferă o analiză detaliată a strategiei lor de conținut.

FORMAT RĂSPUNS (JSON):
{
  "summary": "Rezumat general al contului",
  "contentStrategy": "Strategia lor principală de conținut",
  "topTopics": ["topic 1", "topic 2"],
  "bestPostingTimes": ["Luni 10:00", "Joi 19:00"],
  "hashtagStrategy": "Cum folosesc hashtag-urile",
  "toneAnalysis": "Tonul și vocea brand-ului",
  "recommendations": ["Ce poți învăța de la ei 1", "..."],
  "whatToLearn": ["Tactică specifică de aplicat 1", "..."]
}`,
      user: `Analizează contul @${params.username} bazat pe aceste postări:\n\n${postsSummary}`,
      maxTokens: 4096,
    });
    return this.parseJSON(text);
  }

  // ----------------------------------------------------------
  // UTILITY METHODS
  // ----------------------------------------------------------

  private async completeText(params: {
    system: string;
    user: string;
    maxTokens: number;
  }): Promise<string> {
    if (this.provider === "openrouter") {
      return this.completeWithOpenRouter(params);
    }

    if (!this.anthropicClient) {
      throw new Error("Anthropic client is not initialized.");
    }

    const response = await this.anthropicClient.messages.create({
      model: this.model,
      max_tokens: params.maxTokens,
      system: params.system,
      messages: [{ role: "user", content: params.user }],
    });

    this.lastResolvedModel = this.model;
    return this.extractAnthropicText(response);
  }

  private extractAnthropicText(response: Anthropic.Messages.Message): string {
    const block = response.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") {
      throw new Error("No text content in AI response");
    }
    return block.text;
  }

  private async completeWithOpenRouter(params: {
    system: string;
    user: string;
    maxTokens: number;
  }): Promise<string> {
    const models = this.parseModelChain(this.model);
    let lastError: (Error & { status?: number }) | null = null;

    for (const model of models) {
      try {
        const response = await fetch(this.baseUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer":
              process.env.OPENROUTER_SITE_URL?.trim() ||
              "https://contentos-project.vercel.app",
            "X-Title": process.env.OPENROUTER_APP_NAME?.trim() || "ContentOS",
          },
          body: JSON.stringify({
            model,
            max_tokens: params.maxTokens,
            messages: [
              { role: "system", content: params.system },
              { role: "user", content: params.user },
            ],
          }),
        });

        const payload = (await response.json().catch(() => ({}))) as {
          error?: { message?: string };
          choices?: Array<{
            message?: { content?: string | Array<{ type?: string; text?: string }> };
          }>;
        };

        if (!response.ok) {
          const message =
            payload.error?.message ||
            `OpenRouter request failed with status ${response.status}`;
          throw this.toProviderError(response.status, message);
        }

        const content = payload.choices?.[0]?.message?.content;
        if (typeof content === "string" && content.trim()) {
          this.lastResolvedModel = model;
          return content;
        }

        if (Array.isArray(content)) {
          const text = content
            .map((part) => (part && typeof part.text === "string" ? part.text : ""))
            .join("\n")
            .trim();
          if (text) {
            this.lastResolvedModel = model;
            return text;
          }
        }

        throw this.toProviderError(502, "OpenRouter response missing text content.");
      } catch (error) {
        const providerError =
          error instanceof Error
            ? (error as Error & { status?: number })
            : this.toProviderError(500, "Unknown OpenRouter error.");
        lastError = providerError;

        const status = typeof providerError.status === "number" ? providerError.status : 500;
        const message = providerError.message || "";
        const hasNextModel = model !== models[models.length - 1];
        const shouldFallback = hasNextModel && this.shouldFallbackToNextOpenRouterModel(status, message);

        if (shouldFallback) continue;
        throw providerError;
      }
    }

    if (lastError) throw lastError;
    throw this.toProviderError(500, "OpenRouter fallback chain exhausted.");
  }

  private toProviderError(status: number, message: string): Error & { status: number } {
    const error = new Error(message) as Error & { status: number };
    error.status = status;
    return error;
  }

  getLastResolvedModel(): string | undefined {
    return this.lastResolvedModel;
  }

  private parseModelChain(raw: string): string[] {
    const models = raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (!models.length) return ["openrouter/auto"];
    return [...new Set(models)];
  }

  private shouldFallbackToNextOpenRouterModel(status: number, message: string): boolean {
    const retryableStatus = new Set([400, 401, 402, 403, 404, 408, 409, 425, 429, 500, 502, 503, 504]);
    if (retryableStatus.has(status)) return true;
    const lowerMessage = message.toLowerCase();
    return (
      lowerMessage.includes("model") ||
      lowerMessage.includes("rate limit") ||
      lowerMessage.includes("quota") ||
      lowerMessage.includes("capacity")
    );
  }

  private parseJSON<T>(text: string): T {
    // Extract JSON from potential markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();

    try {
      return JSON.parse(jsonStr) as T;
    } catch (error) {
      // Try to find JSON object in text
      const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        try {
          return JSON.parse(objectMatch[0]) as T;
        } catch {
          throw new Error(`Failed to parse AI response as JSON: ${jsonStr.substring(0, 200)}`);
        }
      }
      throw new Error(`Failed to parse AI response as JSON: ${jsonStr.substring(0, 200)}`);
    }
  }

  private scoreToGrade(
    score: number
  ): "S" | "A" | "B" | "C" | "D" | "F" {
    if (score >= 95) return "S";
    if (score >= 80) return "A";
    if (score >= 65) return "B";
    if (score >= 50) return "C";
    if (score >= 35) return "D";
    return "F";
  }
}

// ============================================================
// RAW RESPONSE TYPES
// ============================================================

interface RawScoreResponse {
  overallScore: number;
  grade: string;
  metrics: AlgorithmScoreMetric[];
  summary: string;
  improvements: string[];
  alternativeVersion?: string;
}

interface RawGenerationResponse {
  primary: {
    text: string;
    hashtags: string[];
    contentType: string;
    bestPostingTime: string;
    mediaSuggestion: string;
  };
  alternatives: Array<{ text: string; angle: string }>;
  tips: string;
}

interface RawCoachResponse {
  answer: string;
  actionItems: string[];
  suggestedContent?: string[];
  dataReferences: Array<{ postId: string; relevance: string }>;
}
