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
  baseMinRoiMultiple?: number;
  baseValuePerScorePointUsd?: number;
  leadValueUsd: number | null;
  learnedLeadValueUsd: number | null;
  learnedMinRoiMultiple?: number | null;
  learnedValuePerScorePointUsd?: number | null;
  learningSampleSize?: number | null;
  learningCorrelation?: number | null;
  learningDraftSource?: string | null;
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

type EconomicsLearningTuning = {
  valueMultiplier: number;
  roiMultiplier: number | null;
  sampleSize: number;
  correlation: number | null;
  draftSource: string | null;
};

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function correlation(xs: number[], ys: number[]): number | null {
  if (xs.length !== ys.length || xs.length < 3) return null;
  const n = xs.length;
  const meanX = xs.reduce((sum, value) => sum + value, 0) / n;
  const meanY = ys.reduce((sum, value) => sum + value, 0) / n;

  let cov = 0;
  let varX = 0;
  let varY = 0;

  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    cov += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }

  if (varX <= 0 || varY <= 0) return null;
  return cov / Math.sqrt(varX * varY);
}

function normalizeOutcomeMetric(params: {
  objective: AIObjective;
  outcome: Record<string, unknown>;
}): number | null {
  const objective = params.objective;
  const row = params.outcome;

  if (objective === "engagement") {
    const rate = asNumber(row.engagement_rate);
    return rate !== null ? rate : null;
  }

  if (objective === "reach") {
    const reach = asNumber(row.reach_count);
    return reach !== null ? Math.log1p(Math.max(0, reach)) : null;
  }

  if (objective === "saves") {
    const saves = asNumber(row.saves_count);
    return saves !== null ? Math.log1p(Math.max(0, saves)) : null;
  }

  if (objective === "leads") {
    const metadata = asRecord(row.metadata);
    const leads =
      asNumber(metadata.leadsCount) ||
      asNumber(metadata.leads_count) ||
      asNumber(metadata.conversions);
    return leads !== null ? Math.log1p(Math.max(0, leads)) : null;
  }

  return null;
}

async function estimateLearnedEconomicsTuning(params: {
  supabase: any;
  organizationId: string;
  objective: AIObjective;
  draftSource?: string | null;
}): Promise<EconomicsLearningTuning | null> {
  try {
    const ttlMs = Math.max(
      60_000,
      Math.floor(getEnvNumber("AI_ECONOMICS_LEARNING_TTL_MS", 6 * 60 * 60 * 1000))
    );
    const lookbackDays = Math.max(
      30,
      Math.floor(getEnvNumber("AI_ECONOMICS_LEARNING_LOOKBACK_DAYS", 120))
    );
    const minSamples = Math.max(
      12,
      Math.floor(getEnvNumber("AI_ECONOMICS_LEARNING_MIN_SAMPLES", 25))
    );

    const routeKey = "economics-learning:v1";
    const intentHash = buildIntentCacheKey(routeKey, {
      objective: params.objective,
      draftSource: params.draftSource || null,
      lookbackDays,
    });

    const cached = await getIntentCache({
      supabase: params.supabase,
      organizationId: params.organizationId,
      routeKey,
      intentHash,
    });

    if (cached && cached.response && typeof cached.response === "object") {
      const cachedRow = cached.response as Record<string, unknown>;
      const valueMultiplier = asNumber(cachedRow.valueMultiplier);
      const roiMultiplier = asNumber(cachedRow.roiMultiplier);
      const sampleSize = asNumber(cachedRow.sampleSize);
      const correlationValue = asNumber(cachedRow.correlation);
      const draftSource =
        typeof cachedRow.draftSource === "string" ? cachedRow.draftSource : null;
      if (valueMultiplier && sampleSize) {
        return {
          valueMultiplier,
          roiMultiplier: roiMultiplier ?? null,
          sampleSize,
          correlation: correlationValue,
          draftSource,
        };
      }
    }

    const sinceIso = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

    const { data: decisionRows } = await params.supabase
      .from("decision_logs")
      .select("post_id,expected_score,decision_context,created_at")
      .eq("organization_id", params.organizationId)
      .eq("objective", params.objective)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(320);

    if (!Array.isArray(decisionRows) || decisionRows.length === 0) return null;

    const draftSource = params.draftSource || null;
    const decisions: Array<{
      postId: string;
      expectedScore: number;
      escalated: boolean | null;
    }> = [];

    for (const row of decisionRows as Array<Record<string, unknown>>) {
      const postId = typeof row.post_id === "string" ? row.post_id : null;
      if (!postId) continue;

      const expectedScore = asNumber(row.expected_score);
      if (expectedScore === null) continue;

      const ctx = asRecord(row.decision_context);
      if (draftSource) {
        const seenSource = typeof ctx.draftSource === "string" ? ctx.draftSource : null;
        if (seenSource !== draftSource) continue;
      }

      const escalated =
        typeof ctx.escalated === "boolean" ? (ctx.escalated as boolean) : null;

      decisions.push({ postId, expectedScore, escalated });
    }

    if (decisions.length < minSamples) return null;

    const postIds = [...new Set(decisions.map((row) => row.postId))];

    const { data: outcomeRows } = await params.supabase
      .from("outcome_events")
      .select(
        "post_id,recorded_at,engagement_rate,reach_count,saves_count,metadata"
      )
      .eq("organization_id", params.organizationId)
      .eq("objective", params.objective)
      .in("post_id", postIds)
      .order("recorded_at", { ascending: false })
      .limit(1200);

    if (!Array.isArray(outcomeRows) || outcomeRows.length === 0) return null;

    const latestOutcomeByPostId = new Map<string, Record<string, unknown>>();
    for (const row of outcomeRows as Array<Record<string, unknown>>) {
      const postId = typeof row.post_id === "string" ? row.post_id : null;
      if (!postId || latestOutcomeByPostId.has(postId)) continue;
      latestOutcomeByPostId.set(postId, row);
    }

    const xs: number[] = [];
    const ys: number[] = [];
    const escalatedYs: number[] = [];
    const baseYs: number[] = [];

    for (const decision of decisions) {
      const outcome = latestOutcomeByPostId.get(decision.postId);
      if (!outcome) continue;
      const y = normalizeOutcomeMetric({ objective: params.objective, outcome });
      if (y === null) continue;

      xs.push(decision.expectedScore);
      ys.push(y);
      if (decision.escalated === true) escalatedYs.push(y);
      if (decision.escalated === false) baseYs.push(y);
    }

    if (ys.length < minSamples) return null;

    const r = correlation(xs, ys);
    const valueMultiplier = clamp(0.75 + Math.max(0, r || 0) * 0.5, 0.55, 1.1);

    let roiMultiplier: number | null = null;
    if (escalatedYs.length >= 6 && baseYs.length >= 6) {
      const threshold = median(ys);
      const premiumRate =
        escalatedYs.filter((value) => value >= threshold).length / escalatedYs.length;
      const baseRate = baseYs.filter((value) => value >= threshold).length / baseYs.length;
      const delta = premiumRate - baseRate;
      roiMultiplier = clamp(1 - delta * 0.9, 0.85, 1.25);
    }

    const result: EconomicsLearningTuning = {
      valueMultiplier: Number(valueMultiplier.toFixed(4)),
      roiMultiplier: roiMultiplier !== null ? Number(roiMultiplier.toFixed(4)) : null,
      sampleSize: ys.length,
      correlation: r !== null ? Number(r.toFixed(4)) : null,
      draftSource,
    };

    await setIntentCache({
      supabase: params.supabase,
      organizationId: params.organizationId,
      routeKey,
      intentHash,
      provider: "learning",
      model: "outcome",
      response: result as unknown as JsonRecord,
      estimatedCostUsd: 0,
      ttlMs,
    });

    return result;
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
  learningScope?: { draftSource?: string };
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

  const baseMinRoiMultiple = minRoiMultiple;
  const baseValuePerScorePointUsd = valuePerScorePointUsd;

  let learnedMinRoiMultiple: number | null = null;
  let learnedValuePerScorePointUsd: number | null = null;
  let learningSampleSize: number | null = null;
  let learningCorrelation: number | null = null;
  const learningDraftSource = params.learningScope?.draftSource || null;

  const tuning = await estimateLearnedEconomicsTuning({
    supabase: params.supabase,
    organizationId: params.organizationId,
    objective: params.objective,
    draftSource: learningDraftSource,
  });

  if (tuning) {
    learningSampleSize = tuning.sampleSize;
    learningCorrelation = tuning.correlation;

    if (tuning.roiMultiplier !== null) {
      learnedMinRoiMultiple = clamp(minRoiMultiple * tuning.roiMultiplier, 1, 6);
      minRoiMultiple = learnedMinRoiMultiple;
    }

    if (params.objective !== "leads") {
      learnedValuePerScorePointUsd = Math.max(
        0.000001,
        valuePerScorePointUsd * tuning.valueMultiplier
      );
      valuePerScorePointUsd = learnedValuePerScorePointUsd;
    }

    source = "outcome_learning";
  }

  minRoiMultiple = Math.max(1, Number(minRoiMultiple.toFixed(4)));
  valuePerScorePointUsd = Math.max(0.000001, Number(valuePerScorePointUsd.toFixed(6)));

  return {
    minRoiMultiple,
    valuePerScorePointUsd,
    baseMinRoiMultiple: Number(baseMinRoiMultiple.toFixed(4)),
    baseValuePerScorePointUsd: Number(baseValuePerScorePointUsd.toFixed(6)),
    leadValueUsd,
    learnedLeadValueUsd,
    learnedMinRoiMultiple:
      typeof learnedMinRoiMultiple === "number"
        ? Number(learnedMinRoiMultiple.toFixed(4))
        : null,
    learnedValuePerScorePointUsd:
      typeof learnedValuePerScorePointUsd === "number"
        ? Number(learnedValuePerScorePointUsd.toFixed(6))
        : null,
    learningSampleSize,
    learningCorrelation,
    learningDraftSource,
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
