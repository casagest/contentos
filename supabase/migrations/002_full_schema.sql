-- ============================================================
-- ContentOS Migration 002: Schema Enhancements
-- Adds missing tables, columns, indexes, and functions
-- on top of 001_initial_schema.sql
-- ============================================================

-- ============================================================
-- NEW TABLES: inspirations, templates, tracked_competitors
-- ============================================================

-- 1. INSPIRATIONS (saved content from other creators)
-- Must exist before drafts FK is added
CREATE TABLE contentos.inspirations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID NOT NULL REFERENCES contentos.organizations(id) ON DELETE CASCADE,
    saved_by            UUID NOT NULL REFERENCES contentos.users(id) ON DELETE CASCADE,
    -- Source content
    platform            TEXT NOT NULL,
    platform_post_id    TEXT,
    platform_url        TEXT NOT NULL,
    author_username     TEXT,
    author_name         TEXT,
    -- Content snapshot
    text_content        TEXT,
    media_urls          TEXT[] NOT NULL DEFAULT '{}',
    -- Metrics at time of save
    likes_count         INTEGER NOT NULL DEFAULT 0,
    shares_count        INTEGER NOT NULL DEFAULT 0,
    views_count         INTEGER NOT NULL DEFAULT 0,
    -- AI analysis
    content_embedding   vector(1536),
    why_it_works        TEXT,
    repurpose_ideas     JSONB NOT NULL DEFAULT '{}',
    -- Organization
    folder              TEXT NOT NULL DEFAULT 'unsorted',
    tags                TEXT[] NOT NULL DEFAULT '{}',
    notes               TEXT,
    -- Metadata
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inspirations_org ON contentos.inspirations(organization_id);
CREATE INDEX idx_inspirations_saved_by ON contentos.inspirations(saved_by);
CREATE INDEX idx_inspirations_embedding ON contentos.inspirations
    USING ivfflat (content_embedding vector_cosine_ops)
    WITH (lists = 50);

-- 2. CONTENT TEMPLATES (system + custom)
CREATE TABLE contentos.templates (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Ownership: NULL = system template
    organization_id     UUID REFERENCES contentos.organizations(id) ON DELETE CASCADE,
    -- Template definition
    name                TEXT NOT NULL,
    description         TEXT,
    category            TEXT NOT NULL,
    platforms           TEXT[] NOT NULL,
    -- Template content
    template_body       TEXT NOT NULL,
    template_variables  JSONB NOT NULL DEFAULT '{}',
    example_output      TEXT,
    -- Dental specific
    is_dental           BOOLEAN NOT NULL DEFAULT false,
    dental_category     TEXT,
    cmsr_approved       BOOLEAN NOT NULL DEFAULT false,
    -- Usage
    usage_count         INTEGER NOT NULL DEFAULT 0,
    -- Metadata
    is_system           BOOLEAN NOT NULL DEFAULT false,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_templates_org ON contentos.templates(organization_id);
CREATE INDEX idx_templates_category ON contentos.templates(category);
CREATE INDEX idx_templates_system ON contentos.templates(is_system)
    WHERE is_system = true;

-- 3. COMPETITOR TRACKING
CREATE TABLE contentos.tracked_competitors (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID NOT NULL REFERENCES contentos.organizations(id) ON DELETE CASCADE,
    -- Competitor info
    platform            TEXT NOT NULL,
    platform_user_id    TEXT NOT NULL,
    platform_username   TEXT NOT NULL,
    display_name        TEXT,
    -- Cached metrics
    followers_count     INTEGER NOT NULL DEFAULT 0,
    avg_engagement_rate NUMERIC(8,4),
    posting_frequency   NUMERIC(8,2),
    -- Analysis
    top_topics          TEXT[] NOT NULL DEFAULT '{}',
    content_strategy    JSONB NOT NULL DEFAULT '{}',
    -- Sync
    last_analyzed_at    TIMESTAMPTZ,
    -- Metadata
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- One entry per competitor per platform per org
    UNIQUE(organization_id, platform, platform_user_id)
);

CREATE INDEX idx_tracked_competitors_org ON contentos.tracked_competitors(organization_id);

-- ============================================================
-- ADD MISSING COLUMNS to existing tables
-- ============================================================

-- drafts: add source_inspiration_id FK now that inspirations table exists
ALTER TABLE contentos.drafts
    ADD COLUMN IF NOT EXISTS source_inspiration_id UUID REFERENCES contentos.inspirations(id) ON DELETE SET NULL;

-- drafts: add source column if missing
ALTER TABLE contentos.drafts
    ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'braindump', 'repurpose', 'ai_generated', 'template'));

-- drafts: add ai_suggestions if missing
ALTER TABLE contentos.drafts
    ADD COLUMN IF NOT EXISTS ai_suggestions JSONB NOT NULL DEFAULT '{}';

-- drafts: add ai_coach_feedback if missing
ALTER TABLE contentos.drafts
    ADD COLUMN IF NOT EXISTS ai_coach_feedback TEXT;

-- brain_dumps: add status column
ALTER TABLE contentos.brain_dumps
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'error'));

-- coach_conversations: add context JSONB
ALTER TABLE contentos.coach_conversations
    ADD COLUMN IF NOT EXISTS context JSONB NOT NULL DEFAULT '{}';

-- analytics_daily: add followers_count
ALTER TABLE contentos.analytics_daily
    ADD COLUMN IF NOT EXISTS followers_count INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- ADD MISSING INDEXES
-- ============================================================

-- pgvector ivfflat index for post embedding similarity search
CREATE INDEX IF NOT EXISTS idx_posts_embedding ON contentos.posts
    USING ivfflat (content_embedding vector_cosine_ops)
    WITH (lists = 100);

-- users FK index
CREATE INDEX IF NOT EXISTS idx_users_org ON contentos.users(organization_id);

-- drafts: created_by index
CREATE INDEX IF NOT EXISTS idx_drafts_created_by ON contentos.drafts(created_by);

-- brain_dumps: org index
CREATE INDEX IF NOT EXISTS idx_brain_dumps_org ON contentos.brain_dumps(organization_id);

-- coach_conversations: org + user indexes
CREATE INDEX IF NOT EXISTS idx_coach_conversations_org ON contentos.coach_conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_coach_conversations_user ON contentos.coach_conversations(user_id);

-- analytics_daily: account+date index
CREATE INDEX IF NOT EXISTS idx_analytics_account_date ON contentos.analytics_daily(social_account_id, date DESC);

-- ============================================================
-- FUNCTIONS: vector similarity search
-- ============================================================

-- Similar posts search via pgvector
CREATE OR REPLACE FUNCTION contentos.search_similar_posts(
    p_organization_id UUID,
    p_embedding       vector(1536),
    p_limit           INTEGER DEFAULT 10,
    p_platform        TEXT    DEFAULT NULL
)
RETURNS TABLE (
    post_id         UUID,
    text_content    TEXT,
    platform        TEXT,
    engagement_rate NUMERIC,
    similarity      FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.text_content,
        p.platform,
        p.engagement_rate,
        1 - (p.content_embedding <=> p_embedding) AS similarity
    FROM contentos.posts p
    WHERE p.organization_id = p_organization_id
      AND p.content_embedding IS NOT NULL
      AND (p_platform IS NULL OR p.platform = p_platform)
    ORDER BY p.content_embedding <=> p_embedding
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Similar inspirations search via pgvector
CREATE OR REPLACE FUNCTION contentos.search_similar_inspirations(
    p_organization_id UUID,
    p_embedding       vector(1536),
    p_limit           INTEGER DEFAULT 10
)
RETURNS TABLE (
    inspiration_id  UUID,
    text_content    TEXT,
    platform        TEXT,
    why_it_works    TEXT,
    similarity      FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.id,
        i.text_content,
        i.platform,
        i.why_it_works,
        1 - (i.content_embedding <=> p_embedding) AS similarity
    FROM contentos.inspirations i
    WHERE i.organization_id = p_organization_id
      AND i.content_embedding IS NOT NULL
    ORDER BY i.content_embedding <=> p_embedding
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;
