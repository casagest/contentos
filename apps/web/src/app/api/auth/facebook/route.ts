import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const META_AUTH_URL = "https://www.facebook.com/v21.0/dialog/oauth";

// Base scopes (always requested)
const BASE_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_read_user_content",
  "read_insights",
  "instagram_basic",
  "instagram_manage_insights",
];

// Publishing scopes — enable these in Facebook App settings first,
// then set FACEBOOK_PUBLISH_SCOPES_ENABLED=true in .env
const PUBLISH_SCOPES = [
  "pages_manage_posts",
  "instagram_content_publish",
];

const SCOPES = [
  ...BASE_SCOPES,
  ...(process.env.FACEBOOK_PUBLISH_SCOPES_ENABLED === "true" ? PUBLISH_SCOPES : []),
].join(",");

export async function GET() {
  const appId = process.env.FACEBOOK_APP_ID || process.env.META_APP_ID;

  if (!appId) {
    return NextResponse.json(
      { error: "Facebook App ID nu este configurat." },
      { status: 500 }
    );
  }

  // Generate CSRF state token
  const state = crypto.randomUUID();

  // Store state in cookie for verification in callback
  const cookieStore = await cookies();
  cookieStore.set("fb_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/facebook/callback`;

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: SCOPES,
    response_type: "code",
    state,
  });

  return NextResponse.redirect(`${META_AUTH_URL}?${params.toString()}`);
}
