import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

const NO_STORE = {
  headers: {
    "Cache-Control": "no-store",
  },
};

type HealthCheck = {
  ok: boolean;
  latencyMs: number;
  message?: string;
};

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
  const provided = resolveMonitoringToken(request);
  return provided === expected;
}

async function runDatabaseCheck(): Promise<HealthCheck> {
  const startedAt = Date.now();

  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("organizations")
      .select("id")
      .limit(1);

    if (error) {
      return {
        ok: false,
        latencyMs: Date.now() - startedAt,
        message: `db_error:${error.code || "unknown"}`,
      };
    }

    return {
      ok: true,
      latencyMs: Date.now() - startedAt,
      message: "ok",
    };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - startedAt,
      message:
        error instanceof Error ? `db_exception:${error.message}` : "db_exception:unknown",
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
    uptimeSec: Math.round(process.uptime()),
  };

  if (!isDeep) {
    return NextResponse.json(
      {
        ...basePayload,
        checks: {
          app: {
            ok: true,
            latencyMs: Date.now() - startedAt,
          },
        },
      },
      { status: 200, ...NO_STORE }
    );
  }

  if (!isDeepCheckAuthorized(request)) {
    return NextResponse.json(
      {
        ...basePayload,
        status: "degraded",
        checks: {
          app: {
            ok: true,
            latencyMs: Date.now() - startedAt,
          },
          deep: {
            ok: false,
            latencyMs: 0,
            message: "monitoring_auth_required",
          },
        },
      },
      { status: 401, ...NO_STORE }
    );
  }

  const dbCheck = await runDatabaseCheck();
  const appLatency = Date.now() - startedAt;
  const status = dbCheck.ok ? "ok" : "degraded";

  return NextResponse.json(
    {
      ...basePayload,
      status,
      checks: {
        app: {
          ok: true,
          latencyMs: appLatency,
        },
        database: dbCheck,
      },
    },
    { status: dbCheck.ok ? 200 : 503, ...NO_STORE }
  );
}

export async function HEAD(request: NextRequest) {
  const response = await GET(request);
  return new NextResponse(null, {
    status: response.status,
    headers: response.headers,
  });
}

