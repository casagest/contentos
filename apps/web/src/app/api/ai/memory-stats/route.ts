// src/app/api/ai/memory-stats/route.ts
// Returns cognitive memory statistics for the current organization.
// Lightweight endpoint — no AI calls, just DB counts.

import { NextResponse } from "next/server";
import { getSessionUserWithOrg } from "@/lib/auth";

export async function GET() {
  const session = await getSessionUserWithOrg();
  if (session instanceof NextResponse) return session;

  const { supabase, organizationId } = session;

  // Run all counts in parallel
  const [episodic, semantic, procedural, working, metacognitive] =
    await Promise.all([
      supabase
        .schema("contentos")
        .from("episodic_memory")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId),
      supabase
        .schema("contentos")
        .from("semantic_patterns")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId),
      supabase
        .schema("contentos")
        .from("procedural_strategies")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId),
      supabase
        .schema("contentos")
        .from("working_memory")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId),
      supabase
        .schema("contentos")
        .from("metacognitive_log")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId),
    ]);

  const stats = {
    episodic: episodic.count ?? 0,
    semantic: semantic.count ?? 0,
    procedural: procedural.count ?? 0,
    working: working.count ?? 0,
    metacognitive: metacognitive.count ?? 0,
    total:
      (episodic.count ?? 0) +
      (semantic.count ?? 0) +
      (procedural.count ?? 0) +
      (working.count ?? 0) +
      (metacognitive.count ?? 0),
  };

  // Determine learning level
  let level: "empty" | "learning" | "active" | "expert" = "empty";
  if (stats.total === 0) level = "empty";
  else if (stats.episodic < 10) level = "learning";
  else if (stats.semantic < 5) level = "active";
  else level = "expert";

  return NextResponse.json({ stats, level });
}
