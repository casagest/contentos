import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseUrl } from "@/lib/supabase/url";

// Paths that need NO auth check at all (public pages, completely skip Supabase)
const PUBLIC_PATHS = ["/login", "/register", "/reset-password", "/update-password", "/privacy", "/terms", "/gdpr"];

// Protected paths that redirect to login if not authenticated
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/coach",
  "/compose",
  "/analyze",
  "/analytics",
  "/calendar",
  "/history",
  "/research",
  "/braindump",
  "/inspiration",
  "/settings",
  "/onboarding",
  "/video-script",
  "/image-editor",
];

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(self), geolocation=()");
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Fast path: skip auth entirely for public pages, API, and assets
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isApi = pathname.startsWith("/api/");
  if (isPublic || isApi) {
    return addSecurityHeaders(NextResponse.next());
  }

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isLandingPage = pathname === "/";

  // If neither protected nor landing, skip auth
  if (!isProtected && !isLandingPage) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Only now create Supabase client and check auth
  const supabaseResponse = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    getSupabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[]
        ) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as never)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes — redirect to login if not authenticated
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users from landing page to dashboard
  if (isLandingPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return addSecurityHeaders(supabaseResponse);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
