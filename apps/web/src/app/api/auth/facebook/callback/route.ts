import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const META_GRAPH_API = "https://graph.facebook.com/v21.0";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const settingsUrl = (params: string) =>
    new URL(`/settings?${params}`, request.url);

  // --- Error from Facebook ---
  if (error) {
    console.error("Facebook OAuth error:", error);
    return NextResponse.redirect(settingsUrl("error=facebook_auth_denied"));
  }

  if (!code) {
    return NextResponse.redirect(settingsUrl("error=missing_code"));
  }

  // --- CSRF state verification ---
  const cookieStore = await cookies();
  const savedState = cookieStore.get("fb_oauth_state")?.value;
  cookieStore.delete("fb_oauth_state");

  if (!savedState || savedState !== state) {
    console.error("Facebook OAuth CSRF state mismatch");
    return NextResponse.redirect(settingsUrl("error=invalid_state"));
  }

  try {
    // --- Verify authenticated user ---
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!userData?.organization_id) {
      return NextResponse.redirect(settingsUrl("error=no_organization"));
    }

    const appId = process.env.FACEBOOK_APP_ID || process.env.META_APP_ID;
    const appSecret =
      process.env.FACEBOOK_APP_SECRET || process.env.META_APP_SECRET;

    if (!appId || !appSecret) {
      return NextResponse.redirect(settingsUrl("error=config_missing"));
    }

    const { getAppUrl } = await import("@/lib/app-url");
    const redirectUri = `${getAppUrl()}/api/auth/facebook/callback`;

    // --- Step 1: Exchange code for short-lived token ---
    const tokenParams = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code,
    });

    const tokenRes = await fetch(
      `${META_GRAPH_API}/oauth/access_token?${tokenParams.toString()}`
    );
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error("Token exchange error:", tokenData.error);
      return NextResponse.redirect(settingsUrl("error=token_exchange_failed"));
    }

    // --- Step 2: Exchange for long-lived token (60 days) ---
    const longLivedParams = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: tokenData.access_token,
    });

    const longLivedRes = await fetch(
      `${META_GRAPH_API}/oauth/access_token?${longLivedParams.toString()}`
    );
    const longLivedData = await longLivedRes.json();

    if (longLivedData.error) {
      console.error("Long-lived token error:", longLivedData.error);
      return NextResponse.redirect(
        settingsUrl("error=long_lived_token_failed")
      );
    }

    const userAccessToken = longLivedData.access_token;
    const tokenExpiresAt = new Date(
      Date.now() + (longLivedData.expires_in || 5184000) * 1000
    );

    // --- Step 3: Fetch user's Facebook Pages ---
    const pagesRes = await fetch(
      `${META_GRAPH_API}/me/accounts?` +
        new URLSearchParams({
          access_token: userAccessToken,
          fields:
            "id,name,username,picture,fan_count,followers_count,access_token,instagram_business_account",
        }).toString()
    );
    const pagesData = await pagesRes.json();

    if (pagesData.error || !pagesData.data?.length) {
      console.error("Pages fetch error:", pagesData.error || "No pages found");
      return NextResponse.redirect(settingsUrl("error=no_pages_found"));
    }

    // --- Step 4: Save each page + linked Instagram account ---
    const upsertPromises = [];

    for (const page of pagesData.data) {
      // Save Facebook Page
      upsertPromises.push(
        supabase.from("social_accounts").upsert(
          {
            organization_id: userData.organization_id,
            platform: "facebook",
            platform_user_id: page.id,
            platform_username: page.username || page.name.toLowerCase().replace(/\s+/g, ""),
            platform_name: page.name,
            avatar_url: page.picture?.data?.url || null,
            access_token: page.access_token, // Page-level long-lived token
            token_expires_at: tokenExpiresAt.toISOString(),
            followers_count: page.followers_count || page.fan_count || 0,
            following_count: 0,
            posts_count: 0,
            sync_status: "synced",
            is_active: true,
            raw_profile: {
              page_id: page.id,
              fan_count: page.fan_count,
              has_instagram: !!page.instagram_business_account,
            },
          },
          { onConflict: "organization_id,platform,platform_user_id" }
        )
      );

      // If page has linked Instagram Business Account, fetch and save it
      if (page.instagram_business_account?.id) {
        const igId = page.instagram_business_account.id;

        // Fetch Instagram profile details
        const igRes = await fetch(
          `${META_GRAPH_API}/${igId}?` +
            new URLSearchParams({
              access_token: page.access_token,
              fields:
                "id,username,name,profile_picture_url,followers_count,follows_count,media_count",
            }).toString()
        );
        const igData = await igRes.json();

        if (!igData.error) {
          upsertPromises.push(
            supabase.from("social_accounts").upsert(
              {
                organization_id: userData.organization_id,
                platform: "instagram",
                platform_user_id: igData.id,
                platform_username: igData.username || igData.name,
                platform_name: igData.name || igData.username,
                avatar_url: igData.profile_picture_url || null,
                access_token: page.access_token, // Uses page token for IG API
                token_expires_at: tokenExpiresAt.toISOString(),
                followers_count: igData.followers_count || 0,
                following_count: igData.follows_count || 0,
                posts_count: igData.media_count || 0,
                sync_status: "synced",
                is_active: true,
                raw_profile: {
                  ig_account_id: igData.id,
                  page_id: page.id,
                  media_count: igData.media_count,
                },
              },
              { onConflict: "organization_id,platform,platform_user_id" }
            )
          );
        }
      }
    }

    const results = await Promise.all(upsertPromises);
    const errors = results.filter((r) => r.error);

    if (errors.length > 0) {
      console.error("Error saving accounts:", errors.map((e) => e.error));
      return NextResponse.redirect(settingsUrl("error=save_failed"));
    }

    // --- Step 5: Auto-sync initial posts (non-blocking) ---
    try {
      for (const page of pagesData.data) {
        await syncInitialPosts(supabase, page, userData.organization_id);
      }
    } catch (syncErr) {
      // Don't block the redirect if initial sync fails
      console.error("Initial post sync error (non-blocking):", syncErr);
    }

    return NextResponse.redirect(
      new URL("/settings?connected=facebook", request.url)
    );
  } catch (err) {
    console.error("Facebook OAuth callback error:", err);
    return NextResponse.redirect(settingsUrl("error=facebook_auth_failed"));
  }
}

// ============================================================
// Initial post sync after OAuth connection
// ============================================================

async function syncInitialPosts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  page: {
    id: string;
    access_token: string;
    instagram_business_account?: { id: string };
  },
  orgId: string
) {
  // Get the saved social account ID for this page
  const { data: fbAccount } = await supabase
    .from("social_accounts")
    .select("id")
    .eq("organization_id", orgId)
    .eq("platform", "facebook")
    .eq("platform_user_id", page.id)
    .single();

  if (fbAccount) {
    // Fetch Facebook posts
    const fields = [
      "id",
      "message",
      "created_time",
      "full_picture",
      "permalink_url",
      "shares",
      "likes.summary(true)",
      "comments.summary(true)",
    ].join(",");

    const postsRes = await fetch(
      `${META_GRAPH_API}/${page.id}/posts?` +
        new URLSearchParams({
          access_token: page.access_token,
          fields,
          limit: "25",
        }).toString()
    );
    const postsData = await postsRes.json();

    if (!postsData.error && postsData.data?.length) {
      const posts = postsData.data.map(
        (post: {
          id: string;
          message?: string;
          created_time: string;
          full_picture?: string;
          permalink_url?: string;
          shares?: { count: number };
          likes?: { summary: { total_count: number } };
          comments?: { summary: { total_count: number } };
        }) => ({
          social_account_id: fbAccount.id,
          organization_id: orgId,
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
          published_at: post.created_time,
        })
      );

      await supabase.from("posts").upsert(posts, {
        onConflict: "organization_id,platform,platform_post_id",
      });
    }
  }

  // Sync Instagram posts if connected
  if (page.instagram_business_account?.id) {
    const igId = page.instagram_business_account.id;

    const { data: igAccount } = await supabase
      .from("social_accounts")
      .select("id")
      .eq("organization_id", orgId)
      .eq("platform", "instagram")
      .eq("platform_user_id", igId)
      .single();

    if (igAccount) {
      const igFields = [
        "id",
        "caption",
        "media_type",
        "media_url",
        "thumbnail_url",
        "permalink",
        "timestamp",
        "like_count",
        "comments_count",
      ].join(",");

      const igPostsRes = await fetch(
        `${META_GRAPH_API}/${igId}/media?` +
          new URLSearchParams({
            access_token: page.access_token,
            fields: igFields,
            limit: "25",
          }).toString()
      );
      const igPostsData = await igPostsRes.json();

      if (!igPostsData.error && igPostsData.data?.length) {
        const contentTypeMap: Record<string, string> = {
          IMAGE: "image",
          VIDEO: "reel",
          CAROUSEL_ALBUM: "carousel",
        };

        const posts = igPostsData.data.map(
          (post: {
            id: string;
            caption?: string;
            media_type: string;
            media_url?: string;
            thumbnail_url?: string;
            permalink: string;
            timestamp: string;
            like_count?: number;
            comments_count?: number;
          }) => ({
            social_account_id: igAccount.id,
            organization_id: orgId,
            platform: "instagram",
            platform_post_id: post.id,
            platform_url: post.permalink,
            content_type: contentTypeMap[post.media_type] || "image",
            text_content: post.caption || "",
            media_urls: [post.media_url || post.thumbnail_url].filter(Boolean),
            hashtags: extractHashtags(post.caption || ""),
            mentions: extractMentions(post.caption || ""),
            likes_count: post.like_count || 0,
            comments_count: post.comments_count || 0,
            shares_count: 0,
            published_at: post.timestamp,
          })
        );

        await supabase.from("posts").upsert(posts, {
          onConflict: "organization_id,platform,platform_post_id",
        });
      }
    }
  }
}

function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\w\u0103\u00e2\u00ee\u0219\u021b\u0102\u00c2\u00ce\u0218\u021a]+/g);
  return matches ? matches.map((h) => h.toLowerCase()) : [];
}

function extractMentions(text: string): string[] {
  const matches = text.match(/@[\w.]+/g);
  return matches ? matches.map((m) => m.toLowerCase()) : [];
}
