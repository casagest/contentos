import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const META_GRAPH_API = "https://graph.facebook.com/v21.0";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Neautentificat." },
        { status: 401 }
      );
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

    // Get Facebook social account
    const { data: account } = await supabase
      .from("social_accounts")
      .select("*")
      .eq("organization_id", userData.organization_id)
      .eq("platform", "facebook")
      .eq("is_active", true)
      .single();

    if (!account) {
      return NextResponse.json(
        { error: "Nu există un cont Facebook conectat." },
        { status: 404 }
      );
    }

    // Check token expiration
    if (
      account.token_expires_at &&
      new Date(account.token_expires_at) < new Date()
    ) {
      return NextResponse.json(
        { error: "Token-ul Facebook a expirat. Reconectează contul." },
        { status: 401 }
      );
    }

    const pageId = account.platform_user_id;
    const accessToken = account.access_token;

    // Period: last 30 days
    const since = Math.floor(
      (Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000
    );
    const until = Math.floor(Date.now() / 1000);

    // Fetch page-level insights
    const metrics = [
      "page_fans",
      "page_impressions",
      "page_engaged_users",
      "page_post_engagements",
    ].join(",");

    const insightsRes = await fetch(
      `${META_GRAPH_API}/${pageId}/insights?` +
        new URLSearchParams({
          access_token: accessToken,
          metric: metrics,
          period: "day",
          since: String(since),
          until: String(until),
        }).toString()
    );
    const insightsData = await insightsRes.json();

    if (insightsData.error) {
      console.error("Facebook insights error:", insightsData.error);
      return NextResponse.json(
        { error: `Eroare Facebook: ${insightsData.error.message}` },
        { status: 502 }
      );
    }

    // Process insights into a usable format
    const result: Record<string, { total: number; daily: DailyValue[] }> = {};

    for (const metric of insightsData.data || []) {
      const values = (metric.values || []).map(
        (v: { end_time: string; value: number }) => ({
          date: v.end_time,
          value: v.value || 0,
        })
      );
      const total = values.reduce(
        (sum: number, v: DailyValue) => sum + v.value,
        0
      );

      result[metric.name] = { total, daily: values };
    }

    return NextResponse.json({
      insights: result,
      page_name: account.platform_name,
      page_id: pageId,
      followers_count: account.followers_count,
      period: { since: new Date(since * 1000), until: new Date(until * 1000) },
    });
  } catch (err) {
    console.error("Facebook insights API error:", err);
    return NextResponse.json(
      { error: "Eroare internă la preluarea statisticilor." },
      { status: 500 }
    );
  }
}

interface DailyValue {
  date: string;
  value: number;
}
