import { NextRequest, NextResponse } from "next/server";

/**
 * Redirects to the canonical Facebook OAuth flow.
 * The canonical flow is /api/auth/facebook (init) + /api/auth/facebook/callback (callback).
 * This ensures CSRF state validation and proper Page/Instagram saving.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");

  // If returning from Facebook with a code, the canonical callback
  // must have been configured. Redirect to canonical init to avoid
  // duplicate paths; Meta app should use /api/auth/facebook/callback.
  if (code) {
    return NextResponse.redirect(
      new URL("/api/auth/facebook/callback?" + searchParams.toString(), request.url)
    );
  }

  return NextResponse.redirect(new URL("/api/auth/facebook", request.url));
}
