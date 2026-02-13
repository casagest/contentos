import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Cron job: Refresh Facebook/Instagram access tokens before expiry.
 * Runs daily at 03:00 UTC.
 *
 * Meta long-lived tokens last ~60 days. This cron:
 * 1. Finds tokens expiring within 7 days
 * 2. Exchanges each for a new long-lived token via Meta Graph API
 * 3. Updates social_accounts with the new token + expiry
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

  const appId = process.env.FACEBOOK_APP_ID || process.env.META_APP_ID || "";
  const appSecret = process.env.FACEBOOK_APP_SECRET || process.env.META_APP_SECRET || "";

  if (!appId || !appSecret) {
    return NextResponse.json({ error: "Missing Meta app credentials" }, { status: 500 });
  }

  try {
    const supabase = createServiceClient();

    // Find tokens expiring within REFRESH_WINDOW_DAYS
    const expiryThreshold = new Date();
    expiryThreshold.setDate(expiryThreshold.getDate() + REFRESH_WINDOW_DAYS);

    const { data: accounts, error: accountsError } = await supabase
      .from("social_accounts")
      .select("id, platform, platform_user_id, platform_name, access_token, token_expires_at, organization_id")
      .eq("is_active", true)
      .in("platform", ["facebook", "instagram"])
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
    const refreshedTokens = new Map<string, { accessToken: string; expiresAt: string }>();

    for (const account of accounts) {
      const tokenKey = account.access_token;
      const isAlreadyExpired = new Date(account.token_expires_at) < new Date();

      if (isAlreadyExpired) {
        // Token is already expired — can't refresh, mark as error
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
            token_expires_at: cached.expiresAt,
            sync_status: "synced",
            sync_error: null,
          })
          .eq("id", account.id);
        refreshed++;
        continue;
      }

      try {
        const result = await exchangeForLongLivedToken({
          currentToken: account.access_token,
          appId,
          appSecret,
        });

        const expiresAt = new Date(Date.now() + result.expiresIn * 1000).toISOString();

        // Cache the result for shared tokens
        refreshedTokens.set(tokenKey, {
          accessToken: result.accessToken,
          expiresAt,
        });

        await supabase
          .from("social_accounts")
          .update({
            access_token: result.accessToken,
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

        // If it's a 190 error (token invalid), mark as expired
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
