// packages/content-engine/src/platforms/tiktok.ts
// ============================================================
// TikTok Business API Adapter
// ============================================================

import type { PlatformAdapter, Post, ContentType } from "../types";

const TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_API = "https://open.tiktokapis.com/v2";

export class TikTokAdapter implements PlatformAdapter {
  platform = "tiktok" as const;

  private clientKey: string;
  private clientSecret: string;

  constructor(config: { clientKey: string; clientSecret: string }) {
    this.clientKey = config.clientKey;
    this.clientSecret = config.clientSecret;
  }

  getAuthUrl(redirectUri: string, scopes: string[] = []): string {
    const defaultScopes = [
      "user.info.basic",
      "user.info.stats",
      "video.list",
      "video.insights",
    ];
    const allScopes = [...new Set([...defaultScopes, ...scopes])];
    const csrfState = crypto.randomUUID();

    const params = new URLSearchParams({
      client_key: this.clientKey,
      scope: allScopes.join(","),
      response_type: "code",
      redirect_uri: redirectUri,
      state: csrfState,
    });

    return `${TIKTOK_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string, redirectUri: string) {
    const response = await fetch(`${TIKTOK_API}/oauth/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: this.clientKey,
        client_secret: this.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(`TikTok auth error: ${data.error_description}`);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async refreshAccessToken(refreshToken: string) {
    const response = await fetch(`${TIKTOK_API}/oauth/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: this.clientKey,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async getProfile(accessToken: string) {
    const response = await fetch(`${TIKTOK_API}/user/info/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: ["open_id", "union_id", "avatar_url", "display_name", "follower_count", "following_count", "video_count", "username"],
      }),
    });

    const { data } = await response.json();
    const user = data.user;

    return {
      id: user.open_id,
      username: user.username || user.display_name,
      name: user.display_name,
      avatarUrl: user.avatar_url,
      followersCount: user.follower_count || 0,
      followingCount: user.following_count || 0,
      postsCount: user.video_count || 0,
    };
  }

  async fetchPosts(accessToken: string, options: { limit?: number; after?: string } = {}) {
    const { limit = 20, after } = options;

    const body: Record<string, unknown> = {
      max_count: limit,
      fields: ["id", "title", "video_description", "create_time", "share_url", "duration", "cover_image_url", "like_count", "comment_count", "share_count", "view_count"],
    };
    if (after) body.cursor = after;

    const response = await fetch(`${TIKTOK_API}/video/list/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const { data } = await response.json();

    const posts = (data.videos || []).map((v: Record<string, unknown>) => ({
      platform: "tiktok" as const,
      platformPostId: v.id as string,
      platformUrl: v.share_url as string,
      contentType: "video" as ContentType,
      textContent: (v.video_description || v.title || "") as string,
      mediaUrls: v.cover_image_url ? [v.cover_image_url as string] : [],
      hashtags: this.extractHashtags((v.video_description || "") as string),
      mentions: [],
      language: "ro" as const,
      likesCount: (v.like_count || 0) as number,
      commentsCount: (v.comment_count || 0) as number,
      sharesCount: (v.share_count || 0) as number,
      savesCount: 0,
      viewsCount: (v.view_count || 0) as number,
      reachCount: 0,
      impressionsCount: 0,
      engagementRate: 0,
      viralityScore: 0,
      topicTags: [],
      sentiment: "neutral" as const,
      publishedAt: new Date((v.create_time as number) * 1000),
      rawData: v,
    }));

    return {
      posts,
      nextCursor: data.cursor ? String(data.cursor) : undefined,
      hasMore: data.has_more || false,
    };
  }

  private extractHashtags(text: string): string[] {
    const matches = text.match(/#[\wăâîșțĂÂÎȘȚ]+/g);
    return matches ? matches.map((h) => h.toLowerCase()) : [];
  }
}
