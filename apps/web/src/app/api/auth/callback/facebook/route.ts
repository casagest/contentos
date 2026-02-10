import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { FacebookAdapter } from "@contentos/content-engine";

const META_GRAPH_API = "https://graph.facebook.com/v21.0";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorReason = searchParams.get("error_reason");
  const errorDescription = searchParams.get("error_description");

  // Handle OAuth errors from Facebook
  if (error) {
    console.error("Facebook OAuth error:", error, errorReason, errorDescription);
    return NextResponse.redirect(
      new URL("/settings?error=autorizare_refuzata", request.url)
    );
  }

  // Initiate OAuth flow (no code present)
  if (!code) {
    const appId = process.env.FACEBOOK_APP_ID;
    if (!appId) {
      console.error("FACEBOOK_APP_ID not configured");
      return NextResponse.redirect(
        new URL("/settings?error=configurare_invalida", request.url)
      );
    }

    const adapter = new FacebookAdapter({
      appId,
      appSecret: process.env.FACEBOOK_APP_SECRET || "",
    });

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/facebook`;
    const authUrl = adapter.getAuthUrl(redirectUri);

    return NextResponse.redirect(authUrl);
  }

  // Exchange code for tokens and save connection
  try {
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    if (!appId || !appSecret) {
      console.error("Facebook credentials not configured");
      return NextResponse.redirect(
        new URL("/settings?error=configurare_invalida", request.url)
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Create service client to bypass RLS for database operations
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const adapter = new FacebookAdapter({
      appId,
      appSecret,
    });

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/facebook`;
    
    // Exchange code for access token
    const tokens = await adapter.exchangeCodeForTokens(code, redirectUri);

    // Fetch basic user profile with minimal permissions
    const profileUrl = `${META_GRAPH_API}/me?fields=id,name,picture&access_token=${tokens.accessToken}`;
    const profileResponse = await fetch(profileUrl);
    
    if (!profileResponse.ok) {
      const errorData = await profileResponse.json();
      console.error("Facebook profile fetch error:", errorData);
      return NextResponse.redirect(
        new URL("/settings?error=obtinere_profil_esuata", request.url)
      );
    }

    const profile = await profileResponse.json();

    if (!profile.id || !profile.name) {
      return NextResponse.redirect(
        new URL("/settings?error=date_profil_incomplete", request.url)
      );
    }

    // Get user's organization using service client to bypass RLS
    const { data: userData, error: userError } = await serviceClient
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (userError || !userData?.organization_id) {
      console.error("Error fetching user organization:", userError);
      return NextResponse.redirect(
        new URL("/settings?error=organizatie_negasita", request.url)
      );
    }

    // Save Facebook connection to social_accounts using service client to bypass RLS
    // Note: With only public_profile, we get basic user info, not pages
    const { error: insertError } = await serviceClient
      .from("social_accounts")
      .upsert(
        {
          organization_id: userData.organization_id,
          platform: "facebook",
          platform_user_id: profile.id,
          platform_username: profile.name.toLowerCase().replace(/\s+/g, "_"),
          platform_name: profile.name,
          avatar_url: profile.picture?.data?.url || null,
          access_token: tokens.accessToken,
          token_expires_at: tokens.expiresAt?.toISOString(),
          followers_count: 0, // Not available with public_profile
          following_count: 0, // Not available with public_profile
          posts_count: 0, // Not available with public_profile
          sync_status: "synced",
          is_active: true,
        },
        { onConflict: "organization_id,platform,platform_user_id" }
      );

    if (insertError) {
      console.error("Error saving Facebook account:", insertError);
      return NextResponse.redirect(
        new URL("/settings?error=salvare_esuata", request.url)
      );
    }

    return NextResponse.redirect(
      new URL("/settings?connected=facebook", request.url)
    );
  } catch (err) {
    console.error("Facebook OAuth callback error:", err);
    return NextResponse.redirect(
      new URL("/settings?error=autorizare_esuata", request.url)
    );
  }
}
