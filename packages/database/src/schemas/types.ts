// Database types — mirrors contentos schema from supabase/migrations/002_full_schema.sql
// Will be replaced with Drizzle ORM schemas when Supabase is connected

// ============================================================
// Enums / union types
// ============================================================

export type OrganizationType = "creator" | "business" | "agency" | "dental_clinic";
export type Plan = "free" | "starter" | "pro" | "agency" | "dental";
export type UserRole = "owner" | "admin" | "member" | "viewer";
export type Platform = "facebook" | "instagram" | "tiktok" | "youtube" | "twitter";
export type SyncStatus = "pending" | "syncing" | "synced" | "error";

export type ContentType =
  | "text"
  | "image"
  | "video"
  | "carousel"
  | "reel"
  | "story"
  | "short"
  | "article"
  | "thread"
  | "live";

export type Sentiment = "positive" | "negative" | "neutral" | "mixed";

export type DraftStatus = "draft" | "reviewing" | "scheduled" | "published" | "archived";
export type DraftSource = "manual" | "braindump" | "repurpose" | "ai_generated" | "template";
export type BrainDumpInputType = "text" | "voice" | "image";
export type BrainDumpStatus = "pending" | "processing" | "completed" | "error";

export type DentalCategory =
  | "before_after"
  | "patient_testimonial"
  | "procedure_education"
  | "team_showcase"
  | "clinic_tour"
  | "dental_tip"
  | "promotion"
  | "event"
  | "technology";

// ============================================================
// Business Profile (stored in organizations.settings JSONB)
// ============================================================

export type Industry =
  | "dental"
  | "medical"
  | "restaurant"
  | "fitness"
  | "beauty"
  | "fashion"
  | "real_estate"
  | "education"
  | "tech"
  | "ecommerce"
  | "agency"
  | "turism"
  | "altele";

export type CommunicationTone =
  | "profesional"
  | "prietenos"
  | "amuzant"
  | "educativ"
  | "inspirational"
  | "provocator";

export type BusinessLanguage = "ro" | "en" | "de";

export type ComplianceRule = "cmsr_2025" | "anaf";

export interface BusinessProfile {
  name: string;
  description: string;
  industry: Industry;
  tones: CommunicationTone[];
  targetAudience: string;
  usps: string;
  avoidPhrases: string;
  preferredPhrases: string;
  language: BusinessLanguage;
  compliance: ComplianceRule[];
}

// ============================================================
// Table interfaces
// ============================================================

export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: OrganizationType;
  plan: Plan;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  medicalcor_clinic_id?: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  organization_id: string;
  role: UserRole;
  display_name?: string;
  avatar_url?: string;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SocialAccount {
  id: string;
  organization_id: string;
  platform: Platform;
  platform_user_id: string;
  platform_username?: string;
  platform_name?: string;
  avatar_url?: string;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
  last_synced_at?: string;
  sync_status: SyncStatus;
  sync_error?: string;
  raw_profile: Record<string, unknown>;
  settings: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  social_account_id: string;
  organization_id: string;
  platform: Platform;
  platform_post_id: string;
  platform_url?: string;
  content_type: ContentType;
  text_content?: string;
  media_urls: string[];
  hashtags: string[];
  mentions: string[];
  language: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  saves_count: number;
  views_count: number;
  reach_count: number;
  impressions_count: number;
  engagement_rate?: number;
  virality_score?: number;
  content_embedding?: number[];
  topic_tags: string[];
  sentiment?: Sentiment;
  hook_type?: string;
  cta_type?: string;
  algorithm_score?: Record<string, unknown>;
  ai_analysis: Record<string, unknown>;
  published_at: string;
  dental_category?: DentalCategory;
  raw_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Draft {
  id: string;
  organization_id: string;
  created_by: string;
  title?: string;
  body: string;
  media_urls: string[];
  hashtags: string[];
  target_platforms: Platform[];
  platform_versions: Record<string, unknown>;
  algorithm_scores: Record<string, unknown>;
  ai_suggestions: Record<string, unknown>;
  ai_coach_feedback?: string;
  status: DraftStatus;
  scheduled_at?: string;
  published_at?: string;
  source: DraftSource;
  source_post_id?: string;
  source_inspiration_id?: string;
  dental_category?: DentalCategory;
  requires_patient_consent: boolean;
  patient_consent_id?: string;
  cmsr_compliant?: boolean;
  cmsr_check_result?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Inspiration {
  id: string;
  organization_id: string;
  saved_by: string;
  platform: Platform;
  platform_post_id?: string;
  platform_url: string;
  author_username?: string;
  author_name?: string;
  text_content?: string;
  media_urls: string[];
  likes_count: number;
  shares_count: number;
  views_count: number;
  content_embedding?: number[];
  why_it_works?: string;
  repurpose_ideas: Record<string, unknown>;
  folder: string;
  tags: string[];
  notes?: string;
  created_at: string;
}

export interface ScrapeCache {
  id: string;
  organization_id: string;
  created_by?: string;
  url: string;
  url_hash: string;
  source: "firecrawl" | "fallback";
  title?: string;
  description?: string;
  content: string;
  metadata: Record<string, unknown>;
  fetched_at: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface ResearchAnalysis {
  id: string;
  organization_id: string;
  created_by: string;
  url: string;
  url_hash: string;
  platform: Platform;
  username?: string;
  mode: "ai" | "deterministic";
  scrape_source: "firecrawl" | "fallback";
  summary: string;
  content_strategy: string;
  top_topics: string[];
  best_posting_times: string[];
  recommendations: string[];
  raw_result: Record<string, unknown>;
  cached_from_id?: string;
  created_at: string;
  updated_at: string;
}

export interface AIUsageEvent {
  id: string;
  organization_id: string;
  user_id?: string;
  route_key: string;
  intent_hash?: string;
  provider: string;
  model: string;
  mode: "ai" | "deterministic";
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  latency_ms: number;
  success: boolean;
  cache_hit: boolean;
  budget_fallback: boolean;
  error_code?: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AIRequestCache {
  id: string;
  organization_id: string;
  created_by?: string;
  route_key: string;
  intent_hash: string;
  provider: string;
  model: string;
  response_json: Record<string, unknown>;
  estimated_cost_usd: number;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export interface DecisionLog {
  id: string;
  organization_id: string;
  user_id?: string;
  draft_id?: string;
  post_id?: string;
  route_key: string;
  decision_type: string;
  objective: "engagement" | "reach" | "leads" | "saves";
  provider: string;
  model: string;
  mode: "ai" | "deterministic";
  platform?: Platform;
  selected_variant?: string;
  expected_score?: number;
  projected_uplift?: number;
  estimated_cost_usd: number;
  roi_multiple?: number;
  decision_context: Record<string, unknown>;
  created_at: string;
}

export interface OutcomeEvent {
  id: string;
  organization_id: string;
  social_account_id?: string;
  post_id: string;
  platform: Platform;
  objective: "engagement" | "reach" | "leads" | "saves";
  event_type: "published" | "snapshot" | "manual";
  source: "publish" | "sync" | "manual";
  recorded_at: string;
  published_at?: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  saves_count: number;
  views_count: number;
  reach_count: number;
  impressions_count: number;
  engagement_rate?: number;
  metrics_hash?: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CreativeMemory {
  id: string;
  organization_id: string;
  platform: Platform;
  objective: "engagement" | "reach" | "leads" | "saves";
  memory_key: string;
  hook_type?: string;
  framework?: string;
  cta_type?: string;
  sample_size: number;
  success_count: number;
  total_engagement: number;
  avg_engagement: number;
  last_post_id?: string;
  last_outcome_at?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface BrainDump {
  id: string;
  organization_id: string;
  created_by: string;
  input_type: BrainDumpInputType;
  raw_input: string;
  voice_audio_url?: string;
  processed_content: Record<string, unknown>;
  status: BrainDumpStatus;
  generated_draft_ids: string[];
  created_at: string;
}

export interface AnalyticsDaily {
  id: string;
  organization_id: string;
  social_account_id: string;
  date: string;
  posts_count: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  total_views: number;
  total_reach: number;
  avg_engagement_rate?: number;
  top_post_id?: string;
  top_post_engagement?: number;
  followers_count: number;
  followers_gained: number;
  followers_lost: number;
  net_followers: number;
  created_at: string;
}

export interface CoachConversation {
  id: string;
  organization_id: string;
  user_id: string;
  title?: string;
  messages: Record<string, unknown>[];
  context_post_ids: string[];
  context_platform?: Platform;
  context: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Template {
  id: string;
  organization_id?: string;
  name: string;
  description?: string;
  category: string;
  platforms: Platform[];
  template_body: string;
  template_variables: Record<string, unknown>;
  example_output?: string;
  is_dental: boolean;
  dental_category?: DentalCategory;
  cmsr_approved: boolean;
  usage_count: number;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
}

export interface TrackedCompetitor {
  id: string;
  organization_id: string;
  platform: Platform;
  platform_user_id: string;
  platform_username: string;
  display_name?: string;
  followers_count: number;
  avg_engagement_rate?: number;
  posting_frequency?: number;
  top_topics: string[];
  content_strategy: Record<string, unknown>;
  last_analyzed_at?: string;
  created_at: string;
}

// ============================================================
// Utility types for inserts / updates
// ============================================================

/** Make all fields optional except `id`, useful for UPDATE payloads */
type Updatable<T> = Partial<Omit<T, "id" | "created_at">> & { id: string };

export type OrganizationUpdate = Updatable<Organization>;
export type UserUpdate = Updatable<User>;
export type SocialAccountUpdate = Updatable<SocialAccount>;
export type PostUpdate = Updatable<Post>;
export type DraftUpdate = Updatable<Draft>;

/** Omit server-generated fields for INSERT payloads */
type Insertable<T> = Omit<T, "id" | "created_at" | "updated_at">;

export type OrganizationInsert = Insertable<Organization>;
export type UserInsert = Insertable<User> & { id: string }; // id comes from auth.users
export type SocialAccountInsert = Insertable<SocialAccount>;
export type PostInsert = Insertable<Post>;
export type DraftInsert = Insertable<Draft>;
export type InspirationInsert = Omit<Inspiration, "id" | "created_at">;
export type ScrapeCacheInsert = Omit<ScrapeCache, "id" | "created_at" | "updated_at">;
export type ResearchAnalysisInsert = Omit<ResearchAnalysis, "id" | "created_at" | "updated_at">;
export type AIUsageEventInsert = Omit<AIUsageEvent, "id" | "created_at">;
export type AIRequestCacheInsert = Omit<AIRequestCache, "id" | "created_at" | "updated_at">;
export type DecisionLogInsert = Omit<DecisionLog, "id" | "created_at">;
export type OutcomeEventInsert = Omit<OutcomeEvent, "id" | "created_at">;
export type CreativeMemoryInsert = Omit<CreativeMemory, "id" | "created_at" | "updated_at">;
export type BrainDumpInsert = Omit<BrainDump, "id" | "created_at">;
export type CoachConversationInsert = Omit<CoachConversation, "id" | "created_at" | "updated_at">;
export type TemplateInsert = Omit<Template, "id" | "created_at">;
export type TrackedCompetitorInsert = Omit<TrackedCompetitor, "id" | "created_at">;
