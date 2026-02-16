import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { LinkedInAdapter } from "@contentos/content-engine";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const settingsUrl = (params: string) =>
    new URL(`/settings?${params}`, request.url);

  if (error) {
    console.error("LinkedIn OAuth error:", error);
    return NextResponse.redirect(settingsUrl("error=linkedin_auth_denied"));
  }

  if (!code) {
    return NextResponse.redirect(settingsUrl("error=missing_code"));
  }

  // CSRF state verification
  const cookieStore = await cookies();
  const savedState = cookieStore.get("li_oauth_state")?.value;
  cookieStore.delete("li_oauth_state");

  if (!savedState || savedState !== state) {
    console.error("LinkedIn OAuth CSRF state mismatch");
    return NextResponse.redirect(settingsUrl("error=invalid_state"));
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!userData?.organization_id) {
      return NextResponse.redirect(settingsUrl("error=no_organization"));
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID || "";
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET || "";

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(settingsUrl("error=config_missing"));
    }

    const adapter = new LinkedInAdapter({ clientId, clientSecret });
    const { getAppUrl } = await import("@/lib/app-url");
    const redirectUri = `${getAppUrl()}/api/auth/linkedin/callback`;

    // Exchange code for tokens
    const tokens = await adapter.exchangeCodeForTokens(code, redirectUri);

    // Get profile
    const profile = await adapter.getProfile(tokens.accessToken);

    // Save account
    const { error: upsertError } = await supabase
      .from("social_accounts")
      .upsert(
        {
          organization_id: userData.organization_id,
          platform: "linkedin",
          platform_user_id: profile.id,
          platform_username: profile.username,
          platform_name: profile.name,
          avatar_url: profile.avatarUrl || null,
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken || null,
          token_expires_at: tokens.expiresAt?.toISOString() || null,
          followers_count: profile.followersCount,
          following_count: profile.followingCount,
          posts_count: profile.postsCount,
          sync_status: "synced",
          is_active: true,
          raw_profile: {
            person_urn: profile.id,
          },
        },
        { onConflict: "organization_id,platform,platform_user_id" }
      );

    if (upsertError) {
      console.error("Error saving LinkedIn account:", upsertError);
      return NextResponse.redirect(settingsUrl("error=save_failed"));
    }

    // Auto-sync initial posts (non-blocking)
    try {
      const { data: savedAccount } = await supabase
        .from("social_accounts")
        .select("id")
        .eq("organization_id", userData.organization_id)
        .eq("platform", "linkedin")
        .eq("platform_user_id", profile.id)
        .single();

      if (savedAccount) {
        const { posts } = await adapter.fetchPosts(tokens.accessToken, { limit: 25 });
        if (posts.length > 0) {
           
          const postRows = posts.map((p: any) => ({
            social_account_id: savedAccount.id,
            organization_id: userData.organization_id,
            platform: "linkedin",
            platform_post_id: p.platformPostId,
            platform_url: p.platformUrl,
            content_type: p.contentType || "text",
            text_content: p.textContent || "",
            media_urls: p.mediaUrls || [],
            hashtags: p.hashtags || [],
            mentions: p.mentions || [],
            likes_count: p.likesCount || 0,
            comments_count: p.commentsCount || 0,
            shares_count: p.sharesCount || 0,
            published_at: p.publishedAt?.toISOString(),
          }));

          await supabase.from("posts").upsert(postRows, {
            onConflict: "organization_id,platform,platform_post_id",
          });
        }
      }
    } catch (syncErr) {
      console.error("LinkedIn initial post sync error (non-blocking):", syncErr);
    }

    return NextResponse.redirect(
      new URL("/settings?connected=linkedin", request.url)
    );
  } catch (err) {
    console.error("LinkedIn OAuth callback error:", err);
    return NextResponse.redirect(settingsUrl("error=linkedin_auth_failed"));
  }
}
