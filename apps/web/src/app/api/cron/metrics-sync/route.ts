import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  logOutcomeForPost,
  refreshCreativeMemoryFromPost,
  type AIObjective,
} from "@/lib/ai/outcome-learning";

/**
 * Cron job: Sync engagement metrics from Meta Graph API for recent posts.
 * Runs every 30 minutes.
 *
 * Flow:
 * 1. Find all posts published in the last 14 days with a platform_post_id
 * 2. Group by social_account (to reuse access_token)
 * 3. For each post, call Meta Graph API to get current metrics
 * 4. Update the posts table with fresh metrics
 * 5. Log outcome events for the outcome learning system
 */

const META_GRAPH_API = "https://graph.facebook.com/v21.0";
const SYNC_WINDOW_DAYS = 14;
const MAX_POSTS_PER_RUN = 100;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const since = new Date();
    since.setDate(since.getDate() - SYNC_WINDOW_DAYS);

    // Get recent posts that have platform_post_ids
    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select(
        "id, organization_id, social_account_id, platform, platform_post_id, likes_count, comments_count, shares_count, saves_count, views_count, reach_count, impressions_count, engagement_rate, published_at"
      )
      .gte("published_at", since.toISOString())
      .not("platform_post_id", "is", null)
      .in("platform", ["facebook", "instagram"])
      .order("published_at", { ascending: false })
      .limit(MAX_POSTS_PER_RUN);

    if (postsError) {
      console.error("Cron metrics-sync: failed to fetch posts:", postsError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({ updated: 0, errors: 0, message: "No recent posts to sync." });
    }

    // Get unique social_account_ids and fetch their tokens
    const accountIds = [...new Set(posts.map((p) => p.social_account_id).filter(Boolean))];
    const { data: accounts } = await supabase
      .from("social_accounts")
      .select("id, platform, platform_user_id, access_token, token_expires_at, is_active")
      .in("id", accountIds)
      .eq("is_active", true);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ updated: 0, errors: 0, message: "No active accounts found." });
    }

    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    // Get objectives from decision_logs for outcome tracking
    const postIds = posts.map((p) => p.id).filter(Boolean);
    const objectiveMap = new Map<string, AIObjective>();
    if (postIds.length > 0) {
      const { data: decisions } = await supabase
        .from("decision_logs")
        .select("post_id, objective")
        .in("post_id", postIds)
        .order("created_at", { ascending: false })
        .limit(postIds.length * 2);

      if (decisions) {
        for (const d of decisions as Array<{ post_id?: string; objective?: string }>) {
          if (!d.post_id || objectiveMap.has(d.post_id)) continue;
          const obj = d.objective;
          if (obj === "reach" || obj === "leads" || obj === "saves") {
            objectiveMap.set(d.post_id, obj);
          } else {
            objectiveMap.set(d.post_id, "engagement");
          }
        }
      }
    }

    let updated = 0;
    let errors = 0;

    for (const post of posts) {
      const account = accountMap.get(post.social_account_id);
      if (!account) continue;

      // Skip expired tokens
      if (account.token_expires_at && new Date(account.token_expires_at) < new Date()) {
        continue;
      }

      try {
        let metrics: {
          likes: number;
          comments: number;
          shares: number;
          saves: number;
          views: number;
          reach: number;
          impressions: number;
        } | null = null;

        if (post.platform === "facebook") {
          metrics = await fetchFacebookMetrics(post.platform_post_id, account.access_token);
        } else if (post.platform === "instagram") {
          metrics = await fetchInstagramMetrics(post.platform_post_id, account.access_token);
        }

        if (!metrics) continue;

        // Only update if metrics actually changed
        const changed =
          metrics.likes !== (post.likes_count || 0) ||
          metrics.comments !== (post.comments_count || 0) ||
          metrics.shares !== (post.shares_count || 0) ||
          metrics.reach !== (post.reach_count || 0) ||
          metrics.impressions !== (post.impressions_count || 0);

        if (!changed) continue;

        // Calculate engagement rate
        const totalEngagement = metrics.likes + metrics.comments + metrics.shares + metrics.saves;
        const engagementRate = metrics.reach > 0
          ? Math.round((totalEngagement / metrics.reach) * 10000) / 100
          : 0;

        const { error: updateError } = await supabase
          .from("posts")
          .update({
            likes_count: metrics.likes,
            comments_count: metrics.comments,
            shares_count: metrics.shares,
            saves_count: metrics.saves,
            views_count: metrics.views,
            reach_count: metrics.reach,
            impressions_count: metrics.impressions,
            engagement_rate: engagementRate,
          })
          .eq("id", post.id);

        if (updateError) {
          errors++;
          continue;
        }

        updated++;

        // Log outcome for the learning system
        const objective = objectiveMap.get(post.id) || "engagement";
        const updatedPost = {
          ...post,
          likes_count: metrics.likes,
          comments_count: metrics.comments,
          shares_count: metrics.shares,
          saves_count: metrics.saves,
          views_count: metrics.views,
          reach_count: metrics.reach,
          impressions_count: metrics.impressions,
          engagement_rate: engagementRate,
        };

        const outcomeLogged = await logOutcomeForPost({
          supabase,
          post: updatedPost,
          source: "sync",
          eventType: "snapshot",
          objective,
          metadata: { syncType: "metrics-cron", platformPostId: post.platform_post_id },
        });

        if (outcomeLogged) {
          await refreshCreativeMemoryFromPost({
            supabase,
            post: updatedPost,
            objective,
            metadata: { source: "metrics-cron" },
          });
        }
      } catch (err) {
        console.error(`Cron metrics-sync: error for post ${post.id}:`, err);
        errors++;
      }
    }

    return NextResponse.json({
      totalPosts: posts.length,
      updated,
      errors,
      accountsChecked: accounts.length,
    });
  } catch (err) {
    console.error("Cron metrics-sync error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ============================================================
// Facebook Metrics
// ============================================================

async function fetchFacebookMetrics(
  platformPostId: string,
  accessToken: string
): Promise<{
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  views: number;
  reach: number;
  impressions: number;
} | null> {
  try {
    const fields = "likes.summary(true),comments.summary(true),shares,insights.metric(post_impressions,post_engaged_users,post_clicks)";
    const res = await fetch(
      `${META_GRAPH_API}/${platformPostId}?` +
        new URLSearchParams({ access_token: accessToken, fields }).toString()
    );
    const data = await res.json();

    if (data.error) {
      if (data.error.code === 190) throw new Error("Token expired");
      return null;
    }

    const insights = data.insights?.data || [];
    const getInsight = (name: string) =>
      insights.find((i: { name: string; values: Array<{ value: number }> }) => i.name === name)?.values?.[0]?.value || 0;

    return {
      likes: data.likes?.summary?.total_count || 0,
      comments: data.comments?.summary?.total_count || 0,
      shares: data.shares?.count || 0,
      saves: 0, // Facebook doesn't expose saves
      views: getInsight("post_clicks"),
      reach: getInsight("post_engaged_users"),
      impressions: getInsight("post_impressions"),
    };
  } catch {
    return null;
  }
}

// ============================================================
// Instagram Metrics
// ============================================================

async function fetchInstagramMetrics(
  platformPostId: string,
  accessToken: string
): Promise<{
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  views: number;
  reach: number;
  impressions: number;
} | null> {
  try {
    // Basic metrics
    const fields = "like_count,comments_count";
    const res = await fetch(
      `${META_GRAPH_API}/${platformPostId}?` +
        new URLSearchParams({ access_token: accessToken, fields }).toString()
    );
    const data = await res.json();

    if (data.error) {
      if (data.error.code === 190) throw new Error("Token expired");
      return null;
    }

    // Try to get insights (reach, impressions, saved) — requires business account
    let reach = 0;
    let impressions = 0;
    let saved = 0;

    try {
      const insightsRes = await fetch(
        `${META_GRAPH_API}/${platformPostId}/insights?` +
          new URLSearchParams({
            access_token: accessToken,
            metric: "impressions,reach,saved",
          }).toString()
      );
      const insightsData = await insightsRes.json();

      if (!insightsData.error && insightsData.data) {
        for (const metric of insightsData.data as Array<{
          name: string;
          values: Array<{ value: number }>;
        }>) {
          const value = metric.values?.[0]?.value || 0;
          if (metric.name === "impressions") impressions = value;
          if (metric.name === "reach") reach = value;
          if (metric.name === "saved") saved = value;
        }
      }
    } catch {
      // Insights may not be available for all post types
    }

    return {
      likes: data.like_count || 0,
      comments: data.comments_count || 0,
      shares: 0, // Instagram doesn't expose shares via API
      saves: saved,
      views: 0,
      reach,
      impressions,
    };
  } catch {
    return null;
  }
}
