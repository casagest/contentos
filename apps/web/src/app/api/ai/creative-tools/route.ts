import { NextRequest, NextResponse } from "next/server";
import { getSessionUserWithOrg } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";

const NO_STORE = { headers: { "Cache-Control": "no-store" } };

// Trend pulse — date reale din creative_memory + curatate pe industrie
const TRENDS_BY_INDUSTRY: Record<string, { topic: string; hashtags: string[] }[]> = {
  dental: [
    { topic: "Tratamente dentare fără durere", hashtags: ["#dentist", "#ortodonție"] },
    { topic: "Albețire dentară naturală", hashtags: ["#albețiredentară", "#zâmbet"] },
    { topic: "Igienă orală pentru copii", hashtags: ["#dentistcopii", "#prevenție"] },
    { topic: "Implanturi dentare moderne", hashtags: ["#implant", "#tehnologie"] },
  ],
  medical: [
    { topic: "Prevenție sănătate", hashtags: ["#prevenție", "#sănătate"] },
    { topic: "Consultații online", hashtags: ["#telemedicină", "#accesibilitate"] },
    { topic: "Nutriție și stil de viață", hashtags: ["#nutriție", "#wellness"] },
  ],
  restaurant: [
    { topic: "Mâncărți locale de sezon", hashtags: ["#local", "#fresh"] },
    { topic: "Experiențe culinare unice", hashtags: ["#foodie", "#experiență"] },
    { topic: "Rețete rapid de acasă", hashtags: ["#rețete", "#homecooking"] },
  ],
  fitness: [
    { topic: "Antrenamente scurte eficiente", hashtags: ["#HIIT", "#fitness"] },
    { topic: "Recuperare și mobilitate", hashtags: ["#stretching", "#wellness"] },
    { topic: "Nutriție sportivi", hashtags: ["#proteină", "#performanță"] },
  ],
  beauty: [
    { topic: "Rutine skincare simplificate", hashtags: ["#skincare", "#routine"] },
    { topic: "Make-up natural și rapid", hashtags: ["#natural", "#makeup"] },
    { topic: "Tratamente salon acasă", hashtags: ["#athome", "#beauty"] },
  ],
  default: [
    { topic: "Storytelling autentic", hashtags: ["#poveste", "#autentic"] },
    { topic: "Behind the scenes", hashtags: ["#BTS", "#echipă"] },
    { topic: "Value-first content", hashtags: ["#valoare", "#educație"] },
    { topic: "Comunitate și feedback", hashtags: ["#comunitate", "#feedback"] },
  ],
};

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUserWithOrg();
    if (session instanceof NextResponse) return session;

    const { organizationId, supabase } = session;

    let industry = "default";
    const { data: org } = await supabase
      .from("organizations")
      .select("settings")
      .eq("id", organizationId)
      .single();
    const settings = (org?.settings as Record<string, unknown>) || {};
    const bp = settings?.businessProfile as { industry?: string } | null;
    if (bp?.industry) industry = bp.industry;

    const queryIndustry = request.nextUrl.searchParams.get("industry");
    if (queryIndustry && TRENDS_BY_INDUSTRY[queryIndustry])
      industry = queryIndustry;

    const since = new Date();
    since.setDate(since.getDate() - 90);
    const sinceStr = since.toISOString();

    const serviceClient = createServiceClient();

    // Date reale: posts + creative_memory
    const [postsRes, memoryRes] = await Promise.all([
      serviceClient
        .from("posts")
        .select("published_at, likes_count, comments_count, shares_count, platform")
        .eq("organization_id", organizationId)
        .gte("published_at", sinceStr),
      serviceClient
        .from("creative_memory")
        .select("hook_type, avg_engagement, sample_size")
        .eq("organization_id", organizationId)
        .gt("sample_size", 0)
        .order("avg_engagement", { ascending: false })
        .limit(20),
    ]);

    const posts = postsRes.data || [];

    const hourMap = new Map<
      number,
      { engagement: number; count: number; platforms: Set<string> }
    >();
    for (let h = 0; h < 24; h++) {
      hourMap.set(h, { engagement: 0, count: 0, platforms: new Set() });
    }

    for (const p of posts) {
      if (!p.published_at) continue;
      const hour = new Date(p.published_at).getHours();
      const eng =
        (p.likes_count || 0) +
        (p.comments_count || 0) +
        (p.shares_count || 0);
      const data = hourMap.get(hour)!;
      data.engagement += eng;
      data.count++;
      if (p.platform) data.platforms.add(p.platform);
    }

    const bestHours = Array.from(hourMap.entries())
      .filter(([, d]) => d.count > 0)
      .map(([hour, d]) => ({
        hour,
        avgEngagement:
          d.count > 0 ? Math.round(d.engagement / d.count) : 0,
        postCount: d.count,
        platforms: Array.from(d.platforms),
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, 6);

    const baseTrends = TRENDS_BY_INDUSTRY[industry] || TRENDS_BY_INDUSTRY.default;

    // Top hooks din date reale → idei de conținut
    const topHooks = (memoryRes.data || [])
      .filter((m) => m.hook_type)
      .slice(0, 5)
      .map((m) => ({
        topic: `Hook ${m.hook_type} (${m.avg_engagement?.toFixed(1) ?? 0}% eng.)`,
        hashtags: ["#optimizat"],
      }));

    const trends =
      topHooks.length > 0 ? [...topHooks, ...baseTrends].slice(0, 8) : baseTrends;

    return NextResponse.json(
      {
        trends,
        bestHours,
        industry,
        topHooksFromData: topHooks.length > 0,
      },
      NO_STORE
    );
  } catch (err) {
    console.error("Creative tools error:", err);
    return NextResponse.json(
      { error: "Eroare la încărcare." },
      { status: 500, ...NO_STORE }
    );
  }
}
