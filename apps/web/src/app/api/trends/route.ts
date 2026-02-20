/**
 * Trend Radar API — Returns what's trending for Romanian content creators.
 *
 * GET /api/trends
 * Query params:
 *   - date: ISO date string (optional, defaults to today)
 *   - limit: number of top trends (optional, defaults to 10)
 *
 * Auth: requires session (dashboard-only feature)
 * Cost: $0 (no AI calls, all local computation)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUserWithOrg } from "@/lib/auth";
import { getTrendRadar, getTopTrends } from "@/lib/trends-romania";

export async function GET(request: NextRequest) {
  const session = await getSessionUserWithOrg();
  if (session instanceof NextResponse) return session;

  const { searchParams } = request.nextUrl;
  const dateParam = searchParams.get("date");
  const limitParam = searchParams.get("limit");

  const date = dateParam ? new Date(dateParam) : new Date();
  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date parameter" }, { status: 400 });
  }

  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 10, 1), 50) : 10;

  const radar = getTrendRadar(date);
  const topTrends = getTopTrends(date, limit);

  return NextResponse.json({
    ...radar,
    topTrends,
    meta: {
      generatedAt: new Date().toISOString(),
      cost: 0,
      source: "local-computation",
    },
  });
}
