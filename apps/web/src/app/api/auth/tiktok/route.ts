import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";

const SCOPES = [
  "user.info.basic",
  "user.info.stats",
  "video.list",
  "video.insights",
  "video.publish",
].join(",");

export async function GET() {
  const clientKey = (process.env.TIKTOK_CLIENT_KEY || "").trim();

  if (!clientKey) {
    return NextResponse.json(
      { error: "TikTok Client Key nu este configurat." },
      { status: 500 }
    );
  }

  const state = crypto.randomUUID();

  const cookieStore = await cookies();
  cookieStore.set("tt_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const redirectUri = `${(process.env.NEXT_PUBLIC_APP_URL || "").trim()}/api/auth/tiktok/callback`;

  const params = new URLSearchParams({
    client_key: clientKey,
    scope: SCOPES,
    response_type: "code",
    redirect_uri: redirectUri,
    state,
  });

  return NextResponse.redirect(`${TIKTOK_AUTH_URL}?${params.toString()}`);
}
