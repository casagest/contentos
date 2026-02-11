import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DAY_NAMES = ["Dum", "Lun", "Mar", "Mie", "Joi", "Vin", "Sâm"];

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Neautentificat." }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!userData?.organization_id) {
      return NextResponse.json(
        { error: "Nu s-a găsit organizația." },
        { status: 400 }
      );
    }

    const orgId = userData.organization_id;

    // Fetch all posts for this org
    const { data: posts, error } = await supabase
      .from("posts")
      .select(
        "id, platform, text_content, content_type, likes_count, comments_count, shares_count, views_count, impressions_count, reach_count, platform_url, published_at"
      )
      .eq("organization_id", orgId)
      .order("published_at", { ascending: false });

    if (error) {
      console.error("Analytics query error:", error);
      return NextResponse.json(
        { error: "Eroare la preluarea datelor." },
        { status: 500 }
      );
    }

    const allPosts = posts || [];
    const totalPosts = allPosts.length;

    if (totalPosts === 0) {
      return NextResponse.json({
        totalPosts: 0,
        totalEngagement: 0,
        avgEngagement: 0,
        totalImpressions: 0,
        bestDay: "--",
        platformBreakdown: [],
        weeklyTrend: [],
        topPosts: [],
      });
    }

    // Aggregate totals
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let totalImpressions = 0;

    for (const p of allPosts) {
      totalLikes += p.likes_count || 0;
      totalComments += p.comments_count || 0;
      totalShares += p.shares_count || 0;
      totalImpressions += p.impressions_count || 0;
    }

    const totalEngagement = totalLikes + totalComments + totalShares;
    const avgEngagement = Math.round(totalEngagement / totalPosts);

    // Best day of week
    const dayStats: Record<string, { total: number; count: number }> = {};
    for (const p of allPosts) {
      if (!p.published_at) continue;
      const day = DAY_NAMES[new Date(p.published_at).getDay()];
      if (!dayStats[day]) dayStats[day] = { total: 0, count: 0 };
      dayStats[day].total +=
        (p.likes_count || 0) + (p.comments_count || 0) + (p.shares_count || 0);
      dayStats[day].count++;
    }

    let bestDay = "--";
    let bestDayAvg = 0;
    for (const [day, data] of Object.entries(dayStats)) {
      const avg = data.count > 0 ? data.total / data.count : 0;
      if (avg > bestDayAvg) {
        bestDayAvg = avg;
        bestDay = day;
      }
    }

    // Platform breakdown
    const platformMap: Record<
      string,
      { posts: number; engagement: number }
    > = {};
    for (const p of allPosts) {
      if (!platformMap[p.platform]) {
        platformMap[p.platform] = { posts: 0, engagement: 0 };
      }
      platformMap[p.platform].posts++;
      platformMap[p.platform].engagement +=
        (p.likes_count || 0) + (p.comments_count || 0) + (p.shares_count || 0);
    }

    const platformBreakdown = Object.entries(platformMap).map(
      ([platform, data]) => ({
        platform,
        posts: data.posts,
        engagement: data.engagement,
      })
    );

    // Weekly trend (last 7 days)
    const now = new Date();
    const weeklyTrend: { date: string; label: string; engagement: number }[] =
      [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const label = i === 0 ? "Azi" : i === 1 ? "Ieri" : DAY_NAMES[d.getDay()];

      const dayEngagement = allPosts
        .filter((p) => p.published_at?.startsWith(dateStr))
        .reduce(
          (sum, p) =>
            sum +
            (p.likes_count || 0) +
            (p.comments_count || 0) +
            (p.shares_count || 0),
          0
        );

      weeklyTrend.push({ date: dateStr, label, engagement: dayEngagement });
    }

    // Top 3 posts by engagement
    const topPosts = [...allPosts]
      .map((p) => ({
        id: p.id,
        platform: p.platform,
        text_content: p.text_content,
        content_type: p.content_type,
        platform_url: p.platform_url,
        published_at: p.published_at,
        engagement:
          (p.likes_count || 0) +
          (p.comments_count || 0) +
          (p.shares_count || 0),
        likes: p.likes_count || 0,
        comments: p.comments_count || 0,
        shares: p.shares_count || 0,
      }))
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 3);

    return NextResponse.json({
      totalPosts,
      totalEngagement,
      avgEngagement,
      totalImpressions,
      bestDay,
      platformBreakdown,
      weeklyTrend,
      topPosts,
    });
  } catch (err) {
    console.error("Analytics overview error:", err);
    return NextResponse.json(
      { error: "Eroare internă." },
      { status: 500 }
    );
  }
}
