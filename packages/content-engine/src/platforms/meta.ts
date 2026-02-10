// packages/content-engine/src/platforms/meta.ts
// ============================================================
// Meta Platform Adapter (Facebook Pages + Instagram Business)
// ============================================================

import type { PlatformAdapter, Post, ContentType } from "../types";

const META_GRAPH_API = "https://graph.facebook.com/v21.0";
const META_AUTH_URL = "https://www.facebook.com/v21.0/dialog/oauth";

// ============================================================
// FACEBOOK ADAPTER
// ============================================================

export class FacebookAdapter implements PlatformAdapter {
  platform = "facebook" as const;

  private appId: string;
  private appSecret: string;

  constructor(config: { appId: string; appSecret: string }) {
    this.appId = config.appId;
    this.appSecret = config.appSecret;
  }

  // ----------------------------------------------------------
  // Authentication
  // ----------------------------------------------------------

  getAuthUrl(redirectUri: string, scopes: string[] = []): string {
    const defaultScopes = [
      "pages_show_list",
      "pages_read_engagement",
      "pages_read_user_content",
      "pages_manage_posts",
      "read_insights",
      "instagram_basic",
      "instagram_manage_insights",
      "instagram_content_publish",
      "business_management",
    ];

    const allScopes = [...new Set([...defaultScopes, ...scopes])];

    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: redirectUri,
      scope: allScopes.join(","),
      response_type: "code",
      state: crypto.randomUUID(), // CSRF protection
    });

    return `${META_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForTokens(
    code: string,
    redirectUri: string
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  }> {
    // Step 1: Exchange code for short-lived token
    const tokenUrl = `${META_GRAPH_API}/oauth/access_token`;
    const params = new URLSearchParams({
      client_id: this.appId,
      client_secret: this.appSecret,
      redirect_uri: redirectUri,
      code,
    });

    const response = await fetch(`${tokenUrl}?${params.toString()}`);
    if (!response.ok) {
      const error = await response.json();
      throw new MetaAPIError("Token exchange failed", error);
    }

    const data = await response.json();

    // Step 2: Exchange for long-lived token (60 days)
    const longLivedToken = await this.getLongLivedToken(data.access_token);

    return {
      accessToken: longLivedToken.accessToken,
      expiresAt: longLivedToken.expiresAt,
    };
  }

  private async getLongLivedToken(shortLivedToken: string): Promise<{
    accessToken: string;
    expiresAt: Date;
  }> {
    const params = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: this.appId,
      client_secret: this.appSecret,
      fb_exchange_token: shortLivedToken,
    });

    const response = await fetch(
      `${META_GRAPH_API}/oauth/access_token?${params.toString()}`
    );
    if (!response.ok) {
      throw new MetaAPIError("Long-lived token exchange failed", await response.json());
    }

    const data = await response.json();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    return { accessToken: data.access_token, expiresAt };
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  }> {
    // Meta uses long-lived tokens that can be refreshed before expiry
    // by exchanging the current long-lived token for a new one
    return this.getLongLivedToken(refreshToken);
  }

  // ----------------------------------------------------------
  // Profile
  // ----------------------------------------------------------

  async getProfile(accessToken: string): Promise<{
    id: string;
    username: string;
    name: string;
    avatarUrl?: string;
    followersCount: number;
    followingCount: number;
    postsCount: number;
  }> {
    // First, get the user's pages
    const pagesResponse = await this.graphRequest(
      "/me/accounts",
      accessToken,
      { fields: "id,name,username,picture,fan_count,followers_count" }
    );

    if (!pagesResponse.data || pagesResponse.data.length === 0) {
      throw new MetaAPIError("No Facebook Pages found", {});
    }

    // Return first page (user can select later in UI)
    const page = pagesResponse.data[0];

    return {
      id: page.id,
      username: page.username || page.name.toLowerCase().replace(/\s+/g, ""),
      name: page.name,
      avatarUrl: page.picture?.data?.url,
      followersCount: page.followers_count || page.fan_count || 0,
      followingCount: 0, // Pages don't have following count
      postsCount: 0, // Will be populated during sync
    };
  }

  // ----------------------------------------------------------
  // Posts Fetching
  // ----------------------------------------------------------

  async fetchPosts(
    accessToken: string,
    options: {
      limit?: number;
      after?: string;
      since?: Date;
      pageId?: string;
    } = {}
  ): Promise<{
    posts: Omit<Post, "id" | "organizationId" | "socialAccountId">[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    const { limit = 25, after, since, pageId } = options;

    // Get Page access token if we have a user token
    const pageToken = pageId
      ? await this.getPageAccessToken(accessToken, pageId)
      : accessToken;

    const fields = [
      "id",
      "message",
      "story",
      "full_picture",
      "type",
      "created_time",
      "permalink_url",
      "shares",
      "attachments{media_type,url,media}",
      "insights.metric(post_impressions,post_engaged_users,post_clicks,post_reactions_like_total)",
    ].join(",");

    const params: Record<string, string> = {
      fields,
      limit: String(limit),
    };

    if (after) params.after = after;
    if (since) params.since = String(Math.floor(since.getTime() / 1000));

    const endpoint = pageId ? `/${pageId}/feed` : "/me/feed";
    const response = await this.graphRequest(endpoint, pageToken, params);

    const posts = (response.data || []).map(
      (item: MetaPostRaw) => this.transformPost(item)
    );

    return {
      posts,
      nextCursor: response.paging?.cursors?.after,
      hasMore: !!response.paging?.next,
    };
  }

  async fetchPostInsights(
    accessToken: string,
    postId: string
  ): Promise<{
    impressions: number;
    reach: number;
    engagement: number;
    saves?: number;
    shares?: number;
  }> {
    const metrics = [
      "post_impressions",
      "post_impressions_unique", // reach
      "post_engaged_users",
      "post_clicks",
      "post_reactions_like_total",
    ].join(",");

    const response = await this.graphRequest(
      `/${postId}/insights`,
      accessToken,
      { metric: metrics }
    );

    const data = response.data || [];
    const getValue = (name: string) =>
      data.find((d: { name: string }) => d.name === name)?.values?.[0]?.value || 0;

    return {
      impressions: getValue("post_impressions"),
      reach: getValue("post_impressions_unique"),
      engagement: getValue("post_engaged_users"),
      shares: getValue("post_clicks"),
    };
  }

  // ----------------------------------------------------------
  // Helper Methods
  // ----------------------------------------------------------

  private async getPageAccessToken(
    userToken: string,
    pageId: string
  ): Promise<string> {
    const response = await this.graphRequest(`/${pageId}`, userToken, {
      fields: "access_token",
    });
    return response.access_token;
  }

  private transformPost(
    raw: MetaPostRaw
  ): Omit<Post, "id" | "organizationId" | "socialAccountId"> {
    const contentType = this.detectContentType(raw);
    const text = raw.message || raw.story || "";
    const hashtags = this.extractHashtags(text);
    const mentions = this.extractMentions(text);

    // Extract engagement from insights if available
    const insights = raw.insights?.data || [];
    const getInsight = (name: string) =>
      insights.find((i: { name: string }) => i.name === name)?.values?.[0]?.value || 0;

    return {
      platform: "facebook",
      platformPostId: raw.id,
      platformUrl: raw.permalink_url,
      contentType,
      textContent: text,
      mediaUrls: raw.full_picture ? [raw.full_picture] : [],
      hashtags,
      mentions,
      language: "ro", // Will be detected by AI later
      likesCount: getInsight("post_reactions_like_total"),
      commentsCount: 0, // Need separate API call
      sharesCount: raw.shares?.count || 0,
      savesCount: 0,
      viewsCount: 0,
      reachCount: getInsight("post_impressions_unique"),
      impressionsCount: getInsight("post_impressions"),
      engagementRate: 0, // Computed by DB trigger
      viralityScore: 0, // Computed by DB trigger
      topicTags: [],
      sentiment: "neutral",
      algorithmScore: undefined,
      publishedAt: new Date(raw.created_time),
      rawData: raw,
    } as Omit<Post, "id" | "organizationId" | "socialAccountId">;
  }

  private detectContentType(raw: MetaPostRaw): ContentType {
    const mediaType = raw.attachments?.data?.[0]?.media_type;
    if (mediaType === "video") return "video";
    if (mediaType === "album") return "carousel";
    if (raw.full_picture) return "image";
    return "text";
  }

  private extractHashtags(text: string): string[] {
    const matches = text.match(/#[\wăâîșțĂÂÎȘȚ]+/g);
    return matches ? matches.map((h) => h.toLowerCase()) : [];
  }

  private extractMentions(text: string): string[] {
    const matches = text.match(/@[\w.]+/g);
    return matches ? matches.map((m) => m.toLowerCase()) : [];
  }

  private async graphRequest(
    endpoint: string,
    accessToken: string,
    params: Record<string, string> = {}
  ): Promise<Record<string, unknown>> {
    const url = new URL(`${META_GRAPH_API}${endpoint}`);
    url.searchParams.set("access_token", accessToken);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.error) {
      throw new MetaAPIError(data.error.message, data.error);
    }

    return data;
  }
}

// ============================================================
// INSTAGRAM ADAPTER (via Meta Graph API)
// ============================================================

export class InstagramAdapter implements PlatformAdapter {
  platform = "instagram" as const;

  private appId: string;
  private appSecret: string;

  constructor(config: { appId: string; appSecret: string }) {
    this.appId = config.appId;
    this.appSecret = config.appSecret;
  }

  getAuthUrl(redirectUri: string, scopes: string[] = []): string {
    // Instagram uses Facebook OAuth - same flow
    const fb = new FacebookAdapter({
      appId: this.appId,
      appSecret: this.appSecret,
    });
    return fb.getAuthUrl(redirectUri, [
      ...scopes,
      "instagram_basic",
      "instagram_manage_insights",
      "instagram_content_publish",
    ]);
  }

  async exchangeCodeForTokens(code: string, redirectUri: string) {
    const fb = new FacebookAdapter({
      appId: this.appId,
      appSecret: this.appSecret,
    });
    return fb.exchangeCodeForTokens(code, redirectUri);
  }

  async refreshAccessToken(refreshToken: string) {
    const fb = new FacebookAdapter({
      appId: this.appId,
      appSecret: this.appSecret,
    });
    return fb.refreshAccessToken(refreshToken);
  }

  async getProfile(accessToken: string) {
    // Get Instagram Business Account linked to Facebook Page
    const pagesResponse = await this.graphRequest(
      "/me/accounts",
      accessToken,
      { fields: "instagram_business_account{id,username,name,profile_picture_url,followers_count,follows_count,media_count}" }
    );

    const page = pagesResponse.data?.[0];
    const ig = page?.instagram_business_account;

    if (!ig) {
      throw new MetaAPIError("No Instagram Business Account found. Make sure your Instagram is connected to a Facebook Page.", {});
    }

    return {
      id: ig.id,
      username: ig.username,
      name: ig.name || ig.username,
      avatarUrl: ig.profile_picture_url,
      followersCount: ig.followers_count || 0,
      followingCount: ig.follows_count || 0,
      postsCount: ig.media_count || 0,
    };
  }

  async fetchPosts(
    accessToken: string,
    options: {
      limit?: number;
      after?: string;
      since?: Date;
      igAccountId?: string;
    } = {}
  ) {
    const { limit = 25, after, igAccountId } = options;

    if (!igAccountId) {
      throw new MetaAPIError("Instagram Account ID required", {});
    }

    const fields = [
      "id",
      "caption",
      "media_type",
      "media_url",
      "thumbnail_url",
      "permalink",
      "timestamp",
      "like_count",
      "comments_count",
      "insights.metric(impressions,reach,saved,shares)",
    ].join(",");

    const params: Record<string, string> = {
      fields,
      limit: String(limit),
    };
    if (after) params.after = after;

    const response = await this.graphRequest(
      `/${igAccountId}/media`,
      accessToken,
      params
    );

    const posts = (response.data || []).map(
      (item: IGPostRaw) => this.transformPost(item)
    );

    return {
      posts,
      nextCursor: response.paging?.cursors?.after,
      hasMore: !!response.paging?.next,
    };
  }

  private transformPost(
    raw: IGPostRaw
  ): Omit<Post, "id" | "organizationId" | "socialAccountId"> {
    const contentType = this.detectContentType(raw.media_type);
    const text = raw.caption || "";
    const hashtags = this.extractHashtags(text);
    const mentions = this.extractMentions(text);

    const insights = raw.insights?.data || [];
    const getInsight = (name: string) =>
      insights.find((i: { name: string }) => i.name === name)?.values?.[0]?.value || 0;

    return {
      platform: "instagram",
      platformPostId: raw.id,
      platformUrl: raw.permalink,
      contentType,
      textContent: text,
      mediaUrls: [raw.media_url || raw.thumbnail_url].filter(Boolean) as string[],
      hashtags,
      mentions,
      language: "ro",
      likesCount: raw.like_count || 0,
      commentsCount: raw.comments_count || 0,
      sharesCount: getInsight("shares"),
      savesCount: getInsight("saved"),
      viewsCount: 0,
      reachCount: getInsight("reach"),
      impressionsCount: getInsight("impressions"),
      engagementRate: 0,
      viralityScore: 0,
      topicTags: [],
      sentiment: "neutral",
      publishedAt: new Date(raw.timestamp),
      rawData: raw,
    } as Omit<Post, "id" | "organizationId" | "socialAccountId">;
  }

  private detectContentType(mediaType: string): ContentType {
    switch (mediaType) {
      case "VIDEO":
        return "reel";
      case "CAROUSEL_ALBUM":
        return "carousel";
      case "IMAGE":
      default:
        return "image";
    }
  }

  private extractHashtags(text: string): string[] {
    const matches = text.match(/#[\wăâîșțĂÂÎȘȚ]+/g);
    return matches ? matches.map((h) => h.toLowerCase()) : [];
  }

  private extractMentions(text: string): string[] {
    const matches = text.match(/@[\w.]+/g);
    return matches ? matches.map((m) => m.toLowerCase()) : [];
  }

  private async graphRequest(
    endpoint: string,
    accessToken: string,
    params: Record<string, string> = {}
  ): Promise<Record<string, unknown>> {
    const url = new URL(`${META_GRAPH_API}${endpoint}`);
    url.searchParams.set("access_token", accessToken);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.error) {
      throw new MetaAPIError(data.error.message, data.error);
    }

    return data;
  }
}

// ============================================================
// ERROR HANDLING
// ============================================================

export class MetaAPIError extends Error {
  public code: number;
  public subcode?: number;
  public fbTraceId?: string;

  constructor(message: string, errorData: Record<string, unknown>) {
    super(message);
    this.name = "MetaAPIError";
    this.code = (errorData.code as number) || 0;
    this.subcode = errorData.error_subcode as number;
    this.fbTraceId = errorData.fbtrace_id as string;
  }

  isTokenExpired(): boolean {
    return this.code === 190;
  }

  isRateLimited(): boolean {
    return this.code === 4 || this.code === 32;
  }

  isPermissionDenied(): boolean {
    return this.code === 200 || this.code === 10;
  }
}

// ============================================================
// RAW TYPES (Meta API responses)
// ============================================================

interface MetaPostRaw {
  id: string;
  message?: string;
  story?: string;
  full_picture?: string;
  type?: string;
  created_time: string;
  permalink_url?: string;
  shares?: { count: number };
  attachments?: {
    data: Array<{
      media_type: string;
      url: string;
      media: Record<string, unknown>;
    }>;
  };
  insights?: {
    data: Array<{
      name: string;
      values: Array<{ value: number }>;
    }>;
  };
}

interface IGPostRaw {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
  insights?: {
    data: Array<{
      name: string;
      values: Array<{ value: number }>;
    }>;
  };
}
