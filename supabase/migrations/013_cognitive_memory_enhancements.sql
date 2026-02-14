-- ============================================================================
-- 013_cognitive_memory_enhancements.sql
-- Cognitive Memory v2 — Spaced Repetition, Pattern Detection, Knowledge Graph
-- ============================================================================
--
-- WHAT:    Extend cognitive memory with 7 new features
-- WHY:     Active learning: forgetting curves, pattern detection, entity extraction, PII-aware
-- SCHEMA:  contentos
-- DEPENDS: 012_cognitive_memory_v3.sql
-- AUTHOR:  MedicalCor Engineering
--
-- CHANGES:
--   ALTER:  episodic_memory (add spaced repetition columns)
--   CREATE: pattern_candidates (staging table for detection pipeline)
--   CREATE: consolidation_audit_log (append-only audit trail)
--   CREATE: knowledge_entities (entity extraction results)
--   CREATE: knowledge_relationships (adjacency list for graph)
--   CREATE: record_memory_recall (SM2 update function)
--   CREATE: get_cognitive_context_v4 (v3 + strength-based composite scoring)
-- ============================================================================

-- ============================================================================
-- 1) ALTER episodic_memory — Add spaced repetition columns
-- ============================================================================

ALTER TABLE contentos.episodic_memory
  ADD COLUMN IF NOT EXISTS strength REAL NOT NULL DEFAULT 0.5
    CONSTRAINT strength_range CHECK (strength >= 0.0 AND strength <= 1.0),
  ADD COLUMN IF NOT EXISTS recall_count INTEGER NOT NULL DEFAULT 0
    CONSTRAINT recall_count_non_negative CHECK (recall_count >= 0),
  ADD COLUMN IF NOT EXISTS last_recalled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ease_factor REAL NOT NULL DEFAULT 2.5
    CONSTRAINT ease_factor_range CHECK (ease_factor >= 1.3 AND ease_factor <= 5.0),
  ADD COLUMN IF NOT EXISTS next_review_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS half_life_days REAL NOT NULL DEFAULT 30.0
    CONSTRAINT half_life_positive CHECK (half_life_days > 0);

COMMENT ON COLUMN contentos.episodic_memory.strength IS
  'SM2 strength: 0-1, increases on recall, decays over time';
COMMENT ON COLUMN contentos.episodic_memory.ease_factor IS
  'SM2 ease factor: 1.3-5.0, controls interval growth rate';
COMMENT ON COLUMN contentos.episodic_memory.half_life_days IS
  'Ebbinghaus half-life: days until memory strength halves';

-- Index for review queue (ordered by urgency)
CREATE INDEX IF NOT EXISTS idx_episodic_review_queue
  ON contentos.episodic_memory (organization_id, next_review_at ASC)
  WHERE next_review_at IS NOT NULL;

-- Index for strength-based retrieval
CREATE INDEX IF NOT EXISTS idx_episodic_org_strength
  ON contentos.episodic_memory (organization_id, strength DESC, created_at DESC);

-- ============================================================================
-- 2) NEW ENUM TYPES
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE contentos.pattern_candidate_status AS ENUM (
    'pending', 'validated', 'promoted', 'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE contentos.pattern_source_type AS ENUM (
    'rule_based', 'llm_detected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE contentos.audit_action_type AS ENUM (
    'episodic_promoted', 'pattern_merged', 'pattern_invalidated',
    'conflict_resolved', 'entity_extracted', 'entity_linked'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE contentos.audit_actor AS ENUM (
    'system', 'llm', 'user', 'cron'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE contentos.entity_type AS ENUM (
    'topic', 'brand', 'person', 'procedure', 'product',
    'audience_segment', 'competitor', 'platform_feature'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE contentos.relationship_type AS ENUM (
    'co_occurs_with', 'influences', 'correlates_with',
    'competes_with', 'part_of', 'used_in', 'targets'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 3) pattern_candidates — Staging table for detection pipeline
-- ============================================================================

CREATE TABLE IF NOT EXISTS contentos.pattern_candidates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES contentos.organizations(id) ON DELETE CASCADE,
  pattern_type    TEXT NOT NULL
                    CONSTRAINT pattern_type_not_empty CHECK (length(trim(pattern_type)) > 0),
  platform        contentos.platform_type,
  pattern_key     TEXT NOT NULL
                    CONSTRAINT candidate_key_not_empty CHECK (length(trim(pattern_key)) > 0),
  pattern_value   JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence      REAL NOT NULL DEFAULT 0.5
                    CONSTRAINT candidate_confidence CHECK (confidence >= 0.0 AND confidence <= 1.0),
  source_type     contentos.pattern_source_type NOT NULL DEFAULT 'rule_based',
  evidence_ids    UUID[] NOT NULL DEFAULT '{}',
  sample_size     INTEGER NOT NULL DEFAULT 0
                    CONSTRAINT candidate_sample_size CHECK (sample_size >= 0),
  status          contentos.pattern_candidate_status NOT NULL DEFAULT 'pending',
  promoted_to_id  UUID REFERENCES contentos.semantic_patterns(id) ON DELETE SET NULL,
  llm_reasoning   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE contentos.pattern_candidates IS
  'Staging table for pattern detection pipeline. Candidates move through: pending → validated → promoted|rejected';

CREATE INDEX IF NOT EXISTS idx_pattern_candidates_org_status
  ON contentos.pattern_candidates (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_pattern_candidates_org_type
  ON contentos.pattern_candidates (organization_id, pattern_type, pattern_key);

-- ============================================================================
-- 4) consolidation_audit_log — Append-only audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS contentos.consolidation_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES contentos.organizations(id) ON DELETE CASCADE,
  action_type     contentos.audit_action_type NOT NULL,
  source_ids      UUID[] NOT NULL DEFAULT '{}',
  target_id       UUID,
  details         JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence      REAL,
  actor           contentos.audit_actor NOT NULL DEFAULT 'system',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE contentos.consolidation_audit_log IS
  'Append-only audit trail for memory consolidation operations. No UPDATE/DELETE allowed.';

CREATE INDEX IF NOT EXISTS idx_audit_log_org_action
  ON contentos.consolidation_audit_log (organization_id, action_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_org_created
  ON contentos.consolidation_audit_log (organization_id, created_at DESC);

-- ============================================================================
-- 5) knowledge_entities — Entity extraction results
-- ============================================================================

CREATE TABLE IF NOT EXISTS contentos.knowledge_entities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES contentos.organizations(id) ON DELETE CASCADE,
  entity_type     contentos.entity_type NOT NULL,
  canonical_name  TEXT NOT NULL
                    CONSTRAINT entity_name_not_empty CHECK (length(trim(canonical_name)) > 0),
  aliases         TEXT[] NOT NULL DEFAULT '{}',
  properties      JSONB NOT NULL DEFAULT '{}'::jsonb,
  mention_count   INTEGER NOT NULL DEFAULT 1
                    CONSTRAINT mention_count_positive CHECK (mention_count > 0),
  last_seen_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_knowledge_entity
    UNIQUE (organization_id, entity_type, canonical_name)
);

COMMENT ON TABLE contentos.knowledge_entities IS
  'Knowledge graph nodes: extracted entities with canonical names and aliases.';

CREATE INDEX IF NOT EXISTS idx_knowledge_entities_org_type
  ON contentos.knowledge_entities (organization_id, entity_type);

CREATE INDEX IF NOT EXISTS idx_knowledge_entities_org_mentions
  ON contentos.knowledge_entities (organization_id, mention_count DESC);

-- ============================================================================
-- 6) knowledge_relationships — Adjacency list for graph
-- ============================================================================

CREATE TABLE IF NOT EXISTS contentos.knowledge_relationships (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES contentos.organizations(id) ON DELETE CASCADE,
  source_entity_id    UUID NOT NULL REFERENCES contentos.knowledge_entities(id) ON DELETE CASCADE,
  target_entity_id    UUID NOT NULL REFERENCES contentos.knowledge_entities(id) ON DELETE CASCADE,
  relationship_type   contentos.relationship_type NOT NULL,
  weight              REAL NOT NULL DEFAULT 1.0
                        CONSTRAINT weight_positive CHECK (weight > 0),
  co_occurrence_count INTEGER NOT NULL DEFAULT 1
                        CONSTRAINT co_occurrence_positive CHECK (co_occurrence_count > 0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- No self-loops
  CONSTRAINT no_self_loop CHECK (source_entity_id != target_entity_id),

  -- Unique relationship per direction
  CONSTRAINT uq_knowledge_relationship
    UNIQUE (organization_id, source_entity_id, target_entity_id, relationship_type)
);

COMMENT ON TABLE contentos.knowledge_relationships IS
  'Knowledge graph edges: typed relationships between entities with co-occurrence weights.';

CREATE INDEX IF NOT EXISTS idx_knowledge_rels_source
  ON contentos.knowledge_relationships (organization_id, source_entity_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_rels_target
  ON contentos.knowledge_relationships (organization_id, target_entity_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_rels_weight
  ON contentos.knowledge_relationships (organization_id, weight DESC);

-- ============================================================================
-- 7) updated_at triggers for new tables
-- ============================================================================

-- Reuse existing trigger function if available, otherwise create
CREATE OR REPLACE FUNCTION contentos.set_updated_at_013()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pattern_candidates_updated_at
  BEFORE UPDATE ON contentos.pattern_candidates
  FOR EACH ROW EXECUTE FUNCTION contentos.set_updated_at_013();

CREATE TRIGGER trg_knowledge_entities_updated_at
  BEFORE UPDATE ON contentos.knowledge_entities
  FOR EACH ROW EXECUTE FUNCTION contentos.set_updated_at_013();

CREATE TRIGGER trg_knowledge_relationships_updated_at
  BEFORE UPDATE ON contentos.knowledge_relationships
  FOR EACH ROW EXECUTE FUNCTION contentos.set_updated_at_013();

-- ============================================================================
-- 8) RLS Policies
-- ============================================================================

ALTER TABLE contentos.pattern_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.consolidation_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.knowledge_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.knowledge_relationships ENABLE ROW LEVEL SECURITY;

-- Pattern candidates: org members can read/write
CREATE POLICY pattern_candidates_select ON contentos.pattern_candidates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contentos.organization_members om
      WHERE om.organization_id = pattern_candidates.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY pattern_candidates_insert ON contentos.pattern_candidates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM contentos.organization_members om
      WHERE om.organization_id = pattern_candidates.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY pattern_candidates_update ON contentos.pattern_candidates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM contentos.organization_members om
      WHERE om.organization_id = pattern_candidates.organization_id
        AND om.user_id = auth.uid()
    )
  );

-- Audit log: org members can read only (append via service_role or SECURITY DEFINER)
CREATE POLICY audit_log_select ON contentos.consolidation_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contentos.organization_members om
      WHERE om.organization_id = consolidation_audit_log.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY audit_log_insert ON contentos.consolidation_audit_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM contentos.organization_members om
      WHERE om.organization_id = consolidation_audit_log.organization_id
        AND om.user_id = auth.uid()
    )
  );

-- No UPDATE/DELETE policies for audit log (append-only)

-- Knowledge entities: org members can read/write
CREATE POLICY knowledge_entities_select ON contentos.knowledge_entities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contentos.organization_members om
      WHERE om.organization_id = knowledge_entities.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY knowledge_entities_insert ON contentos.knowledge_entities
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM contentos.organization_members om
      WHERE om.organization_id = knowledge_entities.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY knowledge_entities_update ON contentos.knowledge_entities
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM contentos.organization_members om
      WHERE om.organization_id = knowledge_entities.organization_id
        AND om.user_id = auth.uid()
    )
  );

-- Knowledge relationships: org members can read/write
CREATE POLICY knowledge_rels_select ON contentos.knowledge_relationships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contentos.organization_members om
      WHERE om.organization_id = knowledge_relationships.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY knowledge_rels_insert ON contentos.knowledge_relationships
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM contentos.organization_members om
      WHERE om.organization_id = knowledge_relationships.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY knowledge_rels_update ON contentos.knowledge_relationships
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM contentos.organization_members om
      WHERE om.organization_id = knowledge_relationships.organization_id
        AND om.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 9) record_memory_recall — SM2 update via RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION contentos.record_memory_recall(
  p_memory_id UUID,
  p_quality   INTEGER  -- 0-5 SM2 quality rating
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = contentos, public
AS $$
DECLARE
  v_current  RECORD;
  v_ef       REAL;
  v_interval INTEGER;
  v_strength REAL;
  v_q        INTEGER := LEAST(5, GREATEST(0, p_quality));
BEGIN
  -- Fetch current state (RLS enforced via SECURITY INVOKER)
  SELECT ease_factor, strength, recall_count, half_life_days
    INTO v_current
    FROM contentos.episodic_memory
   WHERE id = p_memory_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Memory % not found or access denied', p_memory_id;
  END IF;

  -- SM2 ease factor update
  v_ef := v_current.ease_factor + (0.1 - (5 - v_q) * (0.08 + (5 - v_q) * 0.02));
  v_ef := GREATEST(1.3, LEAST(5.0, v_ef));

  -- SM2 interval
  IF v_q < 3 THEN
    v_interval := 1;
  ELSIF v_current.recall_count = 0 THEN
    v_interval := 1;
  ELSIF v_current.recall_count = 1 THEN
    v_interval := 6;
  ELSE
    v_interval := ROUND(v_current.half_life_days * v_ef)::INTEGER;
  END IF;

  -- Strength update
  IF v_q >= 4 THEN
    v_strength := LEAST(1.0, v_current.strength + (1.0 - v_current.strength) * 0.15);
  ELSIF v_q = 3 THEN
    v_strength := LEAST(1.0, v_current.strength + (1.0 - v_current.strength) * 0.05);
  ELSIF v_q = 2 THEN
    v_strength := GREATEST(0.0, v_current.strength * 0.9);
  ELSE
    v_strength := GREATEST(0.0, v_current.strength * 0.7);
  END IF;

  -- Update memory
  UPDATE contentos.episodic_memory
     SET ease_factor     = ROUND(v_ef::NUMERIC, 2)::REAL,
         strength        = ROUND(v_strength::NUMERIC, 4)::REAL,
         recall_count    = recall_count + 1,
         last_recalled_at = NOW(),
         next_review_at  = NOW() + (v_interval || ' days')::INTERVAL
   WHERE id = p_memory_id;

  RETURN jsonb_build_object(
    'easeFactor', ROUND(v_ef::NUMERIC, 2),
    'interval', v_interval,
    'strength', ROUND(v_strength::NUMERIC, 4),
    'recallCount', v_current.recall_count + 1,
    'nextReviewAt', (NOW() + (v_interval || ' days')::INTERVAL)::TEXT
  );
END;
$$;

COMMENT ON FUNCTION contentos.record_memory_recall IS
  'SM2 spaced repetition: update memory strength/interval based on quality rating (0-5)';

-- ============================================================================
-- 10) get_cognitive_context_v4 — Enhanced with composite scoring
-- ============================================================================

CREATE OR REPLACE FUNCTION contentos.get_cognitive_context_v4(
  p_org_id   UUID,
  p_platform TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = contentos, public
AS $$
DECLARE
  v_episodic  JSONB;
  v_semantic  JSONB;
  v_procedural JSONB;
  v_working   JSONB;
  v_meta      JSONB;
BEGIN
  -- Membership check (same as v3)
  IF NOT EXISTS (
    SELECT 1 FROM contentos.organization_members
    WHERE organization_id = p_org_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not_authorized: user % is not a member of org %',
      auth.uid(), p_org_id;
  END IF;

  -- Layer 1: Episodic with composite scoring
  -- score = strength * importance * EXP(-LN(2) / half_life_days * days_old) * recency_bias
  SELECT COALESCE(jsonb_agg(row_to_jsonb(e) ORDER BY e.composite_score DESC), '[]'::jsonb)
    INTO v_episodic
    FROM (
      SELECT
        em.id, em.summary, em.event_type::TEXT, em.platform::TEXT,
        em.importance, em.created_at::TEXT,
        em.strength, em.recall_count, em.ease_factor,
        em.half_life_days, em.last_recalled_at::TEXT,
        em.next_review_at::TEXT,
        -- Composite score: strength * importance * decay * recency_bias
        ROUND((
          em.strength * em.importance *
          EXP(-LN(2) / GREATEST(em.half_life_days, 0.1) *
              EXTRACT(EPOCH FROM (NOW() - em.created_at)) / 86400.0) *
          CASE
            WHEN EXTRACT(EPOCH FROM (NOW() - em.created_at)) < 86400 THEN 2.0
            WHEN EXTRACT(EPOCH FROM (NOW() - em.created_at)) < 259200 THEN 1.5
            WHEN EXTRACT(EPOCH FROM (NOW() - em.created_at)) < 604800 THEN 1.2
            WHEN EXTRACT(EPOCH FROM (NOW() - em.created_at)) < 1209600 THEN 1.1
            ELSE 1.0
          END
        )::NUMERIC, 4)::REAL AS composite_score,
        -- Backward compat: current_weight (legacy alias)
        ROUND((em.importance * EXP(-em.decay_rate *
          EXTRACT(EPOCH FROM (NOW() - em.created_at)) / 86400.0))::NUMERIC, 4)::REAL
          AS current_weight
      FROM contentos.episodic_memory em
      WHERE em.organization_id = p_org_id
        AND em.expires_at > NOW()
        AND (p_platform IS NULL OR em.platform::TEXT = p_platform)
      ORDER BY composite_score DESC
      LIMIT 30
    ) e;

  -- Layer 2: Semantic (same as v3 + rank_score)
  SELECT COALESCE(jsonb_agg(row_to_jsonb(s) ORDER BY s.rank_score DESC), '[]'::jsonb)
    INTO v_semantic
    FROM (
      SELECT
        sp.pattern_type::TEXT, sp.platform::TEXT, sp.pattern_key,
        sp.pattern_value, sp.confidence, sp.sample_size, sp.updated_at::TEXT,
        ROUND((
          CASE WHEN sp.organization_id IS NOT NULL THEN 1.5 ELSE 1.0 END *
          sp.confidence *
          LEAST(1.0, sp.sample_size::REAL / 10.0)
        )::NUMERIC, 4)::REAL AS rank_score
      FROM contentos.semantic_patterns sp
      WHERE (sp.organization_id = p_org_id OR sp.organization_id IS NULL)
        AND (p_platform IS NULL OR sp.platform IS NULL OR sp.platform::TEXT = p_platform)
      ORDER BY rank_score DESC
      LIMIT 20
    ) s;

  -- Layer 3: Procedural (same as v3)
  SELECT COALESCE(jsonb_agg(row_to_jsonb(p)), '[]'::jsonb)
    INTO v_procedural
    FROM (
      SELECT
        ps.name, ps.strategy_type::TEXT, ps.platform::TEXT,
        ps.description, ps.conditions, ps.actions,
        ps.effectiveness, ps.times_applied, ps.times_succeeded
      FROM contentos.procedural_strategies ps
      WHERE ps.organization_id = p_org_id
        AND (p_platform IS NULL OR ps.platform IS NULL OR ps.platform::TEXT = p_platform)
      ORDER BY ps.effectiveness DESC NULLS LAST
      LIMIT 15
    ) p;

  -- Layer 4: Working (same as v3)
  SELECT COALESCE(jsonb_agg(row_to_jsonb(w)), '[]'::jsonb)
    INTO v_working
    FROM (
      SELECT wm.memory_type::TEXT, wm.content, wm.valid_until::TEXT, wm.updated_at::TEXT
      FROM contentos.working_memory wm
      WHERE wm.organization_id = p_org_id
        AND (wm.valid_until IS NULL OR wm.valid_until > NOW())
      ORDER BY wm.updated_at DESC
      LIMIT 10
    ) w;

  -- Layer 5: Metacognitive (same as v3)
  SELECT COALESCE(
    (SELECT jsonb_build_object(
       'accuracy_bayesian', (content->>'accuracy_bayesian')::REAL,
       'accuracy_samples',  (content->>'accuracy_samples')::INTEGER,
       'calculated_temperature', (content->>'official_temperature')::REAL,
       'temperature_method', content->>'temperature_method',
       'prior_strength',    (content->>'prior_strength')::REAL,
       'layers_injected',   5
     )
     FROM contentos.working_memory
     WHERE organization_id = p_org_id
       AND memory_type::TEXT = 'metacognitive_state'
       AND (valid_until IS NULL OR valid_until > NOW())
     LIMIT 1
    ),
    jsonb_build_object(
      'accuracy_bayesian', NULL,
      'accuracy_samples', 0,
      'calculated_temperature', 0.5,
      'temperature_method', 'cold_start_default',
      'prior_strength', 3.0,
      'layers_injected', 5
    )
  ) INTO v_meta;

  RETURN jsonb_build_object(
    'episodic',      v_episodic,
    'semantic',      v_semantic,
    'procedural',    v_procedural,
    'working',       v_working,
    'metacognitive', v_meta
  );
END;
$$;

COMMENT ON FUNCTION contentos.get_cognitive_context_v4 IS
  'v4: Same as v3 but with strength-based composite scoring for episodic memories (SM2 integration)';
