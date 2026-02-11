import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ContentAIService } from "@contentos/content-engine";
import type { Platform, Post } from "@contentos/content-engine";
import { getSessionUserWithOrg } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUserWithOrg();
    if (session instanceof NextResponse) return session;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Configurare server incompletă. Cheia API lipsește." },
        { status: 500 }
      );
    }

    const body = await request.json();

    if (!body.question?.trim()) {
      return NextResponse.json(
        { error: "Întrebarea nu poate fi goală." },
        { status: 400 }
      );
    }

    const { organizationId, supabase } = session;

    // Fetch recent and top-performing posts
    let recentPosts: Post[] = [];
    let topPerformingPosts: Post[] = [];

    const { data: recentRows } = await supabase
      .from("posts")
      .select("*")
      .eq("organization_id", organizationId)
      .order("published_at", { ascending: false })
      .limit(10);

    if (recentRows?.length) {
      recentPosts = recentRows.map(dbPostToEnginePost);
    }

    const { data: topRows } = await supabase
      .from("posts")
      .select("*")
      .eq("organization_id", organizationId)
      .order("engagement_rate", { ascending: false })
      .limit(5);

    if (topRows?.length) {
      topPerformingPosts = topRows.map(dbPostToEnginePost);
    }

    const service = new ContentAIService({ apiKey });

    const result = await service.chat({
      organizationId,
      platform: body.platform as Platform | undefined,
      question: body.question,
      recentPosts,
      topPerformingPosts,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof Anthropic.APIError) {
      if (error.status === 429) {
        return NextResponse.json(
          { error: "Prea multe cereri. Te rugăm să aștepți câteva secunde." },
          { status: 429 }
        );
      }
      if (error.status === 401) {
        return NextResponse.json(
          { error: "Cheie API invalidă. Verifică configurarea." },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: `Eroare API: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    console.error("Coach AI Error:", error);
    return NextResponse.json(
      { error: "A apărut o eroare neașteptată. Te rugăm să încerci din nou." },
      { status: 500 }
    );
  }
}

// Map Supabase snake_case columns to engine camelCase Post type
function dbPostToEnginePost(row: Record<string, unknown>): Post {
  const r = row as Record<string, string | number | string[] | undefined>;
  return {
    id: String(r.id ?? ""),
    socialAccountId: String(r.social_account_id ?? ""),
    organizationId: String(r.organization_id ?? ""),
    platform: (r.platform ?? "") as Post["platform"],
    platformPostId: String(r.platform_post_id ?? ""),
    platformUrl: String(r.platform_url ?? ""),
    contentType: (r.content_type ?? "text") as Post["contentType"],
    textContent: String(r.text_content ?? ""),
    mediaUrls: Array.isArray(r.media_urls) ? r.media_urls : [],
    hashtags: Array.isArray(r.hashtags) ? r.hashtags : [],
    mentions: Array.isArray(r.mentions) ? r.mentions : [],
    language: (r.language ?? "ro") as Post["language"],
    likesCount: Number(r.likes_count ?? 0),
    commentsCount: Number(r.comments_count ?? 0),
    sharesCount: Number(r.shares_count ?? 0),
    savesCount: Number(r.saves_count ?? 0),
    viewsCount: Number(r.views_count ?? 0),
    reachCount: Number(r.reach_count ?? 0),
    impressionsCount: Number(r.impressions_count ?? 0),
    engagementRate: Number(r.engagement_rate ?? 0),
    viralityScore: Number(r.virality_score ?? 0),
    topicTags: Array.isArray(r.topic_tags) ? r.topic_tags : [],
    sentiment: (r.sentiment ?? "neutral") as Post["sentiment"],
    hookType: r.hook_type as string | undefined,
    ctaType: r.cta_type as string | undefined,
    publishedAt: r.published_at ? new Date(r.published_at as string) : new Date(),
    dentalCategory: r.dental_category as Post["dentalCategory"],
  };
}
