import { createHash } from "crypto";

export type AIObjective = "engagement" | "reach" | "leads" | "saves";

type JsonRecord = Record<string, unknown>;

export interface LearningPost {
  id: string;
  organization_id: string;
  social_account_id?: string | null;
  platform: "facebook" | "instagram" | "tiktok" | "youtube" | "twitter";
  text_content?: string | null;
  hook_type?: string | null;
  cta_type?: string | null;
  likes_count?: number | null;
  comments_count?: number | null;
  shares_count?: number | null;
  saves_count?: number | null;
  views_count?: number | null;
  reach_count?: number | null;
  impressions_count?: number | null;
  engagement_rate?: number | null;
  published_at?: string | null;
}

export interface DecisionDraftData {
  id?: string;
  source?: string | null;
  algorithm_scores?: Record<string, unknown> | null;
  platform_versions?: Record<string, unknown> | null;
  ai_suggestions?: Record<string, unknown> | null;
}

interface CreativeSignals {
  hookType: string;
  framework: string;
  ctaType: string;
  memoryKey: string;
}

export interface VariantBanditScore {
  index: number;
  memoryKey: string;
  score: number;
  successRate: number;
  sampleSize: number;
  avgEngagement: number;
}

export interface VariantBanditSelection {
  selectedIndex: number;
  reason: string;
  scores: VariantBanditScore[];
}

function toNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return value;
}

function asRecord(value: unknown): JsonRecord {
  if (typeof value !== "object" || value === null) return {};
  return value as JsonRecord;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeForDetection(value: string): string {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function detectHookType(text: string): string {
  const first = normalizeForDetection(text).slice(0, 180);
  if (!first) return "unknown";
  if (first.includes("?")) return "question";
  if (/\b(stop|atentie|important)\b/.test(first)) return "interrupt";
  if (/\b(3|5|7|10|top|lista)\b/.test(first)) return "list";
  if (/\b(azi|am|poveste|experienta)\b/.test(first)) return "story";
  if (/\b(ce|cum|de ce|why|how)\b/.test(first)) return "educational";
  return "statement";
}

function detectFramework(text: string): string {
  const value = normalizeForDetection(text);
  if (!value) return "unknown";
  if (/\b(problema|durere|frustr|stres|blocaj)\b/.test(value)) return "pas";
  if (/\b(inainte|dupa|transform|rezultat)\b/.test(value)) return "bab";
  if (/\b(3|5|7|10|top|lista|pasi)\b/.test(value)) return "listicle";
  if (/\b(poveste|experienta|azi|am invatat)\b/.test(value)) return "story";
  if (/\b(atentie|interes|dorinta|actiune)\b/.test(value)) return "aida";
  return "generic";
}

function detectCtaType(text: string): string {
  const value = normalizeForDetection(text);
  if (!value) return "none";
  if (/\b(comenteaza|spune|zice|lasa un comentariu)\b/.test(value)) return "comment";
  if (/\b(salveaza|save)\b/.test(value)) return "save";
  if (/\b(distribuie|share|trimite)\b/.test(value)) return "share";
  if (/\b(follow|urmareste|abon)\b/.test(value)) return "follow";
  if (/\b(click|intra|link|contacteaza|suna|rezerva)\b/.test(value)) return "click";
  return "none";
}

export function deriveCreativeSignals(input: {
  text?: string | null;
  hookType?: string | null;
  ctaType?: string | null;
}): CreativeSignals {
  const text = input.text || "";
  const hookType = (input.hookType && input.hookType.trim()) || detectHookType(text);
  const framework = detectFramework(text);
  const ctaType = (input.ctaType && input.ctaType.trim()) || detectCtaType(text);
  const memoryKey = `${hookType}|${framework}|${ctaType}`;

  return {
    hookType,
    framework,
    ctaType,
    memoryKey,
  };
}

export async function selectBestVariantWithBandit(params: {
  supabase: any;
  organizationId: string;
  platform: LearningPost["platform"];
  objective?: AIObjective;
  variants: string[];
}): Promise<VariantBanditSelection> {
  const cleanedVariants = params.variants
    .map((item) => normalizeText(item || ""))
    .filter(Boolean);

  if (cleanedVariants.length <= 1) {
    return {
      selectedIndex: 0,
      reason: "single_variant",
      scores: [
        {
          index: 0,
          memoryKey: deriveCreativeSignals({ text: cleanedVariants[0] || "" }).memoryKey,
          score: 1,
          successRate: 0.5,
          sampleSize: 0,
          avgEngagement: 0,
        },
      ],
    };
  }

  const objective = params.objective || "engagement";
  const exploration = Number(process.env.CREATIVE_BANDIT_EXPLORATION || 0.45);
  const successThreshold = Number(
    process.env.CREATIVE_MEMORY_SUCCESS_ENGAGEMENT_THRESHOLD || 2
  );
  const signalsByIndex = cleanedVariants.map((text) => deriveCreativeSignals({ text }));
  const memoryKeys = [...new Set(signalsByIndex.map((item) => item.memoryKey))];

  const memoryStats = new Map<
    string,
    { sampleSize: number; successCount: number; avgEngagement: number }
  >();
  try {
    const { data: memoryRows } = await params.supabase
      .from("creative_memory")
      .select("memory_key,sample_size,success_count,avg_engagement")
      .eq("organization_id", params.organizationId)
      .eq("platform", params.platform)
      .eq("objective", objective)
      .in("memory_key", memoryKeys);

    for (const row of (memoryRows || []) as Array<Record<string, unknown>>) {
      const key = asString(row.memory_key);
      if (!key) continue;
      memoryStats.set(key, {
        sampleSize: toNumber(row.sample_size),
        successCount: toNumber(row.success_count),
        avgEngagement: toNumber(row.avg_engagement),
      });
    }
  } catch {
    // best-effort
  }

  const variantHistory = new Map<number, { samples: number; success: number; engagement: number }>();
  for (let i = 0; i < cleanedVariants.length; i++) {
    variantHistory.set(i, { samples: 0, success: 0, engagement: 0 });
  }

  try {
    const { data: decisionRows } = await params.supabase
      .from("decision_logs")
      .select("post_id,selected_variant,created_at")
      .eq("organization_id", params.organizationId)
      .eq("platform", params.platform)
      .eq("objective", objective)
      .not("selected_variant", "is", null)
      .order("created_at", { ascending: false })
      .limit(200);

    const typedDecisions = (decisionRows || []) as Array<Record<string, unknown>>;
    const postIds = typedDecisions
      .map((row) => asString(row.post_id))
      .filter((id): id is string => Boolean(id));

    if (postIds.length > 0) {
      const { data: outcomeRows } = await params.supabase
        .from("outcome_events")
        .select(
          "post_id,engagement_rate,likes_count,comments_count,shares_count,saves_count,views_count,reach_count,impressions_count,recorded_at"
        )
        .eq("organization_id", params.organizationId)
        .in("post_id", postIds)
        .order("recorded_at", { ascending: false });

      const latestOutcomeByPost = new Map<string, Record<string, unknown>>();
      for (const row of (outcomeRows || []) as Array<Record<string, unknown>>) {
        const postId = asString(row.post_id);
        if (!postId || latestOutcomeByPost.has(postId)) continue;
        latestOutcomeByPost.set(postId, row);
      }

      for (const row of typedDecisions) {
        const variantIndex = parseSelectedVariantIndex(row.selected_variant);
        const postId = asString(row.post_id);
        if (variantIndex === null || !postId) continue;
        if (!variantHistory.has(variantIndex)) continue;

        const outcome = latestOutcomeByPost.get(postId);
        if (!outcome) continue;

        const engagement = deriveEngagementRateFromOutcome(outcome);
        const state = variantHistory.get(variantIndex);
        if (!state) continue;

        state.samples += 1;
        state.engagement += engagement;
        if (engagement >= successThreshold) state.success += 1;
      }
    }
  } catch {
    // best-effort
  }

  const totalSamples =
    [...memoryStats.values()].reduce((sum, item) => sum + toNumber(item.sampleSize), 0) +
    [...variantHistory.values()].reduce((sum, item) => sum + toNumber(item.samples), 0);

  const scored: VariantBanditScore[] = signalsByIndex.map((signals, index) => {
    const memory = memoryStats.get(signals.memoryKey) || {
      sampleSize: 0,
      successCount: 0,
      avgEngagement: 0,
    };
    const history = variantHistory.get(index) || {
      samples: 0,
      success: 0,
      engagement: 0,
    };

    const sampleSize = memory.sampleSize + history.samples;
    const successCount = memory.successCount + history.success;
    const avgEngagement =
      sampleSize > 0
        ? (memory.avgEngagement * memory.sampleSize + history.engagement) / sampleSize
        : 0;
    const successRate = (successCount + 1) / (sampleSize + 2);
    const normalizedEngagement = Math.max(0, Math.min(1, avgEngagement / 10));
    const ucb =
      successRate +
      exploration * Math.sqrt(Math.log(Math.max(2, totalSamples + 2)) / (sampleSize + 1));

    let objectiveBonus = 0;
    if (objective === "leads" && signals.ctaType === "click") objectiveBonus += 0.08;
    if (objective === "saves" && signals.ctaType === "save") objectiveBonus += 0.08;
    if (
      objective === "reach" &&
      (signals.hookType === "interrupt" || signals.hookType === "list")
    ) {
      objectiveBonus += 0.04;
    }
    if (
      objective === "engagement" &&
      (signals.ctaType === "comment" || signals.hookType === "question")
    ) {
      objectiveBonus += 0.05;
    }

    const score = Number((ucb + normalizedEngagement * 0.25 + objectiveBonus).toFixed(6));

    return {
      index,
      memoryKey: signals.memoryKey,
      score,
      successRate: Number(successRate.toFixed(6)),
      sampleSize,
      avgEngagement: Number(avgEngagement.toFixed(4)),
    };
  });

  scored.sort((a, b) => b.score - a.score || a.sampleSize - b.sampleSize || a.index - b.index);
  const winner = scored[0] || {
    index: 0,
    memoryKey: signalsByIndex[0]?.memoryKey || "unknown|unknown|none",
    score: 1,
    successRate: 0.5,
    sampleSize: 0,
    avgEngagement: 0,
  };

  return {
    selectedIndex: winner.index,
    reason: `bandit_ucb_objective_${objective}`,
    scores: scored,
  };
}

function metricsHash(post: LearningPost): string {
  const payload = {
    likes: toNumber(post.likes_count),
    comments: toNumber(post.comments_count),
    shares: toNumber(post.shares_count),
    saves: toNumber(post.saves_count),
    views: toNumber(post.views_count),
    reach: toNumber(post.reach_count),
    impressions: toNumber(post.impressions_count),
    engagement: toNumber(post.engagement_rate),
  };

  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function parseSelectedVariantIndex(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^v?(\d{1,2})$/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function deriveEngagementRateFromOutcome(row: Record<string, unknown>): number {
  const direct = toNumber(row.engagement_rate);
  if (direct > 0) return direct;

  const likes = toNumber(row.likes_count);
  const comments = toNumber(row.comments_count);
  const shares = toNumber(row.shares_count);
  const saves = toNumber(row.saves_count);
  const reach = toNumber(row.reach_count);
  const impressions = toNumber(row.impressions_count);
  const views = toNumber(row.views_count);
  const denominator = Math.max(reach, impressions, views, 1);
  const interactions = likes + comments * 2 + shares * 3 + saves * 2;
  return Number(((interactions / denominator) * 100).toFixed(4));
}

function resolveDraftScore(
  draft: DecisionDraftData | null | undefined,
  platform: LearningPost["platform"]
): number | null {
  const root = asRecord(draft?.algorithm_scores);
  const row = asRecord(root[platform]);
  if (typeof row.overallScore === "number") return row.overallScore;

  const nested = asRecord(row.algorithmScore);
  if (typeof nested.overallScore === "number") return nested.overallScore;
  return null;
}

function resolveDraftMeta(draft: DecisionDraftData | null | undefined): {
  provider: string;
  model: string;
  mode: "ai" | "deterministic";
  objective: AIObjective;
  roiMultiple: number | null;
  estimatedCostUsd: number;
  projectedUplift: number | null;
  escalated: boolean | null;
  escalationCandidate: boolean | null;
  qualityMode: string | null;
  modelChain: string | null;
  roiGateReason: string | null;
} {
  const aiSuggestions = asRecord(draft?.ai_suggestions);
  const meta = asRecord(aiSuggestions.meta);
  const roiGate = asRecord(meta.roiGate);

  const modeRaw = asString(meta.mode);
  const mode: "ai" | "deterministic" = modeRaw === "ai" ? "ai" : "deterministic";

  const objectiveRaw = asString(meta.objective);
  const objective: AIObjective =
    objectiveRaw === "reach" || objectiveRaw === "leads" || objectiveRaw === "saves"
      ? objectiveRaw
      : "engagement";

  return {
    provider: asString(meta.provider) || "template",
    model: asString(meta.model) || "template",
    mode,
    objective,
    roiMultiple:
      typeof roiGate.roiMultiple === "number" ? (roiGate.roiMultiple as number) : null,
    estimatedCostUsd: toNumber(roiGate.incrementalCostUsd) || 0,
    projectedUplift:
      typeof roiGate.expectedUpliftPoints === "number"
        ? (roiGate.expectedUpliftPoints as number)
        : null,
    escalated: typeof meta.escalated === "boolean" ? (meta.escalated as boolean) : null,
    escalationCandidate:
      typeof meta.escalationCandidate === "boolean"
        ? (meta.escalationCandidate as boolean)
        : null,
    qualityMode: asString(meta.qualityMode) || null,
    modelChain: asString(meta.modelChain) || null,
    roiGateReason: asString(roiGate.reason) || null,
  };
}

function resolveDraftVariantForPlatform(
  draft: DecisionDraftData | null | undefined,
  platform: LearningPost["platform"]
): { selectedVariant: string | null; candidateCount: number | null } {
  const platformVersions = asRecord(draft?.platform_versions);
  const row = asRecord(platformVersions[platform]);
  const selectedIndex = parseSelectedVariantIndex(row.selectedVariant);
  const alternatives = Array.isArray(row.alternativeVersions)
    ? row.alternativeVersions.filter((item) => typeof item === "string")
    : [];
  const hasPrimary = typeof row.text === "string" && row.text.trim().length > 0;
  const candidateCount = Math.max(
    hasPrimary ? 1 : 0,
    (hasPrimary ? 1 : 0) + alternatives.length
  );

  if (selectedIndex === null) {
    return {
      selectedVariant: null,
      candidateCount: candidateCount || null,
    };
  }

  return {
    selectedVariant: `v${selectedIndex}`,
    candidateCount: candidateCount || null,
  };
}

export async function logDecisionForPublishedPost(params: {
  supabase: any;
  organizationId: string;
  userId?: string | null;
  routeKey: string;
  platform: LearningPost["platform"];
  postId: string;
  draft?: DecisionDraftData | null;
  objective?: AIObjective;
  decisionContext?: JsonRecord;
}): Promise<void> {
  try {
    const resolved = resolveDraftMeta(params.draft);
    const expectedScore = resolveDraftScore(params.draft, params.platform);
    const objective = params.objective || resolved.objective;
    const variant = resolveDraftVariantForPlatform(params.draft, params.platform);

    await params.supabase.from("decision_logs").insert({
      organization_id: params.organizationId,
      user_id: params.userId || null,
      draft_id: params.draft?.id || null,
      post_id: params.postId,
      route_key: params.routeKey,
      decision_type: "generation",
      objective,
      provider: resolved.provider,
      model: resolved.model,
      mode: resolved.mode,
      platform: params.platform,
      selected_variant: variant.selectedVariant,
      expected_score: expectedScore,
      projected_uplift: resolved.projectedUplift,
      estimated_cost_usd: resolved.estimatedCostUsd,
      roi_multiple: resolved.roiMultiple,
      decision_context: {
        draftSource: params.draft?.source || null,
        escalated: resolved.escalated,
        escalationCandidate: resolved.escalationCandidate,
        qualityMode: resolved.qualityMode,
        modelChain: resolved.modelChain,
        roiGateReason: resolved.roiGateReason,
        selectedVariant: variant.selectedVariant,
        variantCandidateCount: variant.candidateCount,
        ...(params.decisionContext || {}),
      },
    });
  } catch {
    // best-effort
  }
}

export async function logOutcomeForPost(params: {
  supabase: any;
  post: LearningPost;
  source: "publish" | "sync" | "manual";
  eventType: "published" | "snapshot" | "manual";
  objective?: AIObjective;
  metadata?: JsonRecord;
}): Promise<boolean> {
  try {
    const hash = metricsHash(params.post);
    const { data: existing } = await params.supabase
      .from("outcome_events")
      .select("id")
      .eq("post_id", params.post.id)
      .eq("source", params.source)
      .eq("event_type", params.eventType)
      .eq("metrics_hash", hash)
      .maybeSingle();

    if (existing?.id) return false;

    const { error } = await params.supabase.from("outcome_events").insert({
      organization_id: params.post.organization_id,
      social_account_id: params.post.social_account_id || null,
      post_id: params.post.id,
      platform: params.post.platform,
      objective: params.objective || "engagement",
      event_type: params.eventType,
      source: params.source,
      recorded_at: new Date().toISOString(),
      published_at: params.post.published_at || null,
      likes_count: toNumber(params.post.likes_count),
      comments_count: toNumber(params.post.comments_count),
      shares_count: toNumber(params.post.shares_count),
      saves_count: toNumber(params.post.saves_count),
      views_count: toNumber(params.post.views_count),
      reach_count: toNumber(params.post.reach_count),
      impressions_count: toNumber(params.post.impressions_count),
      engagement_rate: toNumber(params.post.engagement_rate),
      metrics_hash: hash,
      metadata: params.metadata || {},
    });

    return !error;
  } catch {
    // best-effort
    return false;
  }
}

export async function refreshCreativeMemoryFromPost(params: {
  supabase: any;
  post: LearningPost;
  objective?: AIObjective;
  metadata?: JsonRecord;
}): Promise<void> {
  try {
    const signals = deriveCreativeSignals({
      text: params.post.text_content,
      hookType: params.post.hook_type,
      ctaType: params.post.cta_type,
    });

    const objective = params.objective || "engagement";
    const engagement = toNumber(params.post.engagement_rate);
    const successThreshold = Number(
      process.env.CREATIVE_MEMORY_SUCCESS_ENGAGEMENT_THRESHOLD || 2
    );
    const successIncrement = engagement >= successThreshold ? 1 : 0;

    const { data: existing } = await params.supabase
      .from("creative_memory")
      .select("id,sample_size,success_count,total_engagement")
      .eq("organization_id", params.post.organization_id)
      .eq("platform", params.post.platform)
      .eq("objective", objective)
      .eq("memory_key", signals.memoryKey)
      .maybeSingle();

    if (!existing) {
      await params.supabase.from("creative_memory").insert({
        organization_id: params.post.organization_id,
        platform: params.post.platform,
        objective,
        memory_key: signals.memoryKey,
        hook_type: signals.hookType,
        framework: signals.framework,
        cta_type: signals.ctaType,
        sample_size: 1,
        success_count: successIncrement,
        total_engagement: engagement,
        avg_engagement: engagement,
        last_post_id: params.post.id,
        last_outcome_at: new Date().toISOString(),
        metadata: params.metadata || {},
      });
      return;
    }

    const sampleSize = toNumber(existing.sample_size) + 1;
    const successCount = toNumber(existing.success_count) + successIncrement;
    const totalEngagement = toNumber(existing.total_engagement) + engagement;
    const avgEngagement = sampleSize > 0 ? totalEngagement / sampleSize : 0;

    await params.supabase
      .from("creative_memory")
      .update({
        hook_type: signals.hookType,
        framework: signals.framework,
        cta_type: signals.ctaType,
        sample_size: sampleSize,
        success_count: successCount,
        total_engagement: Number(totalEngagement.toFixed(4)),
        avg_engagement: Number(avgEngagement.toFixed(4)),
        last_post_id: params.post.id,
        last_outcome_at: new Date().toISOString(),
        metadata: {
          ...(asRecord(params.metadata) || {}),
          lastEngagementRate: engagement,
        },
      })
      .eq("id", existing.id);
  } catch {
    // best-effort
  }
}
