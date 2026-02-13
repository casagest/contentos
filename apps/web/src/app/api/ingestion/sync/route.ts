import { NextResponse } from "next/server";
import { getSessionUserWithOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  deriveCreativeSignals,
  logOutcomeForPost,
  refreshCreativeMemoryFromPost,
} from "@/lib/ai/outcome-learning";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const META_GRAPH_API = "https://graph.facebook.com/v21.0";

interface SyncResult {
  platform: string;
  accountName: string;
  synced: number;
  error?: string;
}

export async function POST() {
  try {
    const session = await getSessionUserWithOrg();
    if (session instanceof NextResponse) return session;

    const { organizationId: orgId, supabase } = session;

    // Get all active social accounts
    const { data: accounts } = await supabase
      .from("social_accounts")
      .select("*")
      .eq("organization_id", orgId)
      .eq("is_active", true);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json(
        { error: "Niciun cont social conectat." },
        { status: 404 }
      );
    }

    const results: SyncResult[] = [];

    for (const account of accounts) {
      // Check token expiry
      if (
        account.token_expires_at &&
        new Date(account.token_expires_at) < new Date()
      ) {
        await supabase
          .from("social_accounts")
          .update({ sync_status: "error", sync_error: "Token expirat" })
          .eq("id", account.id);

        results.push({
          platform: account.platform,
          accountName: account.platform_name || account.platform_username,
          synced: 0,
          error: "Token expirat. Reconectează contul.",
        });
        continue;
      }

      // Mark as syncing
      await supabase
        .from("social_accounts")
        .update({ sync_status: "syncing", sync_error: null })
        .eq("id", account.id);

      try {
        let syncedCount = 0;

        if (account.platform === "facebook") {
          syncedCount = await syncFacebook(supabase, account, orgId);
        } else if (account.platform === "instagram") {
          syncedCount = await syncInstagram(supabase, account, orgId);
        } else {
          // TikTok/YouTube not yet wired
          results.push({
            platform: account.platform,
            accountName: account.platform_name || account.platform_username,
            synced: 0,
            error: `Sincronizarea ${account.platform} nu este disponibilă încă.`,
          });
          await supabase
            .from("social_accounts")
            .update({ sync_status: "synced" })
            .eq("id", account.id);
          continue;
        }

        // Mark as synced
        await supabase
          .from("social_accounts")
          .update({
            sync_status: "synced",
            last_synced_at: new Date().toISOString(),
            sync_error: null,
          })
          .eq("id", account.id);

        results.push({
          platform: account.platform,
          accountName: account.platform_name || account.platform_username,
          synced: syncedCount,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Eroare necunoscută";
        console.error(`Sync error for ${account.platform}:`, err);

        await supabase
          .from("social_accounts")
          .update({ sync_status: "error", sync_error: message })
          .eq("id", account.id);

        results.push({
          platform: account.platform,
          accountName: account.platform_name || account.platform_username,
          synced: 0,
          error: message,
        });
      }
    }

    const totalSynced = results.reduce((sum, r) => sum + r.synced, 0);
    const errors = results.filter((r) => r.error);

    return NextResponse.json({
      total: totalSynced,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("Sync API error:", err);
    return NextResponse.json(
      { error: "Eroare internă la sincronizare." },
      { status: 500 }
    );
  }
}

// ============================================================
// Facebook Sync
// ============================================================

async function syncFacebook(
  supabase: SupabaseClient,
  account: Record<string, unknown>,
  orgId: string
): Promise<number> {
  const pageId = account.platform_user_id as string;
  const accessToken = account.access_token as string;
  const accountId = account.id as string;

  const fields = [
    "id",
    "message",
    "created_time",
    "full_picture",
    "permalink_url",
    "shares",
    "likes.summary(true)",
    "comments.summary(true)",
    "insights.metric(post_impressions,post_engaged_users,post_clicks)",
  ].join(",");

  const res = await fetch(
    `${META_GRAPH_API}/${pageId}/posts?` +
      new URLSearchParams({
        access_token: accessToken,
        fields,
        limit: "50",
      }).toString()
  );
  const data = await res.json();

  if (data.error) {
    if (data.error.code === 190) {
      throw new Error("Token expirat. Reconectează contul Facebook.");
    }
    throw new Error(`Facebook API: ${data.error.message}`);
  }

  const posts = (data.data || []).map(
    (post: {
      id: string;
      message?: string;
      created_time: string;
      full_picture?: string;
      permalink_url?: string;
      shares?: { count: number };
      likes?: { summary: { total_count: number } };
      comments?: { summary: { total_count: number } };
      insights?: {
        data: Array<{ name: string; values: Array<{ value: number }> }>;
      };
    }) => {
      const insights = post.insights?.data || [];
      const getInsight = (name: string) =>
        insights.find((i) => i.name === name)?.values?.[0]?.value || 0;
      const textContent = post.message || "";
      const signals = deriveCreativeSignals({ text: textContent });

      return {
        social_account_id: accountId,
        organization_id: orgId,
        platform: "facebook",
        platform_post_id: post.id,
        platform_url: post.permalink_url,
        content_type: post.full_picture ? "image" : "text",
        text_content: textContent,
        media_urls: post.full_picture ? [post.full_picture] : [],
        hashtags: extractHashtags(textContent),
        mentions: extractMentions(textContent),
        hook_type: signals.hookType,
        cta_type: signals.ctaType,
        likes_count: post.likes?.summary?.total_count || 0,
        comments_count: post.comments?.summary?.total_count || 0,
        shares_count: post.shares?.count || 0,
        impressions_count: getInsight("post_impressions"),
        reach_count: getInsight("post_engaged_users"),
        views_count: getInsight("post_clicks"),
        published_at: post.created_time,
      };
    }
  );

  if (posts.length > 0) {
    const { error: upsertError } = await supabase.from("posts").upsert(posts, {
      onConflict: "organization_id,platform,platform_post_id",
    });

    if (!upsertError) {
      await recordSyncedOutcomes({
        supabase,
        organizationId: orgId,
        socialAccountId: accountId,
        platform: "facebook",
        platformPostIds: posts.map((post: { platform_post_id: string }) => post.platform_post_id),
      });
    }

    if (upsertError) {
      console.error("Facebook upsert error:", upsertError);
      throw new Error(`Eroare la salvarea postărilor: ${upsertError.message}`);
    }
  }

  return posts.length;
}

// ============================================================
// Instagram Sync
// ============================================================

async function syncInstagram(
  supabase: SupabaseClient,
  account: Record<string, unknown>,
  orgId: string
): Promise<number> {
  const igAccountId = account.platform_user_id as string;
  const accessToken = account.access_token as string;
  const accountId = account.id as string;

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
  ].join(",");

  const res = await fetch(
    `${META_GRAPH_API}/${igAccountId}/media?` +
      new URLSearchParams({
        access_token: accessToken,
        fields,
        limit: "50",
      }).toString()
  );
  const data = await res.json();

  if (data.error) {
    if (data.error.code === 190) {
      throw new Error("Token expirat. Reconectează contul Instagram.");
    }
    throw new Error(`Instagram API: ${data.error.message}`);
  }

  const posts = (data.data || []).map(
    (post: {
      id: string;
      caption?: string;
      media_type: string;
      media_url?: string;
      thumbnail_url?: string;
      permalink: string;
      timestamp: string;
      like_count?: number;
      comments_count?: number;
    }) => {
      const contentTypeMap: Record<string, string> = {
        IMAGE: "image",
        VIDEO: "reel",
        CAROUSEL_ALBUM: "carousel",
      };
      const textContent = post.caption || "";
      const signals = deriveCreativeSignals({ text: textContent });

      return {
        social_account_id: accountId,
        organization_id: orgId,
        platform: "instagram",
        platform_post_id: post.id,
        platform_url: post.permalink,
        content_type: contentTypeMap[post.media_type] || "image",
        text_content: textContent,
        media_urls: [post.media_url || post.thumbnail_url].filter(Boolean),
        hashtags: extractHashtags(textContent),
        mentions: extractMentions(textContent),
        hook_type: signals.hookType,
        cta_type: signals.ctaType,
        likes_count: post.like_count || 0,
        comments_count: post.comments_count || 0,
        shares_count: 0,
        impressions_count: 0,
        reach_count: 0,
        views_count: 0,
        published_at: post.timestamp,
      };
    }
  );

  if (posts.length > 0) {
    const { error: upsertError } = await supabase.from("posts").upsert(posts, {
      onConflict: "organization_id,platform,platform_post_id",
    });

    if (!upsertError) {
      await recordSyncedOutcomes({
        supabase,
        organizationId: orgId,
        socialAccountId: accountId,
        platform: "instagram",
        platformPostIds: posts.map((post: { platform_post_id: string }) => post.platform_post_id),
      });
    }

    if (upsertError) {
      console.error("Instagram upsert error:", upsertError);
      throw new Error(`Eroare la salvarea postărilor: ${upsertError.message}`);
    }
  }

  return posts.length;
}

// ============================================================
// Helpers
// ============================================================

function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\w\u0103\u00e2\u00ee\u0219\u021b\u0102\u00c2\u00ce\u0218\u021a]+/g);
  return matches ? matches.map((h) => h.toLowerCase()) : [];
}

function extractMentions(text: string): string[] {
  const matches = text.match(/@[\w.]+/g);
  return matches ? matches.map((m) => m.toLowerCase()) : [];
}

async function recordSyncedOutcomes(params: {
  supabase: SupabaseClient;
  organizationId: string;
  socialAccountId: string;
  platform: "facebook" | "instagram";
  platformPostIds: string[];
}) {
  if (!params.platformPostIds.length) return;

  const { data: rows } = await params.supabase
    .from("posts")
    .select(
      "id,organization_id,social_account_id,platform,text_content,hook_type,cta_type,likes_count,comments_count,shares_count,saves_count,views_count,reach_count,impressions_count,engagement_rate,published_at,platform_post_id"
    )
    .eq("organization_id", params.organizationId)
    .eq("social_account_id", params.socialAccountId)
    .eq("platform", params.platform)
    .in("platform_post_id", params.platformPostIds);

  if (!rows || !rows.length) return;

  for (const post of rows) {
    const outcomeLogged = await logOutcomeForPost({
      supabase: params.supabase,
      post,
      source: "sync",
      eventType: "snapshot",
      metadata: {
        syncType: "ingestion",
        platformPostId: post.platform_post_id,
      },
    });

    if (outcomeLogged) {
      await refreshCreativeMemoryFromPost({
        supabase: params.supabase,
        post,
        metadata: {
          source: "sync",
          syncType: "ingestion",
        },
      });
    }
  }
}

