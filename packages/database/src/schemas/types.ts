// Database types - will be replaced with Drizzle ORM schemas when Supabase is connected

export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: "creator" | "agency" | "dental_clinic";
  plan: "free" | "starter" | "pro" | "agency" | "dental";
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
  role: "owner" | "admin" | "member";
  display_name?: string;
  avatar_url?: string;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SocialAccount {
  id: string;
  organization_id: string;
  platform: "facebook" | "instagram" | "tiktok" | "youtube" | "twitter";
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
  sync_status: "pending" | "syncing" | "synced" | "error";
  sync_error?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  social_account_id: string;
  organization_id: string;
  platform: string;
  platform_post_id: string;
  platform_url?: string;
  content_type: string;
  text_content?: string;
  media_urls: string[];
  hashtags: string[];
  likes_count: number;
  comments_count: number;
  shares_count: number;
  saves_count: number;
  views_count: number;
  reach_count: number;
  engagement_rate: number;
  algorithm_score?: Record<string, unknown>;
  published_at: string;
  dental_category?: string;
  created_at: string;
  updated_at: string;
}

export interface Draft {
  id: string;
  organization_id: string;
  created_by: string;
  title?: string;
  body: string;
  target_platforms: string[];
  platform_versions: Record<string, unknown>;
  algorithm_scores: Record<string, unknown>;
  status: "draft" | "scheduled" | "published";
  scheduled_at?: string;
  dental_category?: string;
  cmsr_compliant?: boolean;
  created_at: string;
  updated_at: string;
}
