-- ============================================================
-- ContentOS Migration 006: Scrape Cache + Research Analyses
-- Adds production persistence for Research/Inspiration workflows.
-- ============================================================

-- ============================================================
-- 1) SCRAPE CACHE
-- ============================================================
CREATE TABLE IF NOT EXISTS contentos.scrape_cache (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES contentos.organizations(id) ON DELETE CASCADE,
    created_by      UUID REFERENCES contentos.users(id) ON DELETE SET NULL,
    url             TEXT NOT NULL,
    url_hash        TEXT NOT NULL,
    source          TEXT NOT NULL CHECK (source IN ('firecrawl', 'fallback')),
    title           TEXT,
    description     TEXT,
    content         TEXT NOT NULL,
    metadata        JSONB NOT NULL DEFAULT '{}',
    fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, url_hash)
);

CREATE INDEX IF NOT EXISTS idx_scrape_cache_org_expires
    ON contentos.scrape_cache(organization_id, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_scrape_cache_org_fetched
    ON contentos.scrape_cache(organization_id, fetched_at DESC);

-- ============================================================
-- 2) RESEARCH ANALYSES HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS contentos.research_analyses (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID NOT NULL REFERENCES contentos.organizations(id) ON DELETE CASCADE,
    created_by          UUID NOT NULL REFERENCES contentos.users(id) ON DELETE CASCADE,
    url                 TEXT NOT NULL,
    url_hash            TEXT NOT NULL,
    platform            TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'tiktok', 'youtube', 'twitter')),
    username            TEXT,
    mode                TEXT NOT NULL CHECK (mode IN ('ai', 'deterministic')),
    scrape_source       TEXT NOT NULL CHECK (scrape_source IN ('firecrawl', 'fallback')),
    summary             TEXT NOT NULL,
    content_strategy    TEXT NOT NULL,
    top_topics          TEXT[] NOT NULL DEFAULT '{}',
    best_posting_times  TEXT[] NOT NULL DEFAULT '{}',
    recommendations     TEXT[] NOT NULL DEFAULT '{}',
    raw_result          JSONB NOT NULL DEFAULT '{}',
    cached_from_id      UUID REFERENCES contentos.research_analyses(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_analyses_org_created
    ON contentos.research_analyses(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_research_analyses_org_hash_platform
    ON contentos.research_analyses(organization_id, url_hash, platform, created_at DESC);

-- ============================================================
-- 3) UPDATED_AT TRIGGERS
-- ============================================================
DROP TRIGGER IF EXISTS update_scrape_cache_updated_at ON contentos.scrape_cache;
CREATE TRIGGER update_scrape_cache_updated_at
    BEFORE UPDATE ON contentos.scrape_cache
    FOR EACH ROW EXECUTE FUNCTION contentos.update_updated_at();

DROP TRIGGER IF EXISTS update_research_analyses_updated_at ON contentos.research_analyses;
CREATE TRIGGER update_research_analyses_updated_at
    BEFORE UPDATE ON contentos.research_analyses
    FOR EACH ROW EXECUTE FUNCTION contentos.update_updated_at();

-- ============================================================
-- 4) RLS
-- ============================================================
ALTER TABLE contentos.scrape_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.research_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scrape_cache_select" ON contentos.scrape_cache;
DROP POLICY IF EXISTS "scrape_cache_insert" ON contentos.scrape_cache;
DROP POLICY IF EXISTS "scrape_cache_update" ON contentos.scrape_cache;
DROP POLICY IF EXISTS "scrape_cache_delete" ON contentos.scrape_cache;

CREATE POLICY "scrape_cache_select"
    ON contentos.scrape_cache FOR SELECT
    USING (organization_id = contentos.user_org_id());

CREATE POLICY "scrape_cache_insert"
    ON contentos.scrape_cache FOR INSERT
    WITH CHECK (organization_id = contentos.user_org_id());

CREATE POLICY "scrape_cache_update"
    ON contentos.scrape_cache FOR UPDATE
    USING (
        organization_id = contentos.user_org_id()
        AND (created_by = auth.uid() OR contentos.user_is_admin())
    )
    WITH CHECK (organization_id = contentos.user_org_id());

CREATE POLICY "scrape_cache_delete"
    ON contentos.scrape_cache FOR DELETE
    USING (
        organization_id = contentos.user_org_id()
        AND (created_by = auth.uid() OR contentos.user_is_admin())
    );

DROP POLICY IF EXISTS "research_analyses_select" ON contentos.research_analyses;
DROP POLICY IF EXISTS "research_analyses_insert" ON contentos.research_analyses;
DROP POLICY IF EXISTS "research_analyses_update" ON contentos.research_analyses;
DROP POLICY IF EXISTS "research_analyses_delete" ON contentos.research_analyses;

CREATE POLICY "research_analyses_select"
    ON contentos.research_analyses FOR SELECT
    USING (organization_id = contentos.user_org_id());

CREATE POLICY "research_analyses_insert"
    ON contentos.research_analyses FOR INSERT
    WITH CHECK (organization_id = contentos.user_org_id());

CREATE POLICY "research_analyses_update"
    ON contentos.research_analyses FOR UPDATE
    USING (
        organization_id = contentos.user_org_id()
        AND (created_by = auth.uid() OR contentos.user_is_admin())
    )
    WITH CHECK (organization_id = contentos.user_org_id());

CREATE POLICY "research_analyses_delete"
    ON contentos.research_analyses FOR DELETE
    USING (
        organization_id = contentos.user_org_id()
        AND (created_by = auth.uid() OR contentos.user_is_admin())
    );
