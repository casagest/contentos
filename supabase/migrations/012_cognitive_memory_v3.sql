-- ============================================================================
-- 012_cognitive_memory_v3.sql
-- Cognitive Memory System — 5-Layer Architecture
-- ============================================================================
--
-- WHAT:    Complete cognitive memory storage for AI content generation
-- WHY:     RAG context injection with temporal decay, pattern learning, metacognition
-- SCHEMA:  contentos
-- DEPENDS: contentos.organizations(id), contentos.organization_members(organization_id, user_id, role)
-- AUTHOR:  MedicalCor Engineering
-- REVIEW:  Architecture-level hardening pass
--
-- TABLES:  episodic_memory, semantic_patterns, procedural_strategies,
--          working_memory, metacognitive_log
-- RPCs:    get_cognitive_context_v3 (SECURITY INVOKER)
-- GC:      gc_episodic_memory_batch, gc_working_memory_batch (SECURITY DEFINER)
-- ============================================================================

-- Required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE SCHEMA IF NOT EXISTS contentos;

-- ============================================================================
-- 0) ENUM TYPES (extensible via ALTER TYPE ... ADD VALUE, no table ALTER needed)
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE contentos.event_type AS ENUM (
    'post_success', 'post_failure', 'viral_moment', 'audience_shift',
    'goal_milestone', 'strategy_change', 'competitor_insight', 'trend_detected',
    'budget_exhausted', 'content_gap_found'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE contentos.platform_type AS ENUM (
    'facebook', 'instagram', 'tiktok', 'youtube', 'twitter'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE contentos.pattern_type AS ENUM (
    'topic_affinity', 'temporal_pattern', 'audience_preference',
    'content_format', 'engagement_driver', 'industry_benchmark', 'platform_trend'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE contentos.strategy_type AS ENUM (
    'content_recipe', 'posting_schedule', 'hook_sequence',
    'topic_rotation', 'engagement_tactic', 'audience_growth'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE contentos.memory_slot AS ENUM (
    'performance_summary', 'active_goals', 'recent_insights',
    'content_pipeline', 'audience_snapshot', 'trend_alerts',
    'metacognitive_state', 'system_config'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE contentos.metric_type AS ENUM (
    'prediction_accuracy', 'model_calibration', 'confidence_drift',
    'strategy_effectiveness', 'learning_velocity', 'cold_start_quality'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 1) TABLES
-- ============================================================================

-- Layer 1: Episodic Memory (what happened)
CREATE TABLE IF NOT EXISTS contentos.episodic_memory (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES contentos.organizations(id) ON DELETE CASCADE,
  event_type      contentos.event_type NOT NULL,
  platform        contentos.platform_type,
  importance      REAL NOT NULL DEFAULT 0.5
                    CONSTRAINT importance_range CHECK (importance >= 0.0 AND importance <= 1.0),
  summary         TEXT NOT NULL
                    CONSTRAINT summary_not_empty CHECK (length(trim(summary)) > 0),
  details         JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_post_id  UUID,
  embedding       vector(1536),
  decay_rate      REAL NOT NULL DEFAULT 0.02
                    CONSTRAINT decay_rate_range CHECK (decay_rate >= 0.0 AND decay_rate <= 1.0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),

  -- Unidirectional: complex events REQUIRE embedding, others MAY have it
  CONSTRAINT complex_events_require_embedding CHECK (
    embedding IS NOT NULL
    OR event_type NOT IN ('viral_moment', 'audience_shift', 'strategy_change', 'trend_detected')
  )
);

COMMENT ON TABLE contentos.episodic_memory IS
  'Layer 1: What happened. Temporal events with exponential decay weighting.';
COMMENT ON CONSTRAINT complex_events_require_embedding ON contentos.episodic_memory IS
  'Complex event types require vector embeddings for semantic retrieval. Simple events may optionally have embeddings.';

-- Layer 2: Semantic Patterns (what we learned)
CREATE TABLE IF NOT EXISTS contentos.semantic_patterns (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID REFERENCES contentos.organizations(id) ON DELETE CASCADE,
  -- NULL org_id = global/industry pattern (readable by all, writable by none via RLS)
  pattern_type      contentos.pattern_type NOT NULL,
  platform          contentos.platform_type,
  pattern_key       TEXT NOT NULL
                      CONSTRAINT pattern_key_not_empty CHECK (length(trim(pattern_key)) > 0),
  pattern_value     JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence        REAL NOT NULL DEFAULT 0.5
                      CONSTRAINT confidence_range CHECK (confidence >= 0.0 AND confidence <= 1.0),
  sample_size       INTEGER NOT NULL DEFAULT 0
                      CONSTRAINT sample_size_non_negative CHECK (sample_size >= 0),
  last_validated_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_semantic_pattern
    UNIQUE (organization_id, pattern_type, platform, pattern_key)
);

COMMENT ON TABLE contentos.semantic_patterns IS
  'Layer 2: What we learned. Aggregated patterns with Bayesian confidence tracking.';

-- Layer 3: Procedural Strategies (what works)
CREATE TABLE IF NOT EXISTS contentos.procedural_strategies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES contentos.organizations(id) ON DELETE CASCADE,
  strategy_type   contentos.strategy_type NOT NULL,
  platform        contentos.platform_type,
  name            TEXT NOT NULL
                    CONSTRAINT strategy_name_not_empty CHECK (length(trim(name)) > 0),
  description     TEXT NOT NULL DEFAULT '',
  conditions      JSONB NOT NULL DEFAULT '[]'::jsonb,
  actions         JSONB NOT NULL DEFAULT '{}'::jsonb,
  effectiveness   REAL NOT NULL DEFAULT 0.5
                    CONSTRAINT effectiveness_range CHECK (effectiveness >= 0.0 AND effectiveness <= 1.0),
  times_applied   INTEGER NOT NULL DEFAULT 0
                    CONSTRAINT times_applied_non_negative CHECK (times_applied >= 0),
  times_succeeded INTEGER NOT NULL DEFAULT 0
                    CONSTRAINT times_succeeded_non_negative CHECK (times_succeeded >= 0),
  last_applied_at TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Invariant: succeeded <= applied
  CONSTRAINT success_lte_applied CHECK (times_succeeded <= times_applied)
);

COMMENT ON TABLE contentos.procedural_strategies IS
  'Layer 3: What works. Proven strategies with effectiveness tracking and success ratios.';

-- Layer 4: Working Memory (what matters now)
CREATE TABLE IF NOT EXISTS contentos.working_memory (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES contentos.organizations(id) ON DELETE CASCADE,
  memory_type     contentos.memory_slot NOT NULL,
  content         JSONB NOT NULL DEFAULT '{}'::jsonb,
  valid_until     TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_working_memory_slot UNIQUE (organization_id, memory_type)
);

COMMENT ON TABLE contentos.working_memory IS
  'Layer 4: What matters now. Short-lived context slots with TTL-based expiration.';

-- Layer 5: Metacognitive Log (how well is the system performing)
CREATE TABLE IF NOT EXISTS contentos.metacognitive_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES contentos.organizations(id) ON DELETE CASCADE,
  metric_type     contentos.metric_type NOT NULL,
  platform        contentos.platform_type,
  period_start    TIMESTAMPTZ NOT NULL,
  period_end      TIMESTAMPTZ NOT NULL,
  value           REAL NOT NULL
                    CONSTRAINT metric_value_range CHECK (value >= 0.0 AND value <= 1.0),
  details         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Invariant: period_start < period_end
  CONSTRAINT valid_period CHECK (period_start < period_end)
);

COMMENT ON TABLE contentos.metacognitive_log IS
  'Layer 5: How well is the system performing. Calibration metrics for temperature/confidence tuning.';

-- ============================================================================
-- 2) INDEXES
--    Rule: No NOW() in index expressions (PostgreSQL evaluates once at CREATE time).
--    Rule: Partial indexes where cardinality is <50% of table.
-- ============================================================================

-- Episodic: primary retrieval path (org + recency)
CREATE INDEX IF NOT EXISTS idx_episodic_org_created
  ON contentos.episodic_memory (organization_id, created_at DESC);

-- Episodic: decay-weighted retrieval uses importance + created_at, computed at query time
CREATE INDEX IF NOT EXISTS idx_episodic_org_importance
  ON contentos.episodic_memory (organization_id, importance DESC, created_at DESC);

-- Episodic: platform-filtered queries
CREATE INDEX IF NOT EXISTS idx_episodic_org_platform
  ON contentos.episodic_memory (organization_id, platform, created_at DESC)
  WHERE platform IS NOT NULL;

-- Episodic: GC candidate scan (expired or low-importance)
CREATE INDEX IF NOT EXISTS idx_episodic_gc_candidates
  ON contentos.episodic_memory (expires_at, importance, created_at)
  WHERE importance < 0.3;

-- Episodic: HNSW vector search (ONLY rows with embeddings — ~40% of table)
CREATE INDEX IF NOT EXISTS idx_episodic_embedding_hnsw
  ON contentos.episodic_memory
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 100)
  WHERE embedding IS NOT NULL;

-- Semantic: org + platform + confidence ranking
CREATE INDEX IF NOT EXISTS idx_semantic_org_platform_conf
  ON contentos.semantic_patterns (organization_id, platform, confidence DESC);

-- Semantic: global patterns (org_id IS NULL) separate index for fast union
CREATE INDEX IF NOT EXISTS idx_semantic_global_patterns
  ON contentos.semantic_patterns (pattern_type, platform, confidence DESC)
  WHERE organization_id IS NULL;

-- Procedural: active strategies ranked by effectiveness
CREATE INDEX IF NOT EXISTS idx_proc_org_active_effective
  ON contentos.procedural_strategies (organization_id, platform, effectiveness DESC)
  WHERE is_active = true;

-- Working: active slots only
CREATE INDEX IF NOT EXISTS idx_working_org_type
  ON contentos.working_memory (organization_id, memory_type);

-- Metacognitive: accuracy lookup for temperature calculation
CREATE INDEX IF NOT EXISTS idx_meta_org_accuracy_period
  ON contentos.metacognitive_log (organization_id, metric_type, period_end DESC)
  WHERE metric_type = 'prediction_accuracy';

-- ============================================================================
-- 3) CRITICAL: organization_members index for RLS performance
--    Every RLS check calls is_org_member() which queries this table.
--    Without this index, RLS degrades to O(n) per row returned.
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_orgmembers_org_user
  ON contentos.organization_members (organization_id, user_id);

-- ============================================================================
-- 4) updated_at triggers (idempotent creation)
-- ============================================================================

CREATE OR REPLACE FUNCTION contentos.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tbl TEXT;
  trg TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['semantic_patterns', 'procedural_strategies', 'working_memory']
  LOOP
    trg := 'trg_' || tbl || '_updated_at';
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = trg) THEN
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE UPDATE ON contentos.%I
         FOR EACH ROW EXECUTE FUNCTION contentos.set_updated_at()',
        trg, tbl
      );
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- 5) RLS — membership-based, no JWT org claims trusted
-- ============================================================================

ALTER TABLE contentos.episodic_memory       ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.semantic_patterns     ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.procedural_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.working_memory        ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.metacognitive_log     ENABLE ROW LEVEL SECURITY;

-- Membership predicate: SQL function (STABLE) enables planner inlining
CREATE OR REPLACE FUNCTION contentos.is_org_member(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM contentos.organization_members m
    WHERE m.organization_id = p_org_id
      AND m.user_id = auth.uid()
  );
$$;

-- Macro: generate all 4 policies for an org-owned table
-- We use DO block to avoid 60+ lines of repetitive policy DDL
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'episodic_memory', 'procedural_strategies', 'working_memory', 'metacognitive_log'
  ]
  LOOP
    -- SELECT
    EXECUTE format('DROP POLICY IF EXISTS %I ON contentos.%I', tbl || '_sel', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON contentos.%I FOR SELECT
       USING (contentos.is_org_member(organization_id))',
      tbl || '_sel', tbl
    );
    -- INSERT
    EXECUTE format('DROP POLICY IF EXISTS %I ON contentos.%I', tbl || '_ins', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON contentos.%I FOR INSERT
       WITH CHECK (contentos.is_org_member(organization_id))',
      tbl || '_ins', tbl
    );
    -- UPDATE
    EXECUTE format('DROP POLICY IF EXISTS %I ON contentos.%I', tbl || '_upd', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON contentos.%I FOR UPDATE
       USING (contentos.is_org_member(organization_id))
       WITH CHECK (contentos.is_org_member(organization_id))',
      tbl || '_upd', tbl
    );
    -- DELETE
    EXECUTE format('DROP POLICY IF EXISTS %I ON contentos.%I', tbl || '_del', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON contentos.%I FOR DELETE
       USING (contentos.is_org_member(organization_id))',
      tbl || '_del', tbl
    );
  END LOOP;
END $$;

-- Semantic patterns: special case (global patterns readable by all)
DROP POLICY IF EXISTS semantic_patterns_sel ON contentos.semantic_patterns;
CREATE POLICY semantic_patterns_sel ON contentos.semantic_patterns
FOR SELECT USING (
  organization_id IS NULL  -- global patterns: readable by authenticated users
  OR contentos.is_org_member(organization_id)
);

DROP POLICY IF EXISTS semantic_patterns_ins ON contentos.semantic_patterns;
CREATE POLICY semantic_patterns_ins ON contentos.semantic_patterns
FOR INSERT WITH CHECK (
  organization_id IS NOT NULL AND contentos.is_org_member(organization_id)
);

DROP POLICY IF EXISTS semantic_patterns_upd ON contentos.semantic_patterns;
CREATE POLICY semantic_patterns_upd ON contentos.semantic_patterns
FOR UPDATE
  USING (organization_id IS NOT NULL AND contentos.is_org_member(organization_id))
  WITH CHECK (organization_id IS NOT NULL AND contentos.is_org_member(organization_id));

DROP POLICY IF EXISTS semantic_patterns_del ON contentos.semantic_patterns;
CREATE POLICY semantic_patterns_del ON contentos.semantic_patterns
FOR DELETE USING (
  organization_id IS NOT NULL AND contentos.is_org_member(organization_id)
);

-- Metacognitive log: append-only for authenticated (no update/delete via RLS)
-- GC handles cleanup via service_role
DROP POLICY IF EXISTS metacognitive_log_upd ON contentos.metacognitive_log;
DROP POLICY IF EXISTS metacognitive_log_del ON contentos.metacognitive_log;

-- ============================================================================
-- 6) GC FUNCTIONS — batched, safe, observable
--    SECURITY DEFINER: bypass RLS. Only service_role can execute.
-- ============================================================================

CREATE OR REPLACE FUNCTION contentos.gc_episodic_memory_batch(
  p_batch_size INTEGER DEFAULT 5000
)
RETURNS TABLE (deleted_count INTEGER, remaining_estimate BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = contentos, pg_temp
AS $$
DECLARE
  v_deleted INTEGER;
  v_remaining BIGINT;
BEGIN
  -- Delete in bounded batch to avoid long locks and WAL spikes
  WITH candidates AS (
    SELECT id
    FROM contentos.episodic_memory
    WHERE expires_at < NOW()
       OR (importance * EXP(-decay_rate * EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400.0)) < 0.05
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED  -- non-blocking: skip rows locked by concurrent queries
  ),
  removed AS (
    DELETE FROM contentos.episodic_memory
    WHERE id IN (SELECT id FROM candidates)
    RETURNING 1
  )
  SELECT count(*)::INTEGER INTO v_deleted FROM removed;

  -- Estimate remaining candidates (cheap count, not exact)
  SELECT count(*) INTO v_remaining
  FROM contentos.episodic_memory
  WHERE expires_at < NOW()
  LIMIT 1;  -- EXISTS-style: just check if there are more

  deleted_count := v_deleted;
  remaining_estimate := v_remaining;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION contentos.gc_working_memory_batch(
  p_batch_size INTEGER DEFAULT 5000
)
RETURNS TABLE (deleted_count INTEGER, remaining_estimate BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = contentos, pg_temp
AS $$
DECLARE
  v_deleted INTEGER;
  v_remaining BIGINT;
BEGIN
  WITH candidates AS (
    SELECT id
    FROM contentos.working_memory
    WHERE valid_until < NOW()
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  ),
  removed AS (
    DELETE FROM contentos.working_memory
    WHERE id IN (SELECT id FROM candidates)
    RETURNING 1
  )
  SELECT count(*)::INTEGER INTO v_deleted FROM removed;

  SELECT count(*) INTO v_remaining
  FROM contentos.working_memory
  WHERE valid_until < NOW()
  LIMIT 1;

  deleted_count := v_deleted;
  remaining_estimate := v_remaining;
  RETURN NEXT;
END;
$$;

-- Lock down GC to service_role only
REVOKE ALL ON FUNCTION contentos.gc_episodic_memory_batch(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION contentos.gc_working_memory_batch(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION contentos.gc_episodic_memory_batch(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION contentos.gc_working_memory_batch(INTEGER) TO service_role;

-- ============================================================================
-- 7) RPC: get_cognitive_context_v3 — SECURITY INVOKER (respects RLS)
--    Single round-trip, 5 layers, Bayesian-smoothed temperature
-- ============================================================================

CREATE OR REPLACE FUNCTION contentos.get_cognitive_context_v3(
  p_org_id   UUID,
  p_platform TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
PARALLEL SAFE
SET search_path = contentos, pg_temp
AS $$
DECLARE
  result JSONB;
  v_platform contentos.platform_type;
  v_accuracy_values REAL[];
  v_bayesian_accuracy REAL;
  v_calculated_temp REAL;
  v_prior_mean CONSTANT REAL := 0.5;   -- Bayesian prior (uninformed)
  v_prior_strength CONSTANT REAL := 3.0; -- Equivalent sample count for prior
BEGIN
  -- 0) Membership gate (fast fail before any data access)
  IF NOT contentos.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'not_authorized'
      USING HINT = 'User is not a member of the requested organization';
  END IF;

  -- Safe cast platform (NULL if invalid — graceful, not exception)
  IF p_platform IS NOT NULL THEN
    BEGIN
      v_platform := p_platform::contentos.platform_type;
    EXCEPTION WHEN invalid_text_representation THEN
      v_platform := NULL;
    END;
  END IF;

  -- 1) Bayesian-smoothed accuracy from recent metacognitive logs
  --    Formula: (prior_mean * prior_strength + sum(observations)) / (prior_strength + n)
  --    This prevents wild temperature swings from small sample sizes
  SELECT array_agg(value ORDER BY period_end DESC)
  INTO v_accuracy_values
  FROM (
    SELECT value
    FROM contentos.metacognitive_log
    WHERE organization_id = p_org_id
      AND metric_type = 'prediction_accuracy'
      AND period_end > NOW() - INTERVAL '14 days'
    ORDER BY period_end DESC
    LIMIT 10
  ) recent;

  IF v_accuracy_values IS NULL OR array_length(v_accuracy_values, 1) IS NULL THEN
    v_bayesian_accuracy := v_prior_mean;  -- cold start: use prior
  ELSE
    v_bayesian_accuracy := (
      v_prior_mean * v_prior_strength
      + (SELECT sum(v) FROM unnest(v_accuracy_values) AS v)
    ) / (v_prior_strength + array_length(v_accuracy_values, 1));
  END IF;

  -- Temperature: continuous mapping (no discontinuous jumps)
  -- Maps accuracy [0.0, 1.0] → temperature [0.3, 0.9]
  -- Low accuracy → lower temperature (more conservative)
  -- High accuracy → higher temperature (more creative freedom)
  v_calculated_temp := 0.3 + (v_bayesian_accuracy * 0.6);
  v_calculated_temp := GREATEST(0.3, LEAST(0.9, v_calculated_temp));

  -- 2) Build 5-layer context in single query
  SELECT jsonb_build_object(
    'episodic', (
      SELECT COALESCE(jsonb_agg(row_to_json(e.*) ORDER BY e.current_weight DESC), '[]'::jsonb)
      FROM (
        SELECT
          id,
          summary,
          event_type::TEXT,
          platform::TEXT,
          importance,
          created_at,
          ROUND(
            (importance * EXP(-decay_rate * EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400.0))::NUMERIC,
            4
          )::REAL AS current_weight
        FROM contentos.episodic_memory
        WHERE organization_id = p_org_id
          AND (v_platform IS NULL OR platform IS NULL OR platform = v_platform)
          AND expires_at > NOW()
        ORDER BY
          (importance * EXP(-decay_rate * EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400.0)) DESC
        LIMIT 5
      ) e
    ),

    'semantic', (
      SELECT COALESCE(jsonb_agg(row_to_json(s.*) ORDER BY s.rank_score DESC), '[]'::jsonb)
      FROM (
        SELECT
          pattern_type::TEXT,
          platform::TEXT,
          pattern_key,
          pattern_value,
          confidence,
          sample_size,
          updated_at,
          -- Org-specific patterns ranked higher than global
          CASE
            WHEN organization_id = p_org_id THEN confidence
            ELSE confidence * 0.7
          END AS rank_score
        FROM contentos.semantic_patterns
        WHERE (organization_id = p_org_id OR organization_id IS NULL)
          AND (v_platform IS NULL OR platform IS NULL OR platform = v_platform)
          AND confidence > 0.2  -- filter noise
        ORDER BY rank_score DESC
        LIMIT 10
      ) s
    ),

    'procedural', (
      SELECT COALESCE(jsonb_agg(row_to_json(p.*) ORDER BY p.effectiveness DESC), '[]'::jsonb)
      FROM (
        SELECT
          name,
          strategy_type::TEXT,
          platform::TEXT,
          description,
          conditions,
          actions,
          effectiveness,
          times_applied,
          times_succeeded
        FROM contentos.procedural_strategies
        WHERE organization_id = p_org_id
          AND is_active = true
          AND (v_platform IS NULL OR platform IS NULL OR platform = v_platform)
          AND times_applied > 0  -- only battle-tested strategies
        ORDER BY effectiveness DESC
        LIMIT 3
      ) p
    ),

    'working', (
      SELECT COALESCE(jsonb_agg(row_to_json(w.*)), '[]'::jsonb)
      FROM (
        SELECT
          memory_type::TEXT,
          content,
          valid_until,
          updated_at
        FROM contentos.working_memory
        WHERE organization_id = p_org_id
          AND valid_until > NOW()
          AND memory_type != 'metacognitive_state'  -- internal, not for prompt
      ) w
    ),

    'metacognitive', jsonb_build_object(
      'accuracy_bayesian', ROUND(v_bayesian_accuracy::NUMERIC, 4),
      'accuracy_samples', COALESCE(array_length(v_accuracy_values, 1), 0),
      'calculated_temperature', ROUND(v_calculated_temp::NUMERIC, 4),
      'temperature_method', 'bayesian_smoothed_linear',
      'prior_strength', v_prior_strength,
      'layers_injected', 5
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Grants: authenticated can call RPC, anon cannot
GRANT EXECUTE ON FUNCTION contentos.get_cognitive_context_v3(UUID, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION contentos.get_cognitive_context_v3(UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION contentos.get_cognitive_context_v3(UUID, TEXT) FROM PUBLIC;

-- ============================================================================
-- 8) SECURITY: Footgun prevention
-- ============================================================================

-- Ensure no generic SQL execution function exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname IN ('execute_sql', 'exec_sql', 'run_sql', 'eval_sql')
  ) THEN
    RAISE EXCEPTION 'SECURITY: Generic SQL execution function detected. Remove before deploying.';
  END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
