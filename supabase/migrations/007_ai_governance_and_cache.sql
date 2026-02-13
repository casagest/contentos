-- ============================================================
-- ContentOS Migration 007: AI Governance + Intent Cache
-- Adds production telemetry, budget observability, and
-- request-level cache by intent hash.
-- ============================================================

-- ============================================================
-- 1) AI USAGE EVENTS (append-only telemetry)
-- ============================================================
CREATE TABLE IF NOT EXISTS contentos.ai_usage_events (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID NOT NULL REFERENCES contentos.organizations(id) ON DELETE CASCADE,
    user_id             UUID REFERENCES contentos.users(id) ON DELETE SET NULL,
    route_key           TEXT NOT NULL,
    intent_hash         TEXT,
    provider            TEXT NOT NULL DEFAULT 'template',
    model               TEXT NOT NULL DEFAULT 'template',
    mode                TEXT NOT NULL DEFAULT 'deterministic'
                        CHECK (mode IN ('ai', 'deterministic')),
    input_tokens        INTEGER NOT NULL DEFAULT 0,
    output_tokens       INTEGER NOT NULL DEFAULT 0,
    estimated_cost_usd  NUMERIC(12, 6) NOT NULL DEFAULT 0,
    latency_ms          INTEGER NOT NULL DEFAULT 0,
    success             BOOLEAN NOT NULL DEFAULT true,
    cache_hit           BOOLEAN NOT NULL DEFAULT false,
    budget_fallback     BOOLEAN NOT NULL DEFAULT false,
    error_code          TEXT,
    metadata            JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_events_org_created
    ON contentos.ai_usage_events (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_events_org_route_created
    ON contentos.ai_usage_events (organization_id, route_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_events_org_intent
    ON contentos.ai_usage_events (organization_id, intent_hash)
    WHERE intent_hash IS NOT NULL;

-- ============================================================
-- 2) AI REQUEST CACHE (intent cache by org + route)
-- ============================================================
CREATE TABLE IF NOT EXISTS contentos.ai_request_cache (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID NOT NULL REFERENCES contentos.organizations(id) ON DELETE CASCADE,
    created_by          UUID REFERENCES contentos.users(id) ON DELETE SET NULL,
    route_key           TEXT NOT NULL,
    intent_hash         TEXT NOT NULL,
    provider            TEXT NOT NULL DEFAULT 'template',
    model               TEXT NOT NULL DEFAULT 'template',
    response_json       JSONB NOT NULL DEFAULT '{}',
    estimated_cost_usd  NUMERIC(12, 6) NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at          TIMESTAMPTZ NOT NULL,
    UNIQUE (organization_id, route_key, intent_hash)
);

CREATE INDEX IF NOT EXISTS idx_ai_request_cache_org_expires
    ON contentos.ai_request_cache (organization_id, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_request_cache_org_route
    ON contentos.ai_request_cache (organization_id, route_key, created_at DESC);

DROP TRIGGER IF EXISTS update_ai_request_cache_updated_at ON contentos.ai_request_cache;
CREATE TRIGGER update_ai_request_cache_updated_at
    BEFORE UPDATE ON contentos.ai_request_cache
    FOR EACH ROW EXECUTE FUNCTION contentos.update_updated_at();

-- ============================================================
-- 3) RLS
-- ============================================================
ALTER TABLE contentos.ai_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.ai_request_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_usage_events_select" ON contentos.ai_usage_events;
DROP POLICY IF EXISTS "ai_usage_events_insert" ON contentos.ai_usage_events;
DROP POLICY IF EXISTS "ai_usage_events_delete" ON contentos.ai_usage_events;

CREATE POLICY "ai_usage_events_select"
    ON contentos.ai_usage_events FOR SELECT
    USING (organization_id = contentos.user_org_id());

CREATE POLICY "ai_usage_events_insert"
    ON contentos.ai_usage_events FOR INSERT
    WITH CHECK (organization_id = contentos.user_org_id());

CREATE POLICY "ai_usage_events_delete"
    ON contentos.ai_usage_events FOR DELETE
    USING (
        organization_id = contentos.user_org_id()
        AND contentos.user_is_admin()
    );

DROP POLICY IF EXISTS "ai_request_cache_select" ON contentos.ai_request_cache;
DROP POLICY IF EXISTS "ai_request_cache_insert" ON contentos.ai_request_cache;
DROP POLICY IF EXISTS "ai_request_cache_update" ON contentos.ai_request_cache;
DROP POLICY IF EXISTS "ai_request_cache_delete" ON contentos.ai_request_cache;

CREATE POLICY "ai_request_cache_select"
    ON contentos.ai_request_cache FOR SELECT
    USING (organization_id = contentos.user_org_id());

CREATE POLICY "ai_request_cache_insert"
    ON contentos.ai_request_cache FOR INSERT
    WITH CHECK (organization_id = contentos.user_org_id());

CREATE POLICY "ai_request_cache_update"
    ON contentos.ai_request_cache FOR UPDATE
    USING (
        organization_id = contentos.user_org_id()
        AND (created_by = auth.uid() OR contentos.user_is_admin())
    )
    WITH CHECK (organization_id = contentos.user_org_id());

CREATE POLICY "ai_request_cache_delete"
    ON contentos.ai_request_cache FOR DELETE
    USING (
        organization_id = contentos.user_org_id()
        AND (created_by = auth.uid() OR contentos.user_is_admin())
    );
