import { NextRequest, NextResponse } from "next/server";
import { getSessionUserWithOrg } from "@/lib/auth";
import { consolidateOrganization } from "@/lib/ai/memory-consolidation";

export async function POST(request: NextRequest) {
  const session = await getSessionUserWithOrg();
  if (session instanceof NextResponse) return session;

  const { organizationId, supabase } = session;

  let body: { platform?: string; dryRun?: boolean } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // Empty body is fine — all params are optional
  }

  const result = await consolidateOrganization({
    supabase,
    organizationId,
    platform: body.platform ?? null,
    dryRun: body.dryRun ?? false,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, stats: result.value });
}
