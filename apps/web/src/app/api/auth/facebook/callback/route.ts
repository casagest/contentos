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

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/facebook/callback`;

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
      console.error(
        "Pages fetch error:",
        pagesData.error || "No pages found"
      );
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

    return NextResponse.redirect(
      new URL("/settings?connected=facebook", request.url)
    );
  } catch (err) {
    console.error("Facebook OAuth callback error:", err);
    return NextResponse.redirect(settingsUrl("error=facebook_auth_failed"));
  }
}
