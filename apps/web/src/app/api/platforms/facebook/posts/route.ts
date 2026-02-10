import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const META_GRAPH_API = "https://graph.facebook.com/v21.0";

export async function GET(request: NextRequest) {
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

    // Get user's organization
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
      // Mark account as needing re-auth
      await supabase
        .from("social_accounts")
        .update({ sync_status: "error", sync_error: "Token expirat" })
        .eq("id", account.id);

      return NextResponse.json(
        { error: "Token-ul Facebook a expirat. Reconectează contul." },
        { status: 401 }
      );
    }

    const pageId = account.platform_user_id;
    const accessToken = account.access_token;

    const limit = request.nextUrl.searchParams.get("limit") || "50";

    // Fetch posts from Facebook Page
    const fields = [
      "id",
      "message",
      "created_time",
      "full_picture",
      "permalink_url",
      "shares",
      "likes.summary(true)",
      "comments.summary(true)",
      "insights.metric(post_impressions,post_engaged_users,post_clicks)",
    ].join(",");

    const postsRes = await fetch(
      `${META_GRAPH_API}/${pageId}/posts?` +
        new URLSearchParams({
          access_token: accessToken,
          fields,
          limit,
        }).toString()
    );
    const postsData = await postsRes.json();

    if (postsData.error) {
      console.error("Facebook posts fetch error:", postsData.error);

      if (postsData.error.code === 190) {
        await supabase
          .from("social_accounts")
          .update({ sync_status: "error", sync_error: "Token expirat" })
          .eq("id", account.id);
      }

      return NextResponse.json(
        { error: `Eroare Facebook: ${postsData.error.message}` },
        { status: 502 }
      );
    }

    // Transform and save posts to Supabase
    const posts = (postsData.data || []).map((post: FacebookPost) => {
      const insights = post.insights?.data || [];
      const getInsight = (name: string) =>
        insights.find((i) => i.name === name)?.values?.[0]?.value || 0;

      return {
        social_account_id: account.id,
        organization_id: userData.organization_id,
        platform: "facebook",
        platform_post_id: post.id,
        platform_url: post.permalink_url,
        content_type: post.full_picture ? "image" : "text",
        text_content: post.message || "",
        media_urls: post.full_picture ? [post.full_picture] : [],
        hashtags: extractHashtags(post.message || ""),
        mentions: extractMentions(post.message || ""),
        likes_count: post.likes?.summary?.total_count || 0,
        comments_count: post.comments?.summary?.total_count || 0,
        shares_count: post.shares?.count || 0,
        impressions_count: getInsight("post_impressions"),
        reach_count: getInsight("post_engaged_users"),
        views_count: getInsight("post_clicks"),
        published_at: post.created_time,
      };
    });

    // Upsert posts to database
    if (posts.length > 0) {
      const { error: upsertError } = await supabase
        .from("posts")
        .upsert(posts, {
          onConflict: "organization_id,platform,platform_post_id",
        });

      if (upsertError) {
        console.error("Error saving posts:", upsertError);
      }

      // Update sync status
      await supabase
        .from("social_accounts")
        .update({
          sync_status: "synced",
          last_synced_at: new Date().toISOString(),
          sync_error: null,
        })
        .eq("id", account.id);
    }

    return NextResponse.json({
      posts,
      total: posts.length,
      page_name: account.platform_name,
    });
  } catch (err) {
    console.error("Facebook posts API error:", err);
    return NextResponse.json(
      { error: "Eroare internă la preluarea postărilor." },
      { status: 500 }
    );
  }
}

// --- Helpers ---

function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\wăâîșțĂÂÎȘȚ]+/g);
  return matches ? matches.map((h) => h.toLowerCase()) : [];
}

function extractMentions(text: string): string[] {
  const matches = text.match(/@[\w.]+/g);
  return matches ? matches.map((m) => m.toLowerCase()) : [];
}

// --- Types ---

interface FacebookPost {
  id: string;
  message?: string;
  created_time: string;
  full_picture?: string;
  permalink_url?: string;
  shares?: { count: number };
  likes?: { summary: { total_count: number } };
  comments?: { summary: { total_count: number } };
  insights?: {
    data: Array<{
      name: string;
      values: Array<{ value: number }>;
    }>;
  };
}
