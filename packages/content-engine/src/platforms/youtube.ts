// packages/content-engine/src/platforms/youtube.ts
// ============================================================
// YouTube Data API v3 Adapter
// ============================================================

import type { PlatformAdapter, Post, ContentType } from "../types";

const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export class YouTubeAdapter implements PlatformAdapter {
  platform = "youtube" as const;

  private clientId: string;
  private clientSecret: string;

  constructor(config: { clientId: string; clientSecret: string }) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
  }

  getAuthUrl(redirectUri: string, scopes: string[] = []): string {
    const defaultScopes = [
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/yt-analytics.readonly",
    ];
    const allScopes = [...new Set([...defaultScopes, ...scopes])];

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: allScopes.join(" "),
      access_type: "offline",
      prompt: "consent",
      state: crypto.randomUUID(),
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string, redirectUri: string) {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(`YouTube auth error: ${data.error_description}`);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async refreshAccessToken(refreshToken: string) {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: "refresh_token",
      }),
    });

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async getProfile(accessToken: string) {
    const params = new URLSearchParams({
      part: "snippet,statistics",
      mine: "true",
    });

    const response = await fetch(`${YOUTUBE_API}/channels?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await response.json();
    const channel = data.items?.[0];
    if (!channel) throw new Error("No YouTube channel found");

    return {
      id: channel.id,
      username: channel.snippet.customUrl?.replace("@", "") || channel.snippet.title,
      name: channel.snippet.title,
      avatarUrl: channel.snippet.thumbnails?.default?.url,
      followersCount: parseInt(channel.statistics.subscriberCount || "0"),
      followingCount: 0,
      postsCount: parseInt(channel.statistics.videoCount || "0"),
    };
  }

  async fetchPosts(accessToken: string, options: { limit?: number; after?: string } = {}) {
    const { limit = 25, after } = options;

    // Step 1: Get channel's uploads playlist
    const channelResponse = await fetch(
      `${YOUTUBE_API}/channels?part=contentDetails&mine=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const channelData = await channelResponse.json();
    const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylistId) return { posts: [], hasMore: false };

    // Step 2: Get videos from uploads playlist
    const params = new URLSearchParams({
      part: "snippet,contentDetails",
      playlistId: uploadsPlaylistId,
      maxResults: String(limit),
    });
    if (after) params.set("pageToken", after);

    const playlistResponse = await fetch(`${YOUTUBE_API}/playlistItems?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const playlistData = await playlistResponse.json();

    // Step 3: Get video statistics
    const videoIds = (playlistData.items || [])
      .map((item: Record<string, unknown>) => (item.contentDetails as Record<string, string>).videoId)
      .join(",");

    const statsResponse = await fetch(
      `${YOUTUBE_API}/videos?part=statistics,contentDetails&id=${videoIds}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const statsData = await statsResponse.json();
    const statsMap = new Map(
      (statsData.items || []).map((item: Record<string, unknown>) => [item.id, item.statistics])
    );

    const posts = (playlistData.items || []).map((item: Record<string, unknown>) => {
      const snippet = item.snippet as Record<string, unknown>;
      const videoId = (item.contentDetails as Record<string, string>).videoId;
      const stats = (statsMap.get(videoId) || {}) as Record<string, string>;
      const description = (snippet.description || "") as string;

      return {
        platform: "youtube" as const,
        platformPostId: videoId,
        platformUrl: `https://www.youtube.com/watch?v=${videoId}`,
        contentType: "video" as ContentType,
        textContent: `${snippet.title}\n\n${description}`,
        mediaUrls: [(snippet.thumbnails as Record<string, Record<string, string>>)?.high?.url || ""],
        hashtags: this.extractHashtags(description),
        mentions: [],
        language: "ro" as const,
        likesCount: parseInt(stats.likeCount || "0"),
        commentsCount: parseInt(stats.commentCount || "0"),
        sharesCount: 0,
        savesCount: parseInt(stats.favoriteCount || "0"),
        viewsCount: parseInt(stats.viewCount || "0"),
        reachCount: 0,
        impressionsCount: 0,
        engagementRate: 0,
        viralityScore: 0,
        topicTags: [],
        sentiment: "neutral" as const,
        publishedAt: new Date(snippet.publishedAt as string),
        rawData: { ...item, statistics: stats },
      };
    });

    return {
      posts,
      nextCursor: playlistData.nextPageToken,
      hasMore: !!playlistData.nextPageToken,
    };
  }

  private extractHashtags(text: string): string[] {
    const matches = text.match(/#[\wăâîșțĂÂÎȘȚ]+/g);
    return matches ? matches.map((h) => h.toLowerCase()) : [];
  }
}
