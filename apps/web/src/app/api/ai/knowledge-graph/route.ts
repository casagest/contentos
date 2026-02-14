import { NextRequest, NextResponse } from "next/server";
import { getSessionUserWithOrg } from "@/lib/auth";
import {
  getTopEntities,
  getStrongestRelationships,
  getEntityNeighborhood,
} from "@/lib/ai/knowledge-graph";
import type { EntityType } from "@/lib/ai/types";

export async function GET(request: NextRequest) {
  const session = await getSessionUserWithOrg();
  if (session instanceof NextResponse) return session;

  const { organizationId, supabase } = session;
  const searchParams = request.nextUrl.searchParams;

  const entityId = searchParams.get("entityId");
  const entityType = searchParams.get("entityType") as EntityType | null;
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));

  // If entityId provided, return neighborhood
  if (entityId) {
    const result = await getEntityNeighborhood({
      supabase,
      organizationId,
      entityId,
      minWeight: 0,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error.message, code: result.error.code },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, neighborhood: result.value });
  }

  // Otherwise, return top entities + strongest relationships
  const [entitiesResult, relsResult] = await Promise.all([
    getTopEntities({
      supabase,
      organizationId,
      entityType: entityType ?? undefined,
      limit,
    }),
    getStrongestRelationships({
      supabase,
      organizationId,
      limit,
    }),
  ]);

  return NextResponse.json({
    ok: true,
    entities: entitiesResult.ok ? entitiesResult.value : [],
    relationships: relsResult.ok ? relsResult.value : [],
  });
}
