import { NextRequest, NextResponse } from "next/server";
import { getSessionUserWithOrg } from "@/lib/auth";
import { queryAuditTrail } from "@/lib/ai/memory-consolidation";
import type { AuditActionType } from "@/lib/ai/types";

export async function GET(request: NextRequest) {
  const session = await getSessionUserWithOrg();
  if (session instanceof NextResponse) return session;

  const { organizationId, supabase } = session;
  const searchParams = request.nextUrl.searchParams;

  const actionType = searchParams.get("actionType") as AuditActionType | null;
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 50));
  const since = searchParams.get("since") ?? undefined;

  const result = await queryAuditTrail({
    supabase,
    organizationId,
    actionType: actionType ?? undefined,
    limit,
    since,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, entries: result.value });
}
