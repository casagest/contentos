import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { sanitizeRedirectPath } from "@/lib/redirect";
import { getSupabaseUrl } from "@/lib/supabase/url";

/**
 * POST /api/auth/login — form-based login.
 * On error: redirect to /login?error=X&redirect=/dashboard (no URL param echo).
 */
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = sanitizeRedirectPath(formData.get("redirect") as string);

  const collectedCookies: Array<{ name: string; value: string; options?: Record<string, unknown> }> = [];
  const supabase = createServerClient(
    getSupabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) => {
          collectedCookies.push(...cookiesToSet);
        },
      },
    }
  );

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  const dest = error
    ? (() => {
        const u = new URL("/login", request.url);
        u.searchParams.set("error", error.message);
        u.searchParams.set("redirect", "/dashboard");
        return u;
      })()
    : new URL(redirectTo, request.url);

  const redirectRes = NextResponse.redirect(dest, 303);
  collectedCookies.forEach(({ name, value, options }) =>
    redirectRes.cookies.set(name, value, options)
  );
  return redirectRes;
}
