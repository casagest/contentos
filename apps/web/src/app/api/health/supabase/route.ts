import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseUrl } from "@/lib/supabase/url";

export const dynamic = "force-dynamic";

function safeHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * Test Supabase connectivity — verifică dacă Auth API răspunde corect.
 * GET /api/health/supabase
 */
export async function GET() {
  const startedAt = Date.now();
  const url = getSupabaseUrl();
  const hasUrl = !!url;
  const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!hasUrl || !hasKey) {
    return NextResponse.json(
      {
        ok: false,
        latencyMs: Date.now() - startedAt,
        message: !hasUrl ? "NEXT_PUBLIC_SUPABASE_URL lipsește" : "NEXT_PUBLIC_SUPABASE_ANON_KEY lipsește",
        urlConfigured: hasUrl,
        keyConfigured: hasKey,
      },
      { status: 503 }
    );
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getSession();

    const latencyMs = Date.now() - startedAt;

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          latencyMs,
          message: error.message,
          errorCode: error.name,
          urlConfigured: true,
          urlHost: safeHostname(url),
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        latencyMs,
        message: "Supabase Auth OK",
        urlConfigured: true,
        urlHost: safeHostname(url),
        hasSession: !!data?.session,
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        latencyMs: Date.now() - startedAt,
        message: `Exception: ${message}`,
        urlConfigured: hasUrl,
        urlHost: safeHostname(url),
      },
      { status: 503 }
    );
  }
}
