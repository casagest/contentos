import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Cron job: Aggregate daily analytics from posts into analytics_daily table.
 * Runs once per day at 02:00 UTC.
 *
 * For each organization with posts, it computes:
 * - Post counts, total likes/comments/shares/views/reach
 * - Average engagement rate
 * - Net followers change (from social_accounts if available)
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();

    // Aggregate yesterday's data (UTC)
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const dateStr = yesterday.toISOString().split("T")[0];
    const dayStart = `${dateStr}T00:00:00.000Z`;
    const dayEnd = `${dateStr}T23:59:59.999Z`;

    // Get all posts published yesterday across all orgs
    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select(
        "organization_id, platform, likes_count, comments_count, shares_count, saves_count, views_count, reach_count, impressions_count, engagement_rate"
      )
      .gte("published_at", dayStart)
      .lte("published_at", dayEnd);

    if (postsError) {
      console.error("Cron analytics-daily: failed to fetch posts:", postsError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({
        date: dateStr,
        orgsProcessed: 0,
        message: "No posts found for yesterday.",
      });
    }

    // Group posts by organization
    const orgMap = new Map<
      string,
      {
        postsCount: number;
        totalLikes: number;
        totalComments: number;
        totalShares: number;
        totalSaves: number;
        totalViews: number;
        totalReach: number;
        totalImpressions: number;
        engagementRates: number[];
      }
    >();

    for (const post of posts) {
      const orgId = post.organization_id;
      if (!orgId) continue;

      const existing = orgMap.get(orgId) || {
        postsCount: 0,
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        totalSaves: 0,
        totalViews: 0,
        totalReach: 0,
        totalImpressions: 0,
        engagementRates: [],
      };

      existing.postsCount++;
      existing.totalLikes += post.likes_count || 0;
      existing.totalComments += post.comments_count || 0;
      existing.totalShares += post.shares_count || 0;
      existing.totalSaves += post.saves_count || 0;
      existing.totalViews += post.views_count || 0;
      existing.totalReach += post.reach_count || 0;
      existing.totalImpressions += post.impressions_count || 0;

      if (typeof post.engagement_rate === "number" && post.engagement_rate > 0) {
        existing.engagementRates.push(post.engagement_rate);
      }

      orgMap.set(orgId, existing);
    }

    // Upsert analytics_daily rows
    let upserted = 0;
    let errors = 0;

    for (const [orgId, data] of orgMap) {
      const avgEngagementRate =
        data.engagementRates.length > 0
          ? data.engagementRates.reduce((sum, r) => sum + r, 0) / data.engagementRates.length
          : 0;

      // Try to get followers count from social_accounts
      let followersCount = 0;
      let followersGained = 0;
      let followersLost = 0;
      let netFollowers = 0;

      try {
        const { data: accounts } = await supabase
          .from("social_accounts")
          .select("followers_count")
          .eq("organization_id", orgId)
          .eq("is_active", true);

        if (accounts && accounts.length > 0) {
          followersCount = accounts.reduce(
            (sum: number, a: { followers_count: number | null }) =>
              sum + (a.followers_count || 0),
            0
          );
        }

        // Get previous day's followers to compute gained/lost
        const { data: prevDay } = await supabase
          .from("analytics_daily")
          .select("followers_count")
          .eq("organization_id", orgId)
          .lt("date", dateStr)
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (prevDay?.followers_count && followersCount > 0) {
          const diff = followersCount - prevDay.followers_count;
          if (diff > 0) {
            followersGained = diff;
          } else if (diff < 0) {
            followersLost = Math.abs(diff);
          }
          netFollowers = diff;
        }
      } catch {
        // Best effort followers tracking
      }

      const { error: upsertError } = await supabase.from("analytics_daily").upsert(
        {
          organization_id: orgId,
          date: dateStr,
          posts_count: data.postsCount,
          total_likes: data.totalLikes,
          total_comments: data.totalComments,
          total_shares: data.totalShares,
          total_views: data.totalViews,
          total_reach: data.totalReach,
          avg_engagement_rate: Math.round(avgEngagementRate * 100) / 100,
          followers_count: followersCount || null,
          followers_gained: followersGained,
          followers_lost: followersLost,
          net_followers: netFollowers,
        },
        { onConflict: "organization_id,date" }
      );

      if (upsertError) {
        console.error(`Cron analytics-daily: upsert failed for org ${orgId}:`, upsertError);
        errors++;
      } else {
        upserted++;
      }
    }

    return NextResponse.json({
      date: dateStr,
      orgsProcessed: upserted,
      errors,
      totalPosts: posts.length,
    });
  } catch (err) {
    console.error("Cron analytics-daily error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
