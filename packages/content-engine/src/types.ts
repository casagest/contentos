// packages/content-engine/src/types.ts
// ============================================================
// ContentOS Core Types
// ============================================================

import { z } from "zod";

// ============================================================
// PLATFORM TYPES
// ============================================================

export const PlatformSchema = z.enum([
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "twitter",
  "linkedin",
]);
export type Platform = z.infer<typeof PlatformSchema>;

export const ContentTypeSchema = z.enum([
  "text",
  "image",
  "video",
  "carousel",
  "reel",
  "story",
  "short",
  "article",
  "thread",
  "live",
]);
export type ContentType = z.infer<typeof ContentTypeSchema>;

export const LanguageSchema = z.enum(["ro", "en", "de", "hu"]);
export type Language = z.infer<typeof LanguageSchema>;

// ============================================================
// SOCIAL ACCOUNT
// ============================================================

export interface SocialAccount {
  id: string;
  organizationId: string;
  platform: Platform;
  platformUserId: string;
  platformUsername: string;
  platformName: string;
  avatarUrl?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  lastSyncedAt?: Date;
  syncStatus: "pending" | "syncing" | "synced" | "error";
}

// ============================================================
// POST (ingested from platforms)
// ============================================================

export interface Post {
  id: string;
  socialAccountId: string;
  organizationId: string;
  platform: Platform;
  platformPostId: string;
  platformUrl?: string;
  contentType: ContentType;
  textContent?: string;
  mediaUrls: string[];
  hashtags: string[];
  mentions: string[];
  language: Language;
  // Engagement
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  savesCount: number;
  viewsCount: number;
  reachCount: number;
  impressionsCount: number;
  // Computed
  engagementRate: number;
  viralityScore: number;
  // AI
  topicTags: string[];
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  hookType?: string;
  ctaType?: string;
  algorithmScore?: AlgorithmScore;
  aiAnalysis?: Record<string, unknown>;
  // Timing
  publishedAt: Date;
  // Dental
  dentalCategory?: DentalCategory;
}

// ============================================================
// ALGORITHM SCORING
// ============================================================

export interface AlgorithmScoreMetric {
  name: string;
  score: number; // 0-100
  weight: number; // Importance factor
  explanation: string;
  suggestion?: string;
}

export interface AlgorithmScore {
  platform: Platform;
  overallScore: number; // 0-100
  grade: "S" | "A" | "B" | "C" | "D" | "F";
  metrics: AlgorithmScoreMetric[];
  summary: string;
  improvements: string[];
  alternativeVersions?: string[];
}

// Facebook Algorithm Metrics
export const FACEBOOK_METRICS = [
  "engagement_bait_check",
  "share_probability",
  "comment_depth",
  "visual_quality",
  "text_optimization",
  "hashtag_relevance",
  "posting_time",
  "content_freshness",
  "community_interaction",
] as const;

// Instagram Algorithm Metrics
export const INSTAGRAM_METRICS = [
  "save_to_like_ratio",
  "reel_completion_rate",
  "hashtag_strategy",
  "caption_hook",
  "visual_consistency",
  "story_engagement",
  "carousel_swipe_rate",
  "bio_link_click",
  "explore_potential",
] as const;

// TikTok Algorithm Metrics
export const TIKTOK_METRICS = [
  "watch_time",
  "loop_rate",
  "share_to_view_ratio",
  "sound_trend_alignment",
  "hook_strength",
  "comment_bait",
  "duet_stitch_potential",
  "hashtag_challenge",
  "fyp_probability",
] as const;

// YouTube Algorithm Metrics
export const YOUTUBE_METRICS = [
  "click_through_rate",
  "audience_retention",
  "watch_time",
  "engagement_signals",
  "thumbnail_quality",
  "title_optimization",
  "description_seo",
  "end_screen_effectiveness",
  "community_post_boost",
] as const;

// ============================================================
// CONTENT GENERATION
// ============================================================

export interface ContentGenerationRequest {
  organizationId: string;
  input: string; // Raw text / brain dump
  inputType: "text" | "voice_transcript" | "inspiration_repurpose";
  targetPlatforms: Platform[];
  language: Language;
  tone?: "professional" | "casual" | "funny" | "educational" | "inspirational";
  contentTypes?: ContentType[];
  // Dental specific
  dentalCategory?: DentalCategory;
  includeHashtags?: boolean;
  includeEmoji?: boolean;
  maxLength?: number;
}

export interface ContentGenerationResult {
  platformVersions: Record<
    Platform,
    {
      text: string;
      hashtags: string[];
      contentType: ContentType;
      algorithmScore: AlgorithmScore;
      alternativeVersions: string[];
      mediasuggestions?: string[];
    }
  >;
  keyIdeas: string[];
  suggestedTopics: string[];
}

// ============================================================
// AI COACH
// ============================================================

export interface CoachContext {
  organizationId: string;
  platform?: Platform;
  recentPosts: Post[];
  topPerformingPosts: Post[];
  competitorInsights?: CompetitorInsight[];
  currentDraft?: string;
  question: string;
}

export interface CoachResponse {
  answer: string;
  actionItems: string[];
  suggestedContent?: string[];
  dataReferences: {
    postId: string;
    relevance: string;
  }[];
}

// ============================================================
// COMPETITOR ANALYSIS
// ============================================================

export interface CompetitorInsight {
  username: string;
  platform: Platform;
  followersCount: number;
  avgEngagementRate: number;
  postingFrequency: number; // per week
  topTopics: string[];
  contentStrategy: {
    primaryFormat: ContentType;
    bestPostingTimes: string[];
    hashtagStrategy: string;
    toneAnalysis: string;
  };
}

// ============================================================
// DENTAL VERTICAL
// ============================================================

export const DentalCategorySchema = z.enum([
  "before_after",
  "patient_testimonial",
  "procedure_education",
  "team_showcase",
  "clinic_tour",
  "dental_tip",
  "promotion",
  "event",
  "technology",
]);
export type DentalCategory = z.infer<typeof DentalCategorySchema>;

export interface DentalContentRequest extends ContentGenerationRequest {
  dentalCategory: DentalCategory;
  procedureType?: "all_on_x" | "implant" | "veneer" | "whitening" | "orthodontics" | "general";
  patientConsentId?: string;
  targetMarket?: "romania" | "uk" | "germany" | "eu";
  languages: Language[];
  cmsrCheck?: boolean;
}

export interface CMSRComplianceResult {
  isCompliant: boolean;
  violations: {
    rule: string;
    description: string;
    severity: "error" | "warning";
    suggestion: string;
  }[];
  suggestions: string[];
}

// ============================================================
// PLATFORM ADAPTER INTERFACE
// ============================================================

export interface PlatformAdapter {
  platform: Platform;

  // Authentication
  getAuthUrl(redirectUri: string, scopes: string[]): string;
  exchangeCodeForTokens(
    code: string,
    redirectUri: string
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  }>;
  refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  }>;

  // Profile
  getProfile(accessToken: string): Promise<{
    id: string;
    username: string;
    name: string;
    avatarUrl?: string;
    followersCount: number;
    followingCount: number;
    postsCount: number;
  }>;

  // Posts
  fetchPosts(
    accessToken: string,
    options: {
      limit?: number;
      after?: string; // cursor
      since?: Date;
    }
  ): Promise<{
    posts: Omit<Post, "id" | "organizationId" | "socialAccountId">[];
    nextCursor?: string;
    hasMore: boolean;
  }>;

  // Insights (if available)
  fetchPostInsights?(
    accessToken: string,
    postId: string
  ): Promise<{
    impressions: number;
    reach: number;
    engagement: number;
    saves?: number;
    shares?: number;
  }>;

  // Publishing (future feature)
  publishPost?(
    accessToken: string,
    content: {
      text: string;
      mediaUrls?: string[];
    }
  ): Promise<{ platformPostId: string; platformUrl: string }>;
}

// ============================================================
// INGESTION PIPELINE
// ============================================================

export interface IngestionJob {
  id: string;
  socialAccountId: string;
  organizationId: string;
  platform: Platform;
  status: "queued" | "running" | "completed" | "failed";
  postsIngested: number;
  postsTotal?: number;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface EmbeddingRequest {
  postId: string;
  textContent: string;
  platform: Platform;
  metadata: Record<string, unknown>;
}

// ============================================================
// ANALYTICS
// ============================================================

export interface AnalyticsSummary {
  period: "day" | "week" | "month";
  startDate: Date;
  endDate: Date;
  platforms: Record<
    Platform,
    {
      postsCount: number;
      totalEngagement: number;
      avgEngagementRate: number;
      followersGained: number;
      topPost: Post;
      bestPostingTime: string;
      topTopics: string[];
    }
  >;
  overallGrowthRate: number;
  recommendations: string[];
}
