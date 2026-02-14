// ============================================================================
// src/app/api/cron/memory-consolidation/route.ts
// Memory Consolidation Cron — Background Maintenance
//
// Responsibilities:
//   - Garbage collect expired episodic + working memory (batched)
//   - Update metacognitive state per organization (Bayesian smoothed)
//   - Process in batches with per-org error isolation
//
// Runs as: POST (has side effects: DELETE + UPSERT)
// Auth: timing-safe CRON_SECRET comparison
// Caller: Vercel Cron / external scheduler
//
// Architecture notes:
//   - Uses service_role client (bypasses RLS for admin operations)
//   - Per-org failures are logged but don't stop other orgs
//   - Batch size prevents Vercel timeout (default 60s on Pro)
// ============================================================================

import { NextResponse } from "next/server";
import * as crypto from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { consolidateOrganization } from "@/lib/ai/memory-consolidation";
import {
  extractEntitiesRuleBased,
  batchUpsertEntities,
} from "@/lib/ai/knowledge-graph";

type ServiceClient = ReturnType<typeof createServiceClient>;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// How many orgs to process per cron invocation
// Sized to complete within Vercel Pro timeout (60s)
// Each org = ~2 DB queries, ~50ms each = ~100ms/org → 500 orgs ≈ 50s
const ORG_BATCH_SIZE = 500;

// Bayesian prior for cold-start orgs
const PRIOR_MEAN = 0.5;
const PRIOR_STRENGTH = 3.0;

// ---------------------------------------------------------------------------
// Auth: timing-safe comparison (prevents timing attacks on secret)
// ---------------------------------------------------------------------------

function verifySecret(provided: string | null, expected: string): boolean {
  if (!provided) return false;

  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");

  if (a.length !== b.length) {
    // Still do comparison to maintain constant time
    crypto.timingSafeEqual(a, Buffer.alloc(a.length));
    return false;
  }

  return crypto.timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// Route Handler (POST — has side effects)
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // Validate environment
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("cron_config_missing: CRON_SECRET not set");
    return new NextResponse("Server configuration error", { status: 500 });
  }

  // Auth
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!verifySecret(token, cronSecret)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Create admin client (service_role bypasses RLS)
  const supabaseAdmin = createServiceClient();

  const startTime = Date.now();
  const stats = {
    gcEpisodic: 0,
    gcWorking: 0,
    orgsProcessed: 0,
    orgsFailed: 0,
    orgErrors: [] as Array<{ orgId: string; error: string }>,
    consolidation: { patternsDetected: 0, patternsPromoted: 0 },
    entities: { created: 0, updated: 0 },
    durationMs: 0,
  };

  try {
    // 1) Garbage Collection (batched, non-blocking)
    const gcEpisodicResult = await supabaseAdmin.rpc(
      "gc_episodic_memory_batch",
      { p_batch_size: 10000 }
    );
    if (gcEpisodicResult.data?.[0]) {
      stats.gcEpisodic = gcEpisodicResult.data[0].deleted_count ?? 0;
    }

    const gcWorkingResult = await supabaseAdmin.rpc(
      "gc_working_memory_batch",
      { p_batch_size: 10000 }
    );
    if (gcWorkingResult.data?.[0]) {
      stats.gcWorking = gcWorkingResult.data[0].deleted_count ?? 0;
    }

    // 2) Fetch active organizations (paginated)
    const { data: orgs, error: orgErr } = await supabaseAdmin
      .from("organizations")
      .select("id")
      .limit(ORG_BATCH_SIZE);

    if (orgErr) {
      throw new Error(`Failed to fetch organizations: ${orgErr.message}`);
    }

    if (!orgs || orgs.length === 0) {
      stats.durationMs = Date.now() - startTime;
      return NextResponse.json({ ok: true, stats });
    }

    // 3) Process orgs in parallel batches of 50
    //    Per-org error isolation: one failure doesn't stop others
    const PARALLEL_CHUNK = 50;
    for (let i = 0; i < orgs.length; i += PARALLEL_CHUNK) {
      const chunk = orgs.slice(i, i + PARALLEL_CHUNK);

      const results = await Promise.allSettled(
        chunk.map((org) =>
          updateMetacognitiveState(supabaseAdmin, org.id)
        )
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        if (result.status === "fulfilled") {
          stats.orgsProcessed++;
        } else {
          stats.orgsFailed++;
          stats.orgErrors.push({
            orgId: chunk[j].id,
            error:
              result.reason instanceof Error
                ? result.reason.message
                : String(result.reason),
          });
        }
      }

      // Safety valve: if too many failures, abort early
      if (stats.orgsFailed > 50) {
        console.error("cron_abort: too many org failures", {
          processed: stats.orgsProcessed,
          failed: stats.orgsFailed,
        });
        break;
      }
    }

    // 4) Pattern consolidation per org (detection + promotion)
    //    Per-org error isolation (non-fatal)
    for (let i = 0; i < orgs.length; i += PARALLEL_CHUNK) {
      const chunk = orgs.slice(i, i + PARALLEL_CHUNK);

      const consolidationResults = await Promise.allSettled(
        chunk.map((org) =>
          consolidateOrganization({
            supabase: supabaseAdmin as any,
            organizationId: org.id,
          })
        )
      );

      for (const result of consolidationResults) {
        if (result.status === "fulfilled" && result.value.ok) {
          stats.consolidation.patternsDetected +=
            result.value.value.patternsDetected;
          stats.consolidation.patternsPromoted +=
            result.value.value.patternsPromoted;
        }
      }
    }

    // 5) Entity extraction per org (rule-based only in cron, LLM is manual)
    for (let i = 0; i < orgs.length; i += PARALLEL_CHUNK) {
      const chunk = orgs.slice(i, i + PARALLEL_CHUNK);

      const entityResults = await Promise.allSettled(
        chunk.map(async (org) => {
          // Fetch recent episodic summaries
          const { data: memories } = await supabaseAdmin
            .from("episodic_memory")
            .select("summary")
            .eq("organization_id", org.id)
            .gte(
              "created_at",
              new Date(Date.now() - 7 * 86_400_000).toISOString()
            )
            .limit(50);

          if (!memories || memories.length === 0) return;

          const summaries = memories.map((m) => m.summary);
          const entities = extractEntitiesRuleBased(summaries);

          if (entities.length > 0) {
            const result = await batchUpsertEntities({
              supabase: supabaseAdmin as any,
              organizationId: org.id,
              entities,
            });
            if (result.ok) {
              stats.entities.created += result.value.created;
              stats.entities.updated += result.value.updated;
            }
          }
        })
      );

      // Entity extraction failures are non-fatal
      for (const result of entityResults) {
        if (result.status === "rejected") {
          console.warn("cron_entity_extraction_failed", {
            error:
              result.reason instanceof Error
                ? result.reason.message
                : String(result.reason),
          });
        }
      }
    }

    stats.durationMs = Date.now() - startTime;

    // Log summary
    console.log("cron_memory_consolidation_complete", stats);

    return NextResponse.json({ ok: true, stats });
  } catch (err) {
    stats.durationMs = Date.now() - startTime;
    console.error("cron_memory_consolidation_failed", {
      error: err instanceof Error ? err.message : String(err),
      stats,
    });
    return NextResponse.json(
      { ok: false, error: "Consolidation failed", stats },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Per-org metacognitive state update
// ---------------------------------------------------------------------------

async function updateMetacognitiveState(
  supabase: ServiceClient,
  orgId: string
): Promise<void> {
  // Fetch recent accuracy observations (last 14 days, up to 10 points)
  const { data: logs, error: logsErr } = await supabase
    .from("metacognitive_log")
    .select("value, period_end")
    .eq("organization_id", orgId)
    .eq("metric_type", "prediction_accuracy")
    .order("period_end", { ascending: false })
    .limit(10);

  if (logsErr) {
    throw new Error(
      `Failed to fetch accuracy logs for ${orgId}: ${logsErr.message}`
    );
  }

  // Bayesian-smoothed accuracy
  // Formula: (prior_mean * prior_strength + sum(observations)) / (prior_strength + n)
  const values = (logs ?? [])
    .map((r) => Number(r.value))
    .filter((v) => !isNaN(v) && v >= 0 && v <= 1);

  const n = values.length;
  const bayesianAccuracy =
    n === 0
      ? PRIOR_MEAN
      : (PRIOR_MEAN * PRIOR_STRENGTH + values.reduce((a, b) => a + b, 0)) /
        (PRIOR_STRENGTH + n);

  // Temperature: continuous linear mapping [0.0, 1.0] → [0.3, 0.9]
  const temperature = Math.max(
    0.3,
    Math.min(0.9, 0.3 + bayesianAccuracy * 0.6)
  );

  // Atomic upsert
  const { error: upsertErr } = await supabase.from("working_memory").upsert(
    {
      organization_id: orgId,
      memory_type: "metacognitive_state",
      content: {
        accuracy_bayesian: Math.round(bayesianAccuracy * 10000) / 10000,
        accuracy_samples: n,
        official_temperature:
          Math.round(temperature * 10000) / 10000,
        temperature_method: "bayesian_smoothed_linear",
        prior_strength: PRIOR_STRENGTH,
        calculated_at: new Date().toISOString(),
      },
      valid_until: new Date(
        Date.now() + 6 * 60 * 60 * 1000
      ).toISOString(),
    },
    {
      onConflict: "organization_id,memory_type",
    }
  );

  if (upsertErr) {
    throw new Error(
      `Failed to upsert metacognitive state for ${orgId}: ${upsertErr.message}`
    );
  }
}
