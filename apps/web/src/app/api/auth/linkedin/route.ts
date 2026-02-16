import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";

const SCOPES = ["openid", "profile", "w_member_social"].join(" ");

export async function GET() {
  const clientId = (process.env.LINKEDIN_CLIENT_ID || "").trim();

  if (!clientId) {
    return NextResponse.json(
      { error: "LinkedIn Client ID nu este configurat." },
      { status: 500 }
    );
  }

  const state = crypto.randomUUID();

  const cookieStore = await cookies();
  cookieStore.set("li_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const { getAppUrl } = await import("@/lib/app-url");
  const redirectUri = `${getAppUrl()}/api/auth/linkedin/callback`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
  });

  return NextResponse.redirect(`${LINKEDIN_AUTH_URL}?${params.toString()}`);
}
