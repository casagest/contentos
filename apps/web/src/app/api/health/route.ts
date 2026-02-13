import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const NO_STORE = { headers: { "Cache-Control": "no-store" } };

function resolveMonitoringToken(request: NextRequest): string | null {
  const headerToken = request.headers.get("x-monitoring-key");
  if (headerToken) return headerToken;
  const auth = request.headers.get("authorization");
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

function isDeepCheckAuthorized(request: NextRequest): boolean {
  const expected = process.env.MONITORING_API_KEY?.trim();
  if (!expected) return false;
  return resolveMonitoringToken(request) === expected;
}

async function runDatabaseCheck(): Promise<{ ok: boolean; latencyMs: number; message: string }> {
  const startedAt = Date.now();
  try {
    const { createServiceClient } = await import("@/lib/supabase/service");
    const supabase = createServiceClient();
    const { error } = await supabase.from("organizations").select("id").limit(1);
    return {
      ok: !error,
      latencyMs: Date.now() - startedAt,
      message: error ? `db_error:${error.code || "unknown"}` : "ok",
    };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - startedAt,
      message: error instanceof Error ? `db_exception:${error.message}` : "db_exception:unknown",
    };
  }
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const isDeep = request.nextUrl.searchParams.get("deep") === "1";

  const basePayload = {
    service: "contentos-web",
    status: "ok" as "ok" | "degraded",
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    revision:
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
      process.env.VERCEL_URL ||
      "local",
  };

  if (!isDeep) {
    return NextResponse.json(
      { ...basePayload, checks: { app: { ok: true, latencyMs: Date.now() - startedAt } } },
      { status: 200, ...NO_STORE },
    );
  }

  if (!isDeepCheckAuthorized(request)) {
    return NextResponse.json(
      {
        ...basePayload,
        status: "degraded",
        checks: {
          app: { ok: true, latencyMs: Date.now() - startedAt },
          deep: { ok: false, latencyMs: 0, message: "monitoring_auth_required" },
        },
      },
      { status: 401, ...NO_STORE },
    );
  }

  const dbCheck = await runDatabaseCheck();
  const status = dbCheck.ok ? "ok" : "degraded";

  return NextResponse.json(
    {
      ...basePayload,
      status,
      checks: {
        app: { ok: true, latencyMs: Date.now() - startedAt },
        database: dbCheck,
      },
    },
    { status: dbCheck.ok ? 200 : 503, ...NO_STORE },
  );
}

export async function HEAD(request: NextRequest) {
  const response = await GET(request);
  return new NextResponse(null, { status: response.status, headers: response.headers });
}
