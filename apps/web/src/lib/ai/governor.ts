import { createHash } from "crypto";

type JsonRecord = Record<string, unknown>;

const DEFAULT_DAILY_BUDGET_USD = 2;
const DEFAULT_MONTHLY_BUDGET_USD = 45;

const ANTHROPIC_PRICING_PER_1M: Record<string, { input: number; output: number }> = {
  "claude-3-5-haiku-latest": { input: 0.8, output: 4 },
  "claude-3-7-sonnet-latest": { input: 3, output: 15 },
  "claude-sonnet-4-5-20250929": { input: 3, output: 15 },
  "claude-sonnet-4-20250514": { input: 3, output: 15 },
};

const OPENROUTER_DEFAULT_PRICING_PER_1M = {
  input: 0.6,
  output: 2.4,
};

export interface BudgetCaps {
  dailyUsd: number;
  monthlyUsd: number;
}

export interface BudgetUsage {
  dailySpentUsd: number;
  monthlySpentUsd: number;
}

export interface BudgetDecision {
  allowed: boolean;
  reason?: string;
  caps: BudgetCaps;
  usage: BudgetUsage;
  projectedDailyUsd: number;
  projectedMonthlyUsd: number;
}

export interface IntentCacheHit {
  response: JsonRecord;
  createdAt: string;
  expiresAt: string;
}

export interface AIUsageEventInput {
  supabase: any;
  organizationId: string;
  userId?: string;
  routeKey: string;
  intentHash?: string;
  provider: string;
  model: string;
  mode: "ai" | "deterministic";
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number;
  latencyMs?: number;
  success?: boolean;
  cacheHit?: boolean;
  budgetFallback?: boolean;
  errorCode?: string;
  metadata?: JsonRecord;
}

export type AIObjective = "engagement" | "reach" | "leads" | "saves";

export interface PremiumRoiGateInput {
  baselineScore: number;
  projectedPremiumScore: number;
  economyCostUsd: number;
  premiumCostUsd: number;
  objective?: AIObjective;
  minRoiMultiple?: number;
  valuePerScorePointUsd?: number;
}

export interface PremiumRoiDecision {
  shouldEscalate: boolean;
  reason: string;
  expectedUpliftPoints: number;
  expectedIncrementalValueUsd: number;
  incrementalCostUsd: number;
  roiMultiple: number;
}

function asNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function asRecord(value: unknown): JsonRecord {
  if (typeof value !== "object" || value === null) return {};
  return value as JsonRecord;
}

function readObjectiveNumber(
  source: unknown,
  objective: AIObjective
): number | null {
  const direct = asNumber(source);
  if (direct && direct > 0) return direct;

  const record = asRecord(source);
  const objectiveValue = asNumber(record[objective]);
  if (objectiveValue && objectiveValue > 0) return objectiveValue;

  const fallbackValue = asNumber(record.default);
  if (fallbackValue && fallbackValue > 0) return fallbackValue;

  return null;
}

function getEnvNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return value;
}

function normalizeUsd(value: number): number {
  return Math.max(0, Number(value.toFixed(6)));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export interface ObjectiveValueConfig {
  minRoiMultiple: number;
  valuePerScorePointUsd: number;
  leadValueUsd: number | null;
  learnedLeadValueUsd: number | null;
  source: "defaults" | "organization_settings" | "outcome_learning";
}

function startOfUtcDayIso(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

function startOfUtcMonthIso(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function extractBudgetCapsFromSettings(settings: JsonRecord | null | undefined): Partial<BudgetCaps> {
  if (!settings || typeof settings !== "object") return {};
  const aiBudget = settings.aiBudget;
  if (typeof aiBudget !== "object" || aiBudget === null) return {};

  const daily = asNumber((aiBudget as JsonRecord).dailyUsd);
  const monthly = asNumber((aiBudget as JsonRecord).monthlyUsd);

  return {
    ...(daily && daily > 0 ? { dailyUsd: daily } : {}),
    ...(monthly && monthly > 0 ? { monthlyUsd: monthly } : {}),
  };
}

async function resolveBudgetCaps(params: {
  supabase: any;
  organizationId: string;
  organizationSettings?: JsonRecord | null;
}): Promise<BudgetCaps> {
  const defaults: BudgetCaps = {
    dailyUsd: getEnvNumber("AI_BUDGET_DAILY_USD", DEFAULT_DAILY_BUDGET_USD),
    monthlyUsd: getEnvNumber("AI_BUDGET_MONTHLY_USD", DEFAULT_MONTHLY_BUDGET_USD),
  };

  const fromSettings = extractBudgetCapsFromSettings(params.organizationSettings);
  if (fromSettings.dailyUsd || fromSettings.monthlyUsd) {
    return {
      dailyUsd: fromSettings.dailyUsd || defaults.dailyUsd,
      monthlyUsd: fromSettings.monthlyUsd || defaults.monthlyUsd,
    };
  }

  try {
    const { data: org } = await params.supabase
      .from("organizations")
      .select("settings")
      .eq("id", params.organizationId)
      .single();

    const settings = (org?.settings ?? null) as JsonRecord | null;
    const overrides = extractBudgetCapsFromSettings(settings);

    return {
      dailyUsd: overrides.dailyUsd || defaults.dailyUsd,
      monthlyUsd: overrides.monthlyUsd || defaults.monthlyUsd,
    };
  } catch {
    return defaults;
  }
}

async function loadBudgetUsage(params: {
  supabase: any;
  organizationId: string;
}): Promise<BudgetUsage> {
  const monthStart = startOfUtcMonthIso();
  const dayStart = startOfUtcDayIso();

  const { data, error } = await params.supabase
    .from("ai_usage_events")
    .select("estimated_cost_usd,created_at")
    .eq("organization_id", params.organizationId)
    .gte("created_at", monthStart);

  if (error || !Array.isArray(data)) {
    return { dailySpentUsd: 0, monthlySpentUsd: 0 };
  }

  let daily = 0;
  let monthly = 0;

  for (const row of data as Array<{ estimated_cost_usd?: unknown; created_at?: unknown }>) {
    const cost = Number(row.estimated_cost_usd ?? 0);
    if (!Number.isFinite(cost) || cost <= 0) continue;
    monthly += cost;

    if (typeof row.created_at === "string" && row.created_at >= dayStart) {
      daily += cost;
    }
  }

  return {
    dailySpentUsd: normalizeUsd(daily),
    monthlySpentUsd: normalizeUsd(monthly),
  };
}

export async function decidePaidAIAccess(params: {
  supabase: any;
  organizationId: string;
  estimatedAdditionalCostUsd: number;
  organizationSettings?: JsonRecord | null;
}): Promise<BudgetDecision> {
  const caps = await resolveBudgetCaps({
    supabase: params.supabase,
    organizationId: params.organizationId,
    organizationSettings: params.organizationSettings,
  });
  const usage = await loadBudgetUsage({
    supabase: params.supabase,
    organizationId: params.organizationId,
  });

  const addCost = Math.max(0, params.estimatedAdditionalCostUsd || 0);
  const projectedDailyUsd = normalizeUsd(usage.dailySpentUsd + addCost);
  const projectedMonthlyUsd = normalizeUsd(usage.monthlySpentUsd + addCost);

  if (projectedDailyUsd > caps.dailyUsd) {
    return {
      allowed: false,
      reason: `Daily AI budget exceeded (${projectedDailyUsd.toFixed(3)} / ${caps.dailyUsd.toFixed(3)} USD).`,
      caps,
      usage,
      projectedDailyUsd,
      projectedMonthlyUsd,
    };
  }

  if (projectedMonthlyUsd > caps.monthlyUsd) {
    return {
      allowed: false,
      reason: `Monthly AI budget exceeded (${projectedMonthlyUsd.toFixed(3)} / ${caps.monthlyUsd.toFixed(3)} USD).`,
      caps,
      usage,
      projectedDailyUsd,
      projectedMonthlyUsd,
    };
  }

  return {
    allowed: true,
    caps,
    usage,
    projectedDailyUsd,
    projectedMonthlyUsd,
  };
}

export function estimateTokensFromText(text: string): number {
  const length = text.trim().length;
  if (!length) return 0;
  return Math.max(1, Math.ceil(length / 4));
}

export function estimateAnthropicCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const lowerModel = model.toLowerCase();
  const openRouterLike =
    lowerModel.includes("openrouter") ||
    lowerModel.includes("deepseek") ||
    lowerModel.includes("llama") ||
    lowerModel.includes("mistral") ||
    lowerModel.includes("qwen") ||
    lowerModel.includes("google/") ||
    lowerModel.includes("gpt-4o-mini");

  const pricing = openRouterLike
    ? {
        input: getEnvNumber(
          "OPENROUTER_ESTIMATED_INPUT_USD_PER_1M",
          OPENROUTER_DEFAULT_PRICING_PER_1M.input
        ),
        output: getEnvNumber(
          "OPENROUTER_ESTIMATED_OUTPUT_USD_PER_1M",
          OPENROUTER_DEFAULT_PRICING_PER_1M.output
        ),
      }
    : ANTHROPIC_PRICING_PER_1M[model] ||
      (model.includes("haiku")
        ? ANTHROPIC_PRICING_PER_1M["claude-3-5-haiku-latest"]
        : ANTHROPIC_PRICING_PER_1M["claude-sonnet-4-5-20250929"]);

  const inCost = (Math.max(0, inputTokens) / 1_000_000) * pricing.input;
  const outCost = (Math.max(0, outputTokens) / 1_000_000) * pricing.output;
  return normalizeUsd(inCost + outCost);
}

async function estimateLearnedLeadValueUsd(params: {
  supabase: any;
  organizationId: string;
}): Promise<number | null> {
  try {
    const sinceIso = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await params.supabase
      .from("outcome_events")
      .select("metadata")
      .eq("organization_id", params.organizationId)
      .eq("objective", "leads")
      .gte("recorded_at", sinceIso)
      .order("recorded_at", { ascending: false })
      .limit(400);

    if (error || !Array.isArray(data) || data.length === 0) return null;

    const samples: number[] = [];
    for (const row of data as Array<{ metadata?: unknown }>) {
      const metadata = asRecord(row.metadata);
      const direct =
        asNumber(metadata.leadValueUsd) ||
        asNumber(metadata.lead_value_usd) ||
        asNumber(metadata.valuePerLeadUsd);
      if (direct && direct > 0) {
        samples.push(direct);
        continue;
      }

      const revenue =
        asNumber(metadata.revenueUsd) ||
        asNumber(metadata.revenue_usd) ||
        asNumber(metadata.leadRevenueUsd);
      const leads =
        asNumber(metadata.leadsCount) ||
        asNumber(metadata.leads_count) ||
        asNumber(metadata.conversions);
      if (revenue && leads && leads > 0) {
        samples.push(revenue / leads);
      }
    }

    if (!samples.length) return null;
    const avg = samples.reduce((sum, value) => sum + value, 0) / samples.length;
    return normalizeUsd(avg);
  } catch {
    return null;
  }
}

export async function resolveObjectiveValueConfig(params: {
  supabase: any;
  organizationId: string;
  objective: AIObjective;
  organizationSettings?: JsonRecord | null;
  fallbackMinRoiMultiple: number;
  fallbackValuePerScorePointUsd: number;
}): Promise<ObjectiveValueConfig> {
  const fallbackLeadValueUsd = getEnvNumber("AI_DEFAULT_LEAD_VALUE_USD", 45);
  const fallbackLeadScoreFactor = getEnvNumber("AI_LEAD_VALUE_TO_SCORE_FACTOR", 0.002);

  const settings = asRecord(params.organizationSettings);
  const economics = asRecord(settings.aiEconomics);
  const minRoiSettings = readObjectiveNumber(economics.minRoiMultiple, params.objective);
  const valuePerPointSettings = readObjectiveNumber(
    economics.valuePerScorePointUsd,
    params.objective
  );
  const configuredLeadValue = asNumber(economics.leadValueUsd);

  let minRoiMultiple = minRoiSettings || params.fallbackMinRoiMultiple;
  let valuePerScorePointUsd = valuePerPointSettings || params.fallbackValuePerScorePointUsd;
  let leadValueUsd: number | null = configuredLeadValue && configuredLeadValue > 0
    ? configuredLeadValue
    : null;
  let learnedLeadValueUsd: number | null = null;
  let source: ObjectiveValueConfig["source"] =
    minRoiSettings || valuePerPointSettings || leadValueUsd ? "organization_settings" : "defaults";

  if (params.objective === "leads") {
    learnedLeadValueUsd = await estimateLearnedLeadValueUsd({
      supabase: params.supabase,
      organizationId: params.organizationId,
    });
    const effectiveLeadValue =
      learnedLeadValueUsd ||
      leadValueUsd ||
      fallbackLeadValueUsd;
    leadValueUsd = effectiveLeadValue;

    const leadDerivedValuePerPoint = effectiveLeadValue * fallbackLeadScoreFactor;
    valuePerScorePointUsd = Math.max(
      valuePerScorePointUsd,
      Number(leadDerivedValuePerPoint.toFixed(6))
    );
    if (learnedLeadValueUsd) {
      source = "outcome_learning";
    }
  }

  minRoiMultiple = Math.max(1, Number(minRoiMultiple.toFixed(4)));
  valuePerScorePointUsd = Math.max(0.000001, Number(valuePerScorePointUsd.toFixed(6)));

  return {
    minRoiMultiple,
    valuePerScorePointUsd,
    leadValueUsd,
    learnedLeadValueUsd,
    source,
  };
}

export function evaluatePremiumRoiGate(input: PremiumRoiGateInput): PremiumRoiDecision {
  const objectiveValueMultiplierDefaults: Record<AIObjective, number> = {
    engagement: 1,
    reach: 0.9,
    saves: 1.3,
    leads: 3.2,
  };
  const minimumRoiDefaults: Record<AIObjective, number> = {
    engagement: 3,
    reach: 3.2,
    saves: 2.8,
    leads: 1.8,
  };

  const objective = input.objective || "engagement";
  const minimumRoiMultiple = Math.max(
    1,
    input.minRoiMultiple ||
      getEnvNumber(
        `AI_PREMIUM_MIN_ROI_MULTIPLE_${objective.toUpperCase()}`,
        minimumRoiDefaults[objective]
      )
  );
  const objectiveValueMultiplier = getEnvNumber(
    `AI_OBJECTIVE_VALUE_MULTIPLIER_${objective.toUpperCase()}`,
    objectiveValueMultiplierDefaults[objective]
  );
  const baseValuePerPoint = Math.max(
    0,
    input.valuePerScorePointUsd || getEnvNumber("AI_DEFAULT_VALUE_PER_SCORE_POINT_USD", 0.03)
  );
  const valuePerPoint = baseValuePerPoint * objectiveValueMultiplier;

  const baselineScore = clamp(input.baselineScore, 0, 100);
  const projectedPremiumScore = clamp(input.projectedPremiumScore, 0, 100);
  const expectedUpliftPoints = Math.max(0, projectedPremiumScore - baselineScore);

  if (expectedUpliftPoints <= 0) {
    return {
      shouldEscalate: false,
      reason: "no_uplift_predicted",
      expectedUpliftPoints: 0,
      expectedIncrementalValueUsd: 0,
      incrementalCostUsd: normalizeUsd(Math.max(0, input.premiumCostUsd - input.economyCostUsd)),
      roiMultiple: 0,
    };
  }

  const incrementalCostUsd = normalizeUsd(Math.max(0, input.premiumCostUsd - input.economyCostUsd));
  const expectedIncrementalValueUsd = normalizeUsd(expectedUpliftPoints * valuePerPoint);

  if (incrementalCostUsd <= 0) {
    return {
      shouldEscalate: true,
      reason: "premium_not_more_expensive",
      expectedUpliftPoints: normalizeUsd(expectedUpliftPoints),
      expectedIncrementalValueUsd,
      incrementalCostUsd: 0,
      roiMultiple: 9999,
    };
  }

  const roiMultiple = normalizeUsd(expectedIncrementalValueUsd / incrementalCostUsd);
  const shouldEscalate = roiMultiple >= minimumRoiMultiple;

  return {
    shouldEscalate,
    reason: shouldEscalate ? "roi_pass" : "roi_below_threshold",
    expectedUpliftPoints: normalizeUsd(expectedUpliftPoints),
    expectedIncrementalValueUsd,
    incrementalCostUsd,
    roiMultiple,
  };
}

export function buildIntentCacheKey(routeKey: string, payload: unknown): string {
  const serialized = JSON.stringify({ routeKey, payload });
  return createHash("sha256").update(serialized).digest("hex");
}

export async function getIntentCache(params: {
  supabase: any;
  organizationId: string;
  routeKey: string;
  intentHash: string;
}): Promise<IntentCacheHit | null> {
  try {
    const { data, error } = await params.supabase
      .from("ai_request_cache")
      .select("response_json,created_at,expires_at")
      .eq("organization_id", params.organizationId)
      .eq("route_key", params.routeKey)
      .eq("intent_hash", params.intentHash)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data || typeof data.response_json !== "object" || data.response_json === null) {
      return null;
    }

    return {
      response: data.response_json as JsonRecord,
      createdAt: String(data.created_at),
      expiresAt: String(data.expires_at),
    };
  } catch {
    return null;
  }
}

export async function setIntentCache(params: {
  supabase: any;
  organizationId: string;
  userId?: string;
  routeKey: string;
  intentHash: string;
  provider: string;
  model: string;
  response: JsonRecord;
  estimatedCostUsd?: number;
  ttlMs: number;
}): Promise<void> {
  try {
    await params.supabase.from("ai_request_cache").upsert(
      {
        organization_id: params.organizationId,
        created_by: params.userId || null,
        route_key: params.routeKey,
        intent_hash: params.intentHash,
        provider: params.provider,
        model: params.model,
        response_json: params.response,
        estimated_cost_usd: normalizeUsd(params.estimatedCostUsd || 0),
        expires_at: new Date(Date.now() + Math.max(60_000, params.ttlMs)).toISOString(),
      },
      { onConflict: "organization_id,route_key,intent_hash" }
    );
  } catch {
    // best effort cache write
  }
}

export async function logAIUsageEvent(input: AIUsageEventInput): Promise<void> {
  try {
    await input.supabase.from("ai_usage_events").insert({
      organization_id: input.organizationId,
      user_id: input.userId || null,
      route_key: input.routeKey,
      intent_hash: input.intentHash || null,
      provider: input.provider,
      model: input.model,
      mode: input.mode,
      input_tokens: Math.max(0, Math.floor(input.inputTokens || 0)),
      output_tokens: Math.max(0, Math.floor(input.outputTokens || 0)),
      estimated_cost_usd: normalizeUsd(input.estimatedCostUsd || 0),
      latency_ms: Math.max(0, Math.floor(input.latencyMs || 0)),
      success: input.success ?? true,
      cache_hit: input.cacheHit ?? false,
      budget_fallback: input.budgetFallback ?? false,
      error_code: input.errorCode || null,
      metadata: input.metadata || {},
    });
  } catch {
    // best effort telemetry write
  }
}

export function withCacheMeta(
  payload: JsonRecord,
  params: { createdAt?: string; mode?: "ai" | "deterministic"; provider?: string; model?: string }
): JsonRecord {
  const currentMeta =
    typeof payload.meta === "object" && payload.meta !== null
      ? (payload.meta as JsonRecord)
      : {};

  const cacheAgeMs = params.createdAt
    ? Math.max(0, Date.now() - Date.parse(params.createdAt))
    : undefined;

  return {
    ...payload,
    meta: {
      ...currentMeta,
      mode: params.mode || currentMeta.mode || "deterministic",
      provider: params.provider || currentMeta.provider || "template",
      model: params.model || currentMeta.model || "template",
      cached: true,
      ...(typeof cacheAgeMs === "number" ? { cacheAgeMs } : {}),
    },
  };
}
