import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { FacebookAdapter } from "@contentos/content-engine";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    console.error("Facebook OAuth error:", error);
    return NextResponse.redirect(
      new URL("/settings?error=facebook_auth_denied", request.url)
    );
  }

  if (!code) {
    // Initiate OAuth flow — redirect to Facebook
    const adapter = new FacebookAdapter({
      appId: process.env.META_APP_ID!,
      appSecret: process.env.META_APP_SECRET!,
    });

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/facebook`;
    const authUrl = adapter.getAuthUrl(redirectUri);

    return NextResponse.redirect(authUrl);
  }

  // Exchange code for tokens
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const adapter = new FacebookAdapter({
      appId: process.env.META_APP_ID!,
      appSecret: process.env.META_APP_SECRET!,
    });

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/facebook`;
    const tokens = await adapter.exchangeCodeForTokens(code, redirectUri);

    // Get page profile
    const profile = await adapter.getProfile(tokens.accessToken);

    // Get user's organization
    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!userData) {
      return NextResponse.redirect(
        new URL("/settings?error=no_organization", request.url)
      );
    }

    // Save social account
    const { error: insertError } = await supabase
      .from("social_accounts")
      .upsert(
        {
          organization_id: userData.organization_id,
          platform: "facebook",
          platform_user_id: profile.id,
          platform_username: profile.username,
          platform_name: profile.name,
          avatar_url: profile.avatarUrl,
          access_token: tokens.accessToken,
          token_expires_at: tokens.expiresAt?.toISOString(),
          followers_count: profile.followersCount,
          following_count: profile.followingCount,
          posts_count: profile.postsCount,
          sync_status: "pending",
          is_active: true,
        },
        { onConflict: "organization_id,platform,platform_user_id" }
      );

    if (insertError) {
      console.error("Error saving Facebook account:", insertError);
      return NextResponse.redirect(
        new URL("/settings?error=save_failed", request.url)
      );
    }

    // TODO: Trigger post ingestion job via Supabase Edge Function or queue

    return NextResponse.redirect(
      new URL("/dashboard?connected=facebook", request.url)
    );
  } catch (err) {
    console.error("Facebook OAuth callback error:", err);
    return NextResponse.redirect(
      new URL("/settings?error=facebook_auth_failed", request.url)
    );
  }
}
