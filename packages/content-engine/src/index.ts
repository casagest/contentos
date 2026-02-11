// packages/content-engine/src/index.ts
// ============================================================
// ContentOS Content Engine — Main Exports
// ============================================================

// Types
export type {
  Platform,
  ContentType,
  Language,
  SocialAccount,
  Post,
  AlgorithmScore,
  AlgorithmScoreMetric,
  ContentGenerationRequest,
  ContentGenerationResult,
  CoachContext,
  CoachResponse,
  CompetitorInsight,
  DentalCategory,
  DentalContentRequest,
  CMSRComplianceResult,
  PlatformAdapter,
  IngestionJob,
  EmbeddingRequest,
  AnalyticsSummary,
} from "./types";

export {
  PlatformSchema,
  ContentTypeSchema,
  LanguageSchema,
  DentalCategorySchema,
  FACEBOOK_METRICS,
  INSTAGRAM_METRICS,
  TIKTOK_METRICS,
  YOUTUBE_METRICS,
} from "./types";

// AI Service
export { ContentAIService } from "./ai/service";

// Platform Adapters
export { FacebookAdapter, InstagramAdapter, MetaAPIError } from "./platforms/meta";
export { TikTokAdapter } from "./platforms/tiktok";
export { YouTubeAdapter } from "./platforms/youtube";

// Prompts (for customization)
export {
  BASE_SYSTEM_PROMPT,
  PLATFORM_PROMPTS,
  DENTAL_PROMPTS,
  buildCoachPrompt,
  buildGenerationPrompt,
  buildScoringPrompt,
  CMSR_COMPLIANCE_PROMPT,
} from "./ai/prompts/system";

// Scraping (Firecrawl)
export { FirecrawlService, FirecrawlError } from "./scraping/firecrawl";
export type {
  FirecrawlScrapeOptions,
  FirecrawlScrapeResult,
  FirecrawlMetadata,
} from "./scraping/firecrawl";
