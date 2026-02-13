// packages/content-engine/src/platforms/linkedin.ts
// ============================================================
// LinkedIn API v2 Adapter
// ============================================================

import type { PlatformAdapter, ContentType } from "../types";

const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_API = "https://api.linkedin.com";

export class LinkedInAPIError extends Error {
  constructor(
    public code: number,
    message: string
  ) {
    super(message);
    this.name = "LinkedInAPIError";
  }
}

export class LinkedInAdapter implements PlatformAdapter {
  platform = "linkedin" as const;

  private clientId: string;
  private clientSecret: string;

  constructor(config: { clientId: string; clientSecret: string }) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
  }

  getAuthUrl(redirectUri: string, scopes: string[] = []): string {
    const defaultScopes = ["openid", "profile", "w_member_social"];
    const allScopes = [...new Set([...defaultScopes, ...scopes])];
    const state = crypto.randomUUID();

    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: allScopes.join(" "),
      state,
    });

    return `${LINKEDIN_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string, redirectUri: string) {
    const response = await fetch(LINKEDIN_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    const data = await response.json();
    if (data.error) {
      throw new LinkedInAPIError(
        response.status,
        `LinkedIn auth error: ${data.error_description || data.error}`
      );
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + (data.expires_in || 5184000) * 1000),
    };
  }

  async refreshAccessToken(refreshToken: string) {
    const response = await fetch(LINKEDIN_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    const data = await response.json();
    if (data.error) {
      throw new LinkedInAPIError(
        response.status,
        `LinkedIn refresh error: ${data.error_description || data.error}`
      );
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: new Date(Date.now() + (data.expires_in || 5184000) * 1000),
    };
  }

  async getProfile(accessToken: string) {
    const response = await fetch(`${LINKEDIN_API}/v2/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await response.json();
    if (data.status && data.status >= 400) {
      throw new LinkedInAPIError(data.status, data.message || "Profile fetch failed");
    }

    return {
      id: data.sub,
      username: data.email || data.name || data.sub,
      name: data.name || `${data.given_name || ""} ${data.family_name || ""}`.trim(),
      avatarUrl: data.picture,
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
    };
  }

  async fetchPosts(
    accessToken: string,
    options: { limit?: number; after?: string } = {}
  ) {
    const { limit = 25 } = options;
    const personUrn = await this.getPersonUrn(accessToken);

    const params = new URLSearchParams({
      q: "authors",
      authors: `List(${personUrn})`,
      count: String(limit),
    });

    const response = await fetch(`${LINKEDIN_API}/v2/ugcPosts?${params}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "LinkedIn-Version": "202401",
      },
    });

    const data = await response.json();

    if (data.status && data.status >= 400) {
      return { posts: [], hasMore: false };
    }

    const posts = (data.elements || []).map(
      (post: {
        id: string;
        specificContent?: {
          "com.linkedin.ugc.ShareContent"?: {
            shareCommentary?: { text: string };
            shareMediaCategory?: string;
          };
        };
        created?: { time: number };
      }) => {
        const shareContent =
          post.specificContent?.["com.linkedin.ugc.ShareContent"];
        const text = shareContent?.shareCommentary?.text || "";
        const mediaCategory = shareContent?.shareMediaCategory || "NONE";

        let contentType: ContentType = "text";
        if (mediaCategory === "IMAGE") contentType = "image";
        else if (mediaCategory === "VIDEO") contentType = "video";

        return {
          platform: "linkedin" as const,
          platformPostId: post.id,
          platformUrl: `https://www.linkedin.com/feed/update/${post.id}`,
          contentType,
          textContent: text,
          mediaUrls: [],
          hashtags: this.extractHashtags(text),
          mentions: this.extractMentions(text),
          language: "ro" as const,
          likesCount: 0,
          commentsCount: 0,
          sharesCount: 0,
          savesCount: 0,
          viewsCount: 0,
          reachCount: 0,
          impressionsCount: 0,
          engagementRate: 0,
          viralityScore: 0,
          topicTags: [],
          sentiment: "neutral" as const,
          publishedAt: post.created?.time
            ? new Date(post.created.time)
            : new Date(),
          rawData: post,
        };
      }
    );

    return { posts, nextCursor: undefined, hasMore: false };
  }

  async publishPost(
    accessToken: string,
    content: { text: string; mediaUrls?: string[] }
  ): Promise<{ platformPostId: string; platformUrl: string }> {
    const personUrn = await this.getPersonUrn(accessToken);

    const imageExts = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const imageUrls = content.mediaUrls?.filter((url) =>
      imageExts.some((ext) => url.toLowerCase().split("?")[0].endsWith(ext))
    );

    if (imageUrls && imageUrls.length > 0) {
      return this.publishImagePost(accessToken, personUrn, content.text, imageUrls);
    }

    return this.publishTextPost(accessToken, personUrn, content.text);
  }

  // ============================================================
  // Private helpers
  // ============================================================

  private async getPersonUrn(accessToken: string): Promise<string> {
    const profile = await this.getProfile(accessToken);
    const id = profile.id;
    return id.startsWith("urn:") ? id : `urn:li:person:${id}`;
  }

  private async publishTextPost(
    accessToken: string,
    authorUrn: string,
    text: string
  ): Promise<{ platformPostId: string; platformUrl: string }> {
    const response = await fetch(`${LINKEDIN_API}/rest/posts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202401",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: authorUrn,
        commentary: text,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: "PUBLISHED",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new LinkedInAPIError(
        response.status,
        `LinkedIn publish failed: ${(errorData as { message?: string }).message || response.statusText}`
      );
    }

    const postId = response.headers.get("x-restli-id") || "";

    return {
      platformPostId: postId,
      platformUrl: `https://www.linkedin.com/feed/update/${postId}`,
    };
  }

  private async publishImagePost(
    accessToken: string,
    authorUrn: string,
    text: string,
    imageUrls: string[]
  ): Promise<{ platformPostId: string; platformUrl: string }> {
    const imageAssets: string[] = [];

    for (const imageUrl of imageUrls) {
      const registerResponse = await fetch(
        `${LINKEDIN_API}/rest/images?action=initializeUpload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "LinkedIn-Version": "202401",
          },
          body: JSON.stringify({
            initializeUploadRequest: { owner: authorUrn },
          }),
        }
      );

      const registerData = await registerResponse.json();
      const uploadUrl = registerData.value?.uploadUrl;
      const imageUrn = registerData.value?.image;

      if (!uploadUrl || !imageUrn) {
        throw new LinkedInAPIError(400, "LinkedIn image upload registration failed");
      }

      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();

      await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/octet-stream",
        },
        body: imageBuffer,
      });

      imageAssets.push(imageUrn);
    }

    const images = imageAssets.map((asset) => ({ id: asset }));

    const response = await fetch(`${LINKEDIN_API}/rest/posts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202401",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: authorUrn,
        commentary: text,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: "PUBLISHED",
        content: {
          multiImage: { images },
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new LinkedInAPIError(
        response.status,
        `LinkedIn image publish failed: ${(errorData as { message?: string }).message || response.statusText}`
      );
    }

    const postId = response.headers.get("x-restli-id") || "";

    return {
      platformPostId: postId,
      platformUrl: `https://www.linkedin.com/feed/update/${postId}`,
    };
  }

  private extractHashtags(text: string): string[] {
    const matches = text.match(/#[\w\u0103\u00e2\u00ee\u0219\u021b\u0102\u00c2\u00ce\u0218\u021a]+/g);
    return matches ? matches.map((h) => h.toLowerCase()) : [];
  }

  private extractMentions(text: string): string[] {
    const matches = text.match(/@[\w.]+/g);
    return matches ? matches.map((m) => m.toLowerCase()) : [];
  }
}
