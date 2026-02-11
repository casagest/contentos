import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
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
    const { searchParams } = request.nextUrl;
    const platform = searchParams.get("platform");
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Build query
    let query = supabase
      .from("posts")
      .select("*", { count: "exact" })
      .eq("organization_id", orgId)
      .order("published_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (platform && platform !== "all") {
      query = query.eq("platform", platform);
    }

    if (start) {
      query = query.gte("published_at", start);
    }

    if (end) {
      query = query.lte("published_at", end);
    }

    const { data: posts, count, error } = await query;

    if (error) {
      console.error("Posts query error:", error);
      return NextResponse.json(
        { error: "Eroare la preluarea postărilor." },
        { status: 500 }
      );
    }

    // Compute stats
    const allPosts = posts || [];
    const totalEngagement = allPosts.reduce(
      (sum, p) =>
        sum +
        (p.likes_count || 0) +
        (p.comments_count || 0) +
        (p.shares_count || 0),
      0
    );
    const avgEngagement =
      allPosts.length > 0
        ? Math.round(totalEngagement / allPosts.length)
        : 0;

    // Best day of week
    const dayEngagement: Record<string, { total: number; count: number }> = {};
    const dayNames = ["Dum", "Lun", "Mar", "Mie", "Joi", "Vin", "Sâm"];
    for (const post of allPosts) {
      if (!post.published_at) continue;
      const day = dayNames[new Date(post.published_at).getDay()];
      if (!dayEngagement[day]) dayEngagement[day] = { total: 0, count: 0 };
      dayEngagement[day].total +=
        (post.likes_count || 0) +
        (post.comments_count || 0) +
        (post.shares_count || 0);
      dayEngagement[day].count++;
    }

    let bestDay = "--";
    let bestDayAvg = 0;
    for (const [day, data] of Object.entries(dayEngagement)) {
      const avg = data.count > 0 ? data.total / data.count : 0;
      if (avg > bestDayAvg) {
        bestDayAvg = avg;
        bestDay = day;
      }
    }

    return NextResponse.json({
      posts: allPosts,
      total: count || 0,
      stats: {
        avgEngagement,
        bestDay,
      },
    });
  } catch (err) {
    console.error("Posts API error:", err);
    return NextResponse.json(
      { error: "Eroare internă." },
      { status: 500 }
    );
  }
}
