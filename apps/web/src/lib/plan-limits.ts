import { PLANS } from "@contentos/shared";
import type { Plan } from "@contentos/database";
import type { SupabaseClient } from "@supabase/supabase-js";

interface LimitResult {
  allowed: boolean;
  reason?: string;
  currentCount: number;
  limit: number;
}

/**
 * Check if the organization can connect more platforms.
 */
export async function checkPlatformLimit(
  supabase: SupabaseClient,
  orgId: string,
  plan: Plan
): Promise<LimitResult> {
  const planConfig = PLANS[plan];
  const limit = planConfig.platforms;

  const { count } = await supabase
    .from("social_accounts")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("is_active", true);

  const currentCount = count || 0;

  if (currentCount >= limit) {
    return {
      allowed: false,
      reason: `Planul ${planConfig.name} permite maxim ${limit} ${(limit as number) === 1 ? "platforma" : "platforme"}. Upgradeaza pentru mai multe.`,
      currentCount,
      limit,
    };
  }

  return { allowed: true, currentCount, limit };
}

/**
 * Check if the organization can publish more posts this month.
 * Returns allowed=true for unlimited plans (postsPerMonth === -1).
 */
export async function checkPostLimit(
  supabase: SupabaseClient,
  orgId: string,
  plan: Plan
): Promise<LimitResult> {
  const planConfig = PLANS[plan];
  const limit = planConfig.postsPerMonth;

  // -1 means unlimited
  if (limit === -1) {
    return { allowed: true, currentCount: 0, limit: -1 };
  }

  // Count posts published this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .gte("published_at", startOfMonth.toISOString());

  const currentCount = count || 0;

  if (currentCount >= limit) {
    return {
      allowed: false,
      reason: `Ai atins limita de ${limit} postari/luna pe planul ${planConfig.name}. Upgradeaza pentru postari nelimitate.`,
      currentCount,
      limit,
    };
  }

  return { allowed: true, currentCount, limit };
}
