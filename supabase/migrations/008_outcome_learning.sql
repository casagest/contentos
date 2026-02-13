-- ============================================================
-- ContentOS Migration 008: Outcome Learning Loop
-- Adds decision logs, outcome events, and creative memory.
-- ============================================================

-- ============================================================
-- 1) DECISION LOGS (append-only)
-- ============================================================
CREATE TABLE IF NOT EXISTS contentos.decision_logs (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID NOT NULL REFERENCES contentos.organizations(id) ON DELETE CASCADE,
    user_id             UUID REFERENCES contentos.users(id) ON DELETE SET NULL,
    draft_id            UUID REFERENCES contentos.drafts(id) ON DELETE SET NULL,
    post_id             UUID REFERENCES contentos.posts(id) ON DELETE SET NULL,
    route_key           TEXT NOT NULL DEFAULT 'publish',
    decision_type       TEXT NOT NULL DEFAULT 'generation',
    objective           TEXT NOT NULL DEFAULT 'engagement'
                        CHECK (objective IN ('engagement', 'reach', 'leads', 'saves')),
    provider            TEXT NOT NULL DEFAULT 'template',
    model               TEXT NOT NULL DEFAULT 'template',
    mode                TEXT NOT NULL DEFAULT 'deterministic'
                        CHECK (mode IN ('ai', 'deterministic')),
    platform            TEXT CHECK (platform IN ('facebook', 'instagram', 'tiktok', 'youtube', 'twitter')),
    selected_variant    TEXT,
    expected_score      NUMERIC(8,4),
    projected_uplift    NUMERIC(8,4),
    estimated_cost_usd  NUMERIC(12,6) NOT NULL DEFAULT 0,
    roi_multiple        NUMERIC(12,6),
    decision_context    JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decision_logs_org_created
    ON contentos.decision_logs (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_decision_logs_org_route_created
    ON contentos.decision_logs (organization_id, route_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_decision_logs_org_post
    ON contentos.decision_logs (organization_id, post_id)
    WHERE post_id IS NOT NULL;

-- ============================================================
-- 2) OUTCOME EVENTS (append-only snapshots)
-- ============================================================
CREATE TABLE IF NOT EXISTS contentos.outcome_events (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID NOT NULL REFERENCES contentos.organizations(id) ON DELETE CASCADE,
    social_account_id   UUID REFERENCES contentos.social_accounts(id) ON DELETE SET NULL,
    post_id             UUID NOT NULL REFERENCES contentos.posts(id) ON DELETE CASCADE,
    platform            TEXT NOT NULL
                        CHECK (platform IN ('facebook', 'instagram', 'tiktok', 'youtube', 'twitter')),
    objective           TEXT NOT NULL DEFAULT 'engagement'
                        CHECK (objective IN ('engagement', 'reach', 'leads', 'saves')),
    event_type          TEXT NOT NULL DEFAULT 'snapshot'
                        CHECK (event_type IN ('published', 'snapshot', 'manual')),
    source              TEXT NOT NULL DEFAULT 'sync'
                        CHECK (source IN ('publish', 'sync', 'manual')),
    recorded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at        TIMESTAMPTZ,
    likes_count         INTEGER NOT NULL DEFAULT 0,
    comments_count      INTEGER NOT NULL DEFAULT 0,
    shares_count        INTEGER NOT NULL DEFAULT 0,
    saves_count         INTEGER NOT NULL DEFAULT 0,
    views_count         INTEGER NOT NULL DEFAULT 0,
    reach_count         INTEGER NOT NULL DEFAULT 0,
    impressions_count   INTEGER NOT NULL DEFAULT 0,
    engagement_rate     NUMERIC(8,4),
    metrics_hash        TEXT,
    metadata            JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outcome_events_org_recorded
    ON contentos.outcome_events (organization_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_outcome_events_org_post_recorded
    ON contentos.outcome_events (organization_id, post_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_outcome_events_org_platform_recorded
    ON contentos.outcome_events (organization_id, platform, recorded_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_outcome_events_dedupe
    ON contentos.outcome_events (post_id, source, event_type, metrics_hash)
    WHERE metrics_hash IS NOT NULL;

-- ============================================================
-- 3) CREATIVE MEMORY (aggregated signals by org/platform/objective)
-- ============================================================
CREATE TABLE IF NOT EXISTS contentos.creative_memory (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID NOT NULL REFERENCES contentos.organizations(id) ON DELETE CASCADE,
    platform            TEXT NOT NULL
                        CHECK (platform IN ('facebook', 'instagram', 'tiktok', 'youtube', 'twitter')),
    objective           TEXT NOT NULL DEFAULT 'engagement'
                        CHECK (objective IN ('engagement', 'reach', 'leads', 'saves')),
    memory_key          TEXT NOT NULL,
    hook_type           TEXT,
    framework           TEXT,
    cta_type            TEXT,
    sample_size         INTEGER NOT NULL DEFAULT 0 CHECK (sample_size >= 0),
    success_count       INTEGER NOT NULL DEFAULT 0 CHECK (success_count >= 0),
    total_engagement    NUMERIC(12,4) NOT NULL DEFAULT 0,
    avg_engagement      NUMERIC(12,4) NOT NULL DEFAULT 0,
    last_post_id        UUID REFERENCES contentos.posts(id) ON DELETE SET NULL,
    last_outcome_at     TIMESTAMPTZ,
    metadata            JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, platform, objective, memory_key)
);

CREATE INDEX IF NOT EXISTS idx_creative_memory_org_platform
    ON contentos.creative_memory (organization_id, platform, objective, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_creative_memory_org_success
    ON contentos.creative_memory (organization_id, objective, success_count DESC, avg_engagement DESC);

DROP TRIGGER IF EXISTS update_creative_memory_updated_at ON contentos.creative_memory;
CREATE TRIGGER update_creative_memory_updated_at
    BEFORE UPDATE ON contentos.creative_memory
    FOR EACH ROW EXECUTE FUNCTION contentos.update_updated_at();

-- ============================================================
-- 4) RLS
-- ============================================================
ALTER TABLE contentos.decision_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.outcome_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.creative_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "decision_logs_select" ON contentos.decision_logs;
DROP POLICY IF EXISTS "decision_logs_insert" ON contentos.decision_logs;
DROP POLICY IF EXISTS "decision_logs_delete" ON contentos.decision_logs;

CREATE POLICY "decision_logs_select"
    ON contentos.decision_logs FOR SELECT
    USING (organization_id = contentos.user_org_id());

CREATE POLICY "decision_logs_insert"
    ON contentos.decision_logs FOR INSERT
    WITH CHECK (organization_id = contentos.user_org_id());

CREATE POLICY "decision_logs_delete"
    ON contentos.decision_logs FOR DELETE
    USING (
        organization_id = contentos.user_org_id()
        AND contentos.user_is_admin()
    );

DROP POLICY IF EXISTS "outcome_events_select" ON contentos.outcome_events;
DROP POLICY IF EXISTS "outcome_events_insert" ON contentos.outcome_events;
DROP POLICY IF EXISTS "outcome_events_update" ON contentos.outcome_events;
DROP POLICY IF EXISTS "outcome_events_delete" ON contentos.outcome_events;

CREATE POLICY "outcome_events_select"
    ON contentos.outcome_events FOR SELECT
    USING (organization_id = contentos.user_org_id());

CREATE POLICY "outcome_events_insert"
    ON contentos.outcome_events FOR INSERT
    WITH CHECK (organization_id = contentos.user_org_id());

CREATE POLICY "outcome_events_update"
    ON contentos.outcome_events FOR UPDATE
    USING (organization_id = contentos.user_org_id())
    WITH CHECK (organization_id = contentos.user_org_id());

CREATE POLICY "outcome_events_delete"
    ON contentos.outcome_events FOR DELETE
    USING (
        organization_id = contentos.user_org_id()
        AND contentos.user_is_admin()
    );

DROP POLICY IF EXISTS "creative_memory_select" ON contentos.creative_memory;
DROP POLICY IF EXISTS "creative_memory_insert" ON contentos.creative_memory;
DROP POLICY IF EXISTS "creative_memory_update" ON contentos.creative_memory;
DROP POLICY IF EXISTS "creative_memory_delete" ON contentos.creative_memory;

CREATE POLICY "creative_memory_select"
    ON contentos.creative_memory FOR SELECT
    USING (organization_id = contentos.user_org_id());

CREATE POLICY "creative_memory_insert"
    ON contentos.creative_memory FOR INSERT
    WITH CHECK (organization_id = contentos.user_org_id());

CREATE POLICY "creative_memory_update"
    ON contentos.creative_memory FOR UPDATE
    USING (organization_id = contentos.user_org_id())
    WITH CHECK (organization_id = contentos.user_org_id());

CREATE POLICY "creative_memory_delete"
    ON contentos.creative_memory FOR DELETE
    USING (
        organization_id = contentos.user_org_id()
        AND contentos.user_is_admin()
    );
