import { NextRequest, NextResponse } from "next/server";
import { getSessionUserWithOrg } from "@/lib/auth";

const NO_STORE = { headers: { "Cache-Control": "no-store" } };

function getEngagement(row: {
  likes_count: number | null;
  comments_count: number | null;
  shares_count: number | null;
}): number {
  return (row.likes_count || 0) + (row.comments_count || 0) + (row.shares_count || 0);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUserWithOrg();
    if (session instanceof NextResponse) return session;

    const { organizationId: orgId, supabase } = session;

    const range = Math.min(
      Math.max(Number(request.nextUrl.searchParams.get("range")) || 30, 7),
      90
    );

    const since = new Date();
    since.setDate(since.getDate() - range);
    const sinceStr = since.toISOString();

    // Parallel queries
    const [postsResult, memoryResult, dailyResult] = await Promise.all([
      supabase
        .from("posts")
        .select(
          "id, platform, text_content, content_type, hook_type, likes_count, comments_count, shares_count, saves_count, views_count, reach_count, impressions_count, engagement_rate, platform_url, published_at"
        )
        .eq("organization_id", orgId)
        .gte("published_at", sinceStr)
        .order("published_at", { ascending: true }),
      supabase
        .from("creative_memory")
        .select("platform, objective, memory_key, hook_type, framework, cta_type, sample_size, success_count, total_engagement, avg_engagement")
        .eq("organization_id", orgId)
        .gt("sample_size", 0)
        .order("avg_engagement", { ascending: false }),
      supabase
        .from("analytics_daily")
        .select("date, posts_count, total_likes, total_comments, total_shares, total_views, total_reach, avg_engagement_rate, followers_count, followers_gained, followers_lost, net_followers")
        .eq("organization_id", orgId)
        .gte("date", sinceStr.split("T")[0])
        .order("date", { ascending: true }),
    ]);

    const posts = postsResult.data || [];
    const memories = memoryResult.data || [];
    const dailyRows = dailyResult.data || [];

    // --- Daily Engagement aggregation ---
    const dailyMap = new Map<string, { likes: number; comments: number; shares: number; impressions: number }>();

    for (const p of posts) {
      if (!p.published_at) continue;
      const dateKey = new Date(p.published_at).toISOString().split("T")[0];
      const existing = dailyMap.get(dateKey) || { likes: 0, comments: 0, shares: 0, impressions: 0 };
      existing.likes += p.likes_count || 0;
      existing.comments += p.comments_count || 0;
      existing.shares += p.shares_count || 0;
      existing.impressions += p.impressions_count || 0;
      dailyMap.set(dateKey, existing);
    }

    const dailyEngagement = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }));

    // --- Platform Comparison ---
    const platformMap = new Map<string, { posts: number; totalEngagement: number; totalReach: number }>();
    for (const p of posts) {
      const existing = platformMap.get(p.platform) || { posts: 0, totalEngagement: 0, totalReach: 0 };
      existing.posts++;
      existing.totalEngagement += getEngagement(p);
      existing.totalReach += p.reach_count || 0;
      platformMap.set(p.platform, existing);
    }

    const platformComparison = Array.from(platformMap.entries()).map(([platform, data]) => ({
      platform,
      posts: data.posts,
      avgEngagement: data.posts > 0 ? Math.round(data.totalEngagement / data.posts) : 0,
      totalReach: data.totalReach,
    }));

    // --- Content Type Performance ---
    const ctMap = new Map<string, { count: number; totalEngagement: number }>();
    for (const p of posts) {
      const type = p.content_type || "text";
      const existing = ctMap.get(type) || { count: 0, totalEngagement: 0 };
      existing.count++;
      existing.totalEngagement += getEngagement(p);
      ctMap.set(type, existing);
    }

    const contentTypePerformance = Array.from(ctMap.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      avgEngagement: data.count > 0 ? Math.round(data.totalEngagement / data.count) : 0,
    }));

    // --- Hook Performance (from creative_memory) ---
    const hookPerformance = memories
      .filter((m) => m.hook_type)
      .reduce<Map<string, { avgEngagement: number; sampleSize: number; successCount: number }>>(
        (acc, m) => {
          const key = m.hook_type!;
          const existing = acc.get(key);
          if (!existing) {
            acc.set(key, {
              avgEngagement: m.avg_engagement,
              sampleSize: m.sample_size,
              successCount: m.success_count,
            });
          } else {
            const totalSamples = existing.sampleSize + m.sample_size;
            existing.avgEngagement = totalSamples > 0
              ? Math.round((existing.avgEngagement * existing.sampleSize + m.avg_engagement * m.sample_size) / totalSamples)
              : 0;
            existing.sampleSize = totalSamples;
            existing.successCount += m.success_count;
          }
          return acc;
        },
        new Map()
      );

    const hookPerformanceArr = Array.from(hookPerformance.entries())
      .map(([hookType, data]) => ({
        hookType,
        avgEngagement: data.avgEngagement,
        sampleSize: data.sampleSize,
        successRate: data.sampleSize > 0 ? Math.round((data.successCount / data.sampleSize) * 100) : 0,
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement);

    // --- Best Hours ---
    const hourMap = new Map<number, { totalEngagement: number; postCount: number }>();
    for (const p of posts) {
      if (!p.published_at) continue;
      const hour = new Date(p.published_at).getHours();
      const existing = hourMap.get(hour) || { totalEngagement: 0, postCount: 0 };
      existing.totalEngagement += getEngagement(p);
      existing.postCount++;
      hourMap.set(hour, existing);
    }

    const bestHours: { hour: number; avgEngagement: number; postCount: number }[] = [];
    for (let h = 0; h < 24; h++) {
      const data = hourMap.get(h);
      bestHours.push({
        hour: h,
        avgEngagement: data && data.postCount > 0 ? Math.round(data.totalEngagement / data.postCount) : 0,
        postCount: data?.postCount || 0,
      });
    }

    // --- Followers Trend (from analytics_daily) ---
    const followersTrend = dailyRows.map((row) => ({
      date: row.date,
      followers: row.followers_count || 0,
      gained: row.followers_gained || 0,
      lost: row.followers_lost || 0,
    }));

    // --- Top Posts ---
    const topPosts = [...posts]
      .map((p) => ({
        id: p.id,
        platform: p.platform,
        text: (p.text_content || "").slice(0, 120),
        engagement: getEngagement(p),
        published_at: p.published_at,
        platform_url: p.platform_url,
      }))
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 10);

    // --- Summary KPIs ---
    const totalPosts = posts.length;
    const totalEngagement = posts.reduce((sum, p) => sum + getEngagement(p), 0);
    const avgEngagement = totalPosts > 0 ? Math.round(totalEngagement / totalPosts) : 0;
    const totalImpressions = posts.reduce((sum, p) => sum + (p.impressions_count || 0), 0);

    return NextResponse.json(
      {
        range,
        totalPosts,
        totalEngagement,
        avgEngagement,
        totalImpressions,
        dailyEngagement,
        platformComparison,
        contentTypePerformance,
        hookPerformance: hookPerformanceArr,
        bestHours,
        followersTrend,
        topPosts,
      },
      NO_STORE
    );
  } catch (err) {
    console.error("Analytics trends error:", err);
    return NextResponse.json(
      { error: "Eroare interna." },
      { status: 500, ...NO_STORE }
    );
  }
}
