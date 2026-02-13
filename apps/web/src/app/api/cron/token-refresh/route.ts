import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { TikTokAdapter } from "@contentos/content-engine/platforms/tiktok";
import { LinkedInAdapter } from "@contentos/content-engine/platforms/linkedin";

/**
 * Cron job: Refresh Facebook/Instagram/TikTok/LinkedIn access tokens before expiry.
 * Runs daily at 03:00 UTC.
 *
 * Each platform uses a different refresh mechanism:
 * - Meta (FB/IG): Exchange current long-lived token for a new one via fb_exchange_token grant
 * - TikTok: Standard refresh_token grant via TikTok OAuth API
 * - LinkedIn: Standard refresh_token grant via LinkedIn OAuth API
 *
 * If a refresh fails (token already expired or revoked), marks the account
 * with sync_status='error' so the UI can prompt reconnection.
 */

const META_GRAPH_API = "https://graph.facebook.com/v21.0";
const REFRESH_WINDOW_DAYS = 7;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();

    // Find tokens expiring within REFRESH_WINDOW_DAYS
    const expiryThreshold = new Date();
    expiryThreshold.setDate(expiryThreshold.getDate() + REFRESH_WINDOW_DAYS);

    const { data: accounts, error: accountsError } = await supabase
      .from("social_accounts")
      .select("id, platform, platform_user_id, platform_name, access_token, refresh_token, token_expires_at, organization_id")
      .eq("is_active", true)
      .in("platform", ["facebook", "instagram", "tiktok", "linkedin"])
      .not("token_expires_at", "is", null)
      .lt("token_expires_at", expiryThreshold.toISOString())
      .order("token_expires_at", { ascending: true });

    if (accountsError) {
      console.error("Cron token-refresh: failed to fetch accounts:", accountsError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({
        refreshed: 0,
        expired: 0,
        message: "No tokens need refreshing.",
      });
    }

    let refreshed = 0;
    let expired = 0;
    let errors = 0;

    // Track already-refreshed tokens to avoid duplicate refreshes
    // (Instagram accounts share the same page token as their Facebook page)
    const refreshedTokens = new Map<string, { accessToken: string; refreshToken?: string; expiresAt: string }>();

    for (const account of accounts) {
      const tokenKey = account.access_token;
      const isAlreadyExpired = new Date(account.token_expires_at) < new Date();

      if (isAlreadyExpired) {
        await supabase
          .from("social_accounts")
          .update({
            sync_status: "error",
            sync_error: "Token expirat. Reconecteaza contul.",
          })
          .eq("id", account.id);
        expired++;
        continue;
      }

      // Check if we already refreshed this exact token (FB+IG share tokens)
      const cached = refreshedTokens.get(tokenKey);
      if (cached) {
        await supabase
          .from("social_accounts")
          .update({
            access_token: cached.accessToken,
            ...(cached.refreshToken ? { refresh_token: cached.refreshToken } : {}),
            token_expires_at: cached.expiresAt,
            sync_status: "synced",
            sync_error: null,
          })
          .eq("id", account.id);
        refreshed++;
        continue;
      }

      try {
        let result: { accessToken: string; refreshToken?: string; expiresAt?: Date; expiresIn?: number };

        if (account.platform === "facebook" || account.platform === "instagram") {
          // Meta: exchange current long-lived token for a new one
          const appId = process.env.FACEBOOK_APP_ID || process.env.META_APP_ID || "";
          const appSecret = process.env.FACEBOOK_APP_SECRET || process.env.META_APP_SECRET || "";
          if (!appId || !appSecret) {
            console.error("Cron token-refresh: missing Meta credentials, skipping", account.platform);
            errors++;
            continue;
          }
          const metaResult = await exchangeForLongLivedToken({
            currentToken: account.access_token,
            appId,
            appSecret,
          });
          result = { accessToken: metaResult.accessToken, expiresIn: metaResult.expiresIn };
        } else if (account.platform === "tiktok") {
          // TikTok: standard refresh_token grant
          const clientKey = process.env.TIKTOK_CLIENT_KEY || "";
          const clientSecret = process.env.TIKTOK_CLIENT_SECRET || "";
          if (!clientKey || !clientSecret || !account.refresh_token) {
            console.error("Cron token-refresh: missing TikTok credentials or refresh_token");
            errors++;
            continue;
          }
          const adapter = new TikTokAdapter({ clientKey, clientSecret });
          result = await adapter.refreshAccessToken(account.refresh_token);
        } else if (account.platform === "linkedin") {
          // LinkedIn: standard refresh_token grant
          const clientId = process.env.LINKEDIN_CLIENT_ID || "";
          const clientSecret = process.env.LINKEDIN_CLIENT_SECRET || "";
          if (!clientId || !clientSecret || !account.refresh_token) {
            console.error("Cron token-refresh: missing LinkedIn credentials or refresh_token");
            errors++;
            continue;
          }
          const adapter = new LinkedInAdapter({ clientId, clientSecret });
          result = await adapter.refreshAccessToken(account.refresh_token);
        } else {
          continue;
        }

        const expiresAt = result.expiresAt
          ? result.expiresAt.toISOString()
          : new Date(Date.now() + (result.expiresIn || 5184000) * 1000).toISOString();

        // Cache the result for shared tokens
        refreshedTokens.set(tokenKey, {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresAt,
        });

        await supabase
          .from("social_accounts")
          .update({
            access_token: result.accessToken,
            ...(result.refreshToken ? { refresh_token: result.refreshToken } : {}),
            token_expires_at: expiresAt,
            sync_status: "synced",
            sync_error: null,
          })
          .eq("id", account.id);

        refreshed++;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(
          `Cron token-refresh: failed for ${account.platform} account ${account.platform_name}:`,
          message
        );

        if (message.includes("190") || message.includes("expired") || message.includes("invalid")) {
          await supabase
            .from("social_accounts")
            .update({
              sync_status: "error",
              sync_error: "Token invalid sau revocat. Reconecteaza contul.",
            })
            .eq("id", account.id);
          expired++;
        } else {
          errors++;
        }
      }
    }

    return NextResponse.json({
      totalAccounts: accounts.length,
      refreshed,
      expired,
      errors,
    });
  } catch (err) {
    console.error("Cron token-refresh error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ============================================================
// Meta Token Exchange
// ============================================================

async function exchangeForLongLivedToken(params: {
  currentToken: string;
  appId: string;
  appSecret: string;
}): Promise<{ accessToken: string; expiresIn: number }> {
  const queryParams = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: params.appId,
    client_secret: params.appSecret,
    fb_exchange_token: params.currentToken,
  });

  const res = await fetch(`${META_GRAPH_API}/oauth/access_token?${queryParams.toString()}`);
  const data = await res.json();

  if (data.error) {
    throw new Error(`Meta API error (${data.error.code}): ${data.error.message}`);
  }

  if (!data.access_token) {
    throw new Error("No access_token in Meta response");
  }

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in || 5184000, // Default 60 days
  };
}
