-- ============================================================================
-- Fix RPC functions to match actual episodic_memory schema
-- 
-- Actual columns: content (jsonb), context (jsonb), importance_score (float8),
--                 decay_rate (float8), access_count (int), strength (real),
--                 recall_count (int), ease_factor (real), half_life_days (real),
--                 last_recalled_at, next_review_at
--
-- Missing columns that migration 012 expected: summary (text), importance (real),
--                 platform (enum), details (jsonb), source_post_id (uuid)
-- ============================================================================

-- ============================================================================
-- 1) Fix get_cognitive_context_v3
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
  v_accuracy_values REAL[];
  v_bayesian_accuracy REAL;
  v_calculated_temp REAL;
  v_prior_mean CONSTANT REAL := 0.5;
  v_prior_strength CONSTANT REAL := 3.0;
BEGIN
  -- 0) Membership gate
  IF NOT EXISTS (
    SELECT 1 FROM contentos.organization_members
    WHERE organization_id = p_org_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not_authorized'
      USING HINT = 'User is not a member of the requested organization';
  END IF;

  -- 1) Bayesian-smoothed accuracy
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
    v_bayesian_accuracy := v_prior_mean;
  ELSE
    v_bayesian_accuracy := (
      v_prior_mean * v_prior_strength
      + (SELECT sum(v) FROM unnest(v_accuracy_values) AS v)
    ) / (v_prior_strength + array_length(v_accuracy_values, 1));
  END IF;

  v_calculated_temp := 0.3 + (v_bayesian_accuracy * 0.6);
  v_calculated_temp := GREATEST(0.3, LEAST(0.9, v_calculated_temp));

  -- 2) Build 5-layer context
  SELECT jsonb_build_object(
    'episodic', (
      SELECT COALESCE(jsonb_agg(row_to_json(e.*) ORDER BY e.current_weight DESC), '[]'::jsonb)
      FROM (
        SELECT
          id,
          -- Map actual columns to expected schema
          COALESCE(content->>'summary', content->>'text', LEFT(content::TEXT, 200)) AS summary,
          event_type,
          COALESCE(context->>'platform', NULL) AS platform,
          importance_score AS importance,
          created_at,
          ROUND(
            (importance_score * EXP(-decay_rate * EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400.0))::NUMERIC,
            4
          )::REAL AS current_weight
        FROM contentos.episodic_memory
        WHERE organization_id = p_org_id
          AND (p_platform IS NULL 
               OR context->>'platform' IS NULL 
               OR context->>'platform' = p_platform)
          AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY
          (importance_score * EXP(-decay_rate * EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400.0)) DESC
        LIMIT 5
      ) e
    ),

    'semantic', (
      SELECT COALESCE(jsonb_agg(row_to_json(s.*) ORDER BY s.rank_score DESC), '[]'::jsonb)
      FROM (
        SELECT
          pattern_type,
          platform,
          pattern_key,
          pattern_value,
          confidence,
          sample_size,
          updated_at,
          CASE
            WHEN organization_id = p_org_id THEN confidence
            ELSE confidence * 0.7
          END AS rank_score
        FROM contentos.semantic_patterns
        WHERE (organization_id = p_org_id OR organization_id IS NULL)
          AND (p_platform IS NULL OR platform IS NULL OR platform = p_platform)
          AND confidence > 0.2
        ORDER BY rank_score DESC
        LIMIT 10
      ) s
    ),

    'procedural', (
      SELECT COALESCE(jsonb_agg(row_to_json(p.*) ORDER BY p.effectiveness DESC), '[]'::jsonb)
      FROM (
        SELECT
          name,
          strategy_type,
          platform,
          description,
          conditions,
          actions,
          effectiveness,
          times_applied,
          times_succeeded
        FROM contentos.procedural_strategies
        WHERE organization_id = p_org_id
          AND is_active = true
          AND (p_platform IS NULL OR platform IS NULL OR platform = p_platform)
          AND times_applied > 0
        ORDER BY effectiveness DESC
        LIMIT 3
      ) p
    ),

    'working', (
      SELECT COALESCE(jsonb_agg(row_to_json(w.*)), '[]'::jsonb)
      FROM (
        SELECT
          memory_type,
          content,
          valid_until,
          updated_at
        FROM contentos.working_memory
        WHERE organization_id = p_org_id
          AND valid_until > NOW()
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

-- ============================================================================
-- 2) Fix get_cognitive_context_v4 (strength-based composite scoring)
-- ============================================================================
CREATE OR REPLACE FUNCTION contentos.get_cognitive_context_v4(
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
  v_episodic  JSONB;
  v_semantic  JSONB;
  v_procedural JSONB;
  v_working   JSONB;
  v_meta      JSONB;
BEGIN
  -- Membership check
  IF NOT EXISTS (
    SELECT 1 FROM contentos.organization_members
    WHERE organization_id = p_org_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not_authorized: user % is not a member of org %',
      auth.uid(), p_org_id;
  END IF;

  -- Layer 1: Episodic with composite scoring
  SELECT COALESCE(jsonb_agg(row_to_jsonb(e) ORDER BY e.composite_score DESC), '[]'::jsonb)
    INTO v_episodic
    FROM (
      SELECT
        em.id,
        COALESCE(em.content->>'summary', em.content->>'text', LEFT(em.content::TEXT, 200)) AS summary,
        em.event_type,
        COALESCE(em.context->>'platform', NULL) AS platform,
        em.importance_score AS importance,
        em.created_at::TEXT,
        em.strength, em.recall_count, em.ease_factor,
        em.half_life_days, em.last_recalled_at::TEXT,
        em.next_review_at::TEXT,
        -- Composite score: strength * importance * temporal_decay * recency_bias
        ROUND((
          em.strength
          * em.importance_score
          * EXP(-LN(2) / GREATEST(em.half_life_days, 1.0)
                * EXTRACT(EPOCH FROM (NOW() - em.created_at)) / 86400.0)
          * (1.0 + 0.2 * CASE WHEN em.last_recalled_at IS NOT NULL
               THEN EXP(-EXTRACT(EPOCH FROM (NOW() - em.last_recalled_at)) / 604800.0)
               ELSE 0 END)
        )::NUMERIC, 4)::REAL AS composite_score,
        ROUND((
          em.importance_score
          * EXP(-em.decay_rate * EXTRACT(EPOCH FROM (NOW() - em.created_at)) / 86400.0)
        )::NUMERIC, 4)::REAL AS current_weight
      FROM contentos.episodic_memory em
      WHERE em.organization_id = p_org_id
        AND (p_platform IS NULL
             OR em.context->>'platform' IS NULL
             OR em.context->>'platform' = p_platform)
        AND (em.expires_at IS NULL OR em.expires_at > NOW())
      ORDER BY composite_score DESC
      LIMIT 5
    ) e;

  -- Layer 2: Semantic (same as v3)
  SELECT COALESCE(jsonb_agg(row_to_jsonb(s) ORDER BY s.rank_score DESC), '[]'::jsonb)
    INTO v_semantic
    FROM (
      SELECT
        sp.pattern_type, sp.platform, sp.pattern_key,
        sp.pattern_value, sp.confidence, sp.sample_size,
        sp.updated_at::TEXT,
        CASE WHEN sp.organization_id = p_org_id THEN sp.confidence
             ELSE sp.confidence * 0.7
        END AS rank_score
      FROM contentos.semantic_patterns sp
      WHERE (sp.organization_id = p_org_id OR sp.organization_id IS NULL)
        AND (p_platform IS NULL OR sp.platform IS NULL OR sp.platform = p_platform)
        AND sp.confidence > 0.2
      ORDER BY rank_score DESC
      LIMIT 10
    ) s;

  -- Layer 3: Procedural (same as v3)
  SELECT COALESCE(jsonb_agg(row_to_jsonb(p) ORDER BY p.effectiveness DESC), '[]'::jsonb)
    INTO v_procedural
    FROM (
      SELECT
        ps.name, ps.strategy_type, ps.platform,
        ps.description, ps.conditions, ps.actions,
        ps.effectiveness, ps.times_applied, ps.times_succeeded
      FROM contentos.procedural_strategies ps
      WHERE ps.organization_id = p_org_id
        AND ps.is_active = true
        AND (p_platform IS NULL OR ps.platform IS NULL OR ps.platform = p_platform)
        AND ps.times_applied > 0
      ORDER BY ps.effectiveness DESC
      LIMIT 3
    ) p;

  -- Layer 4: Working (same as v3)
  SELECT COALESCE(jsonb_agg(row_to_jsonb(w)), '[]'::jsonb)
    INTO v_working
    FROM (
      SELECT wm.memory_type, wm.content, wm.valid_until::TEXT, wm.updated_at::TEXT
      FROM contentos.working_memory wm
      WHERE wm.organization_id = p_org_id
        AND wm.valid_until > NOW()
    ) w;

  -- Layer 5: Metacognitive
  SELECT jsonb_build_object(
    'accuracy_bayesian', COALESCE((
      SELECT ROUND(AVG(value)::NUMERIC, 4)
      FROM (
        SELECT value FROM contentos.metacognitive_log
        WHERE organization_id = p_org_id
          AND metric_type = 'prediction_accuracy'
          AND period_end > NOW() - INTERVAL '14 days'
        ORDER BY period_end DESC LIMIT 10
      ) r
    ), 0.5),
    'accuracy_samples', COALESCE((
      SELECT COUNT(*)::INT FROM contentos.metacognitive_log
      WHERE organization_id = p_org_id
        AND metric_type = 'prediction_accuracy'
        AND period_end > NOW() - INTERVAL '14 days'
    ), 0),
    'calculated_temperature', 0.6,
    'temperature_method', 'bayesian_composite_v4',
    'layers_injected', 5
  ) INTO v_meta;

  RETURN jsonb_build_object(
    'episodic', v_episodic,
    'semantic', v_semantic,
    'procedural', v_procedural,
    'working', v_working,
    'metacognitive', v_meta
  );
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION contentos.get_cognitive_context_v3(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION contentos.get_cognitive_context_v4(UUID, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION contentos.get_cognitive_context_v3(UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION contentos.get_cognitive_context_v4(UUID, TEXT) FROM anon;
