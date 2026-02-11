import { NextResponse } from "next/server";
import { getSessionUserWithOrg } from "@/lib/auth";

const DAY_NAMES = ["Dum", "Lun", "Mar", "Mie", "Joi", "Vin", "Sam"];

type PostRow = {
  id: string;
  platform: string;
  text_content: string | null;
  content_type: string | null;
  likes_count: number | null;
  comments_count: number | null;
  shares_count: number | null;
  impressions_count: number | null;
  platform_url: string | null;
  published_at: string | null;
};

function getPostEngagement(post: {
  likes_count: number | null;
  comments_count: number | null;
  shares_count: number | null;
}): number {
  return (
    (post.likes_count || 0) +
    (post.comments_count || 0) +
    (post.shares_count || 0)
  );
}

function getDateKey(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().split("T")[0];
}

const NO_STORE = {
  headers: {
    "Cache-Control": "no-store",
  },
};

export async function GET() {
  try {
    const session = await getSessionUserWithOrg();
    if (session instanceof NextResponse) return session;

    const { organizationId: orgId, supabase } = session;

    const { data: posts, error } = await supabase
      .from("posts")
      .select(
        "id, platform, text_content, content_type, likes_count, comments_count, shares_count, impressions_count, platform_url, published_at"
      )
      .eq("organization_id", orgId)
      .order("published_at", { ascending: false });

    if (error) {
      console.error("Analytics query error:", error);
      return NextResponse.json(
        { error: "Eroare la preluarea datelor." },
        { status: 500, ...NO_STORE }
      );
    }

    const allPosts = (posts || []) as PostRow[];
    const totalPosts = allPosts.length;

    if (totalPosts === 0) {
      return NextResponse.json(
        {
          totalPosts: 0,
          totalEngagement: 0,
          avgEngagement: 0,
          totalImpressions: 0,
          bestDay: "--",
          platformBreakdown: [],
          weeklyTrend: [],
          topPosts: [],
        },
        NO_STORE
      );
    }

    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let totalImpressions = 0;

    const dayStats: Record<string, { total: number; count: number }> = {};
    const engagementByDate: Record<string, number> = {};
    const platformMap: Record<string, { posts: number; engagement: number }> =
      {};

    for (const p of allPosts) {
      totalLikes += p.likes_count || 0;
      totalComments += p.comments_count || 0;
      totalShares += p.shares_count || 0;
      totalImpressions += p.impressions_count || 0;

      const engagement = getPostEngagement(p);

      const dateKey = getDateKey(p.published_at);
      if (dateKey) {
        engagementByDate[dateKey] = (engagementByDate[dateKey] || 0) + engagement;
      }

      if (p.published_at) {
        const parsed = new Date(p.published_at);
        if (!Number.isNaN(parsed.getTime())) {
          const day = DAY_NAMES[parsed.getDay()];
          if (!dayStats[day]) dayStats[day] = { total: 0, count: 0 };
          dayStats[day].total += engagement;
          dayStats[day].count++;
        }
      }

      if (!platformMap[p.platform]) {
        platformMap[p.platform] = { posts: 0, engagement: 0 };
      }
      platformMap[p.platform].posts++;
      platformMap[p.platform].engagement += engagement;
    }

    const totalEngagement = totalLikes + totalComments + totalShares;
    const avgEngagement = Math.round(totalEngagement / totalPosts);

    let bestDay = "--";
    let bestDayAvg = 0;
    for (const [day, data] of Object.entries(dayStats)) {
      const avg = data.count > 0 ? data.total / data.count : 0;
      if (avg > bestDayAvg) {
        bestDayAvg = avg;
        bestDay = day;
      }
    }

    const platformBreakdown = Object.entries(platformMap)
      .map(([platform, data]) => ({
        platform,
        posts: data.posts,
        engagement: data.engagement,
      }))
      .sort((a, b) => b.engagement - a.engagement);

    const now = new Date();
    const weeklyTrend: { date: string; label: string; engagement: number }[] =
      [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const label = i === 0 ? "Azi" : i === 1 ? "Ieri" : DAY_NAMES[d.getDay()];

      weeklyTrend.push({
        date: dateStr,
        label,
        engagement: engagementByDate[dateStr] || 0,
      });
    }

    const topPosts = [...allPosts]
      .map((p) => ({
        id: p.id,
        platform: p.platform,
        text_content: p.text_content,
        content_type: p.content_type,
        platform_url: p.platform_url,
        published_at: p.published_at,
        engagement: getPostEngagement(p),
        likes: p.likes_count || 0,
        comments: p.comments_count || 0,
        shares: p.shares_count || 0,
      }))
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 3);

    return NextResponse.json(
      {
        totalPosts,
        totalEngagement,
        avgEngagement,
        totalImpressions,
        bestDay,
        platformBreakdown,
        weeklyTrend,
        topPosts,
      },
      NO_STORE
    );
  } catch (err) {
    console.error("Analytics overview error:", err);
    return NextResponse.json(
      { error: "Eroare interna." },
      { status: 500, ...NO_STORE }
    );
  }
}
