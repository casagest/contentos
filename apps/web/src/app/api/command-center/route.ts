import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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
        { drafts: 0, scheduled: 0, postsThisWeek: 0, accountsCount: 0, recentPosts: [] },
        { status: 200 }
      );
    }

    const orgId = userData.organization_id;
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekStart = weekAgo.toISOString().split("T")[0];
    const weekEnd = now.toISOString().split("T")[0];

    // Drafts (draft or reviewing — nu scheduled, nu published)
    const { count: draftsCount } = await supabase
      .from("drafts")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .in("status", ["draft", "reviewing"]);

    // Scheduled
    const { count: scheduledCount } = await supabase
      .from("drafts")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "scheduled")
      .gte("scheduled_at", `${weekStart}T00:00:00.000Z`)
      .lte("scheduled_at", `${weekEnd}T23:59:59.999Z`);

    // Posts this week (published)
    const { data: postsData } = await supabase
      .from("posts")
      .select("id,platform,likes_count,comments_count,shares_count,published_at")
      .eq("organization_id", orgId)
      .gte("published_at", `${weekStart}T00:00:00.000Z`)
      .lte("published_at", `${weekEnd}T23:59:59.999Z`)
      .order("published_at", { ascending: false })
      .limit(20);

    // Social accounts
    const { count: accountsCount } = await supabase
      .from("social_accounts")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId);

    // Total scheduled (any date) for "upcoming" metric
    const { count: totalScheduled } = await supabase
      .from("drafts")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "scheduled")
      .gte("scheduled_at", now.toISOString());

    const posts = (postsData || []).map((p) => ({
      id: p.id,
      platform: p.platform,
      likes: p.likes_count || 0,
      comments: p.comments_count || 0,
      shares: p.shares_count || 0,
      published_at: p.published_at,
    }));

    const totalEngagement = posts.reduce((sum, p) => sum + (p.likes || 0) + (p.comments || 0), 0);

    return NextResponse.json({
      drafts: draftsCount ?? 0,
      scheduled: totalScheduled ?? 0,
      postsThisWeek: posts.length,
      totalEngagement,
      accountsCount: accountsCount ?? 0,
      recentPosts: posts.slice(0, 5),
    });
  } catch (err) {
    console.error("Command center stats error:", err);
    return NextResponse.json(
      { drafts: 0, scheduled: 0, postsThisWeek: 0, accountsCount: 0, recentPosts: [] },
      { status: 200 }
    );
  }
}
