-- ============================================================
-- ContentOS Migration 002: Full Schema (Core + Enhancements)
-- Consolidated to keep migration filenames stable and support fresh bootstrap.
-- ============================================================

-- ============================================================
-- ContentOS Migration 002: Core Schema Bootstrap
-- Tabele, FK și index-uri de bază necesare înainte de 003/004.
-- Bootstrap din DB goală rulează fără erori de FK/tabele lipsă.
-- ============================================================
-- Prerequisit: 001_initial_schema.sql (schema contentos, extensions)
-- ============================================================

-- ============================================================
-- 1. ORGANIZATIONS
-- ============================================================
CREATE TABLE contentos.organizations (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                    TEXT NOT NULL,
    slug                    TEXT UNIQUE NOT NULL,
    type                    TEXT NOT NULL DEFAULT 'creator'
                        CHECK (type IN ('creator', 'business', 'agency', 'dental_clinic')),
    plan                    TEXT NOT NULL DEFAULT 'free'
                        CHECK (plan IN ('free', 'starter', 'pro', 'agency', 'dental')),
    stripe_customer_id      TEXT,
    stripe_subscription_id  TEXT,
    medicalcor_clinic_id    UUID,
    settings                JSONB NOT NULL DEFAULT '{}',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. USERS (FK: auth.users, organizations)
-- ============================================================
CREATE TABLE contentos.users (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES contentos.organizations(id) ON DELETE CASCADE,
    role            TEXT NOT NULL DEFAULT 'member'
                    CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    display_name    TEXT,
    avatar_url      TEXT,
    preferences     JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_org ON contentos.users(organization_id);

-- ============================================================
-- 3. SOCIAL ACCOUNTS
-- ============================================================
CREATE TABLE contentos.social_accounts (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID NOT NULL REFERENCES contentos.organizations(id) ON DELETE CASCADE,
    platform            TEXT NOT NULL
                        CHECK (platform IN ('facebook', 'instagram', 'tiktok', 'youtube', 'twitter')),
    platform_user_id    TEXT NOT NULL,
    platform_username   TEXT,
    platform_name       TEXT,
    avatar_url          TEXT,
    access_token        TEXT NOT NULL,
    refresh_token       TEXT,
    token_expires_at    TIMESTAMPTZ,
    followers_count     INTEGER NOT NULL DEFAULT 0,
    following_count     INTEGER NOT NULL DEFAULT 0,
    posts_count         INTEGER NOT NULL DEFAULT 0,
    last_synced_at      TIMESTAMPTZ,
    sync_status         TEXT NOT NULL DEFAULT 'pending'
                        CHECK (sync_status IN ('pending', 'syncing', 'synced', 'error')),
    sync_error          TEXT,
    raw_profile         JSONB NOT NULL DEFAULT '{}',
    settings            JSONB NOT NULL DEFAULT '{}',
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, platform, platform_user_id)
);

CREATE INDEX IF NOT EXISTS idx_social_accounts_org ON contentos.social_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON contentos.social_accounts(platform);

-- ============================================================
-- 4. POSTS
-- ============================================================
CREATE TABLE contentos.posts (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    social_account_id   UUID NOT NULL REFERENCES contentos.social_accounts(id) ON DELETE CASCADE,
    organization_id     UUID NOT NULL REFERENCES contentos.organizations(id) ON DELETE CASCADE,
    platform            TEXT NOT NULL,
    platform_post_id    TEXT NOT NULL,
    platform_url        TEXT,
    content_type        TEXT NOT NULL
                        CHECK (content_type IN (
                            'text', 'image', 'video', 'carousel', 'reel',
                            'story', 'short', 'article', 'thread', 'live'
                        )),
    text_content        TEXT,
    media_urls          TEXT[] NOT NULL DEFAULT '{}',
    hashtags            TEXT[] NOT NULL DEFAULT '{}',
    mentions            TEXT[] NOT NULL DEFAULT '{}',
    language            TEXT NOT NULL DEFAULT 'ro',
    likes_count         INTEGER NOT NULL DEFAULT 0,
    comments_count      INTEGER NOT NULL DEFAULT 0,
    shares_count        INTEGER NOT NULL DEFAULT 0,
    saves_count         INTEGER NOT NULL DEFAULT 0,
    views_count         INTEGER NOT NULL DEFAULT 0,
    reach_count         INTEGER NOT NULL DEFAULT 0,
    impressions_count   INTEGER NOT NULL DEFAULT 0,
    engagement_rate     NUMERIC(8,4),
    virality_score      NUMERIC(8,4),
    content_embedding   vector(1536),
    topic_tags          TEXT[] NOT NULL DEFAULT '{}',
    sentiment           TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral', 'mixed')),
    hook_type           TEXT,
    cta_type            TEXT,
    algorithm_score     JSONB,
    ai_analysis         JSONB NOT NULL DEFAULT '{}',
    published_at        TIMESTAMPTZ NOT NULL,
    dental_category     TEXT CHECK (dental_category IN (
                            'before_after', 'patient_testimonial', 'procedure_education',
                            'team_showcase', 'clinic_tour', 'dental_tip',
                            'promotion', 'event', 'technology'
                        ) OR dental_category IS NULL),
    raw_data            JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(social_account_id, platform_post_id)
);

CREATE INDEX IF NOT EXISTS idx_posts_org ON contentos.posts(organization_id);
CREATE INDEX IF NOT EXISTS idx_posts_account ON contentos.posts(social_account_id);
CREATE INDEX IF NOT EXISTS idx_posts_platform ON contentos.posts(platform);
CREATE INDEX IF NOT EXISTS idx_posts_published ON contentos.posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_engagement ON contentos.posts(engagement_rate DESC);
CREATE INDEX IF NOT EXISTS idx_posts_hashtags ON contentos.posts USING GIN(hashtags);
CREATE INDEX IF NOT EXISTS idx_posts_topics ON contentos.posts USING GIN(topic_tags);
CREATE INDEX IF NOT EXISTS idx_posts_dental ON contentos.posts(dental_category) WHERE dental_category IS NOT NULL;

-- idx_posts_embedding (ivfflat) adăugat în 003

-- ============================================================
-- 5. DRAFTS (fără source_inspiration_id – adăugat în 003)
-- ============================================================
CREATE TABLE contentos.drafts (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id         UUID NOT NULL REFERENCES contentos.organizations(id) ON DELETE CASCADE,
    created_by              UUID NOT NULL REFERENCES contentos.users(id) ON DELETE CASCADE,
    title                   TEXT,
    body                    TEXT NOT NULL,
    media_urls              TEXT[] NOT NULL DEFAULT '{}',
    hashtags                TEXT[] NOT NULL DEFAULT '{}',
    target_platforms        TEXT[] NOT NULL DEFAULT '{}',
    platform_versions       JSONB NOT NULL DEFAULT '{}',
    algorithm_scores        JSONB NOT NULL DEFAULT '{}',
    status                  TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'reviewing', 'scheduled', 'published', 'archived')),
    scheduled_at            TIMESTAMPTZ,
    published_at            TIMESTAMPTZ,
    source                  TEXT NOT NULL DEFAULT 'manual'
                        CHECK (source IN ('manual', 'braindump', 'repurpose', 'ai_generated', 'template')),
    source_post_id          UUID REFERENCES contentos.posts(id) ON DELETE SET NULL,
    dental_category         TEXT,
    requires_patient_consent BOOLEAN NOT NULL DEFAULT false,
    patient_consent_id      UUID,
    cmsr_compliant          BOOLEAN,
    cmsr_check_result       JSONB,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- source_inspiration_id, ai_suggestions, ai_coach_feedback adăugate în 003

CREATE INDEX IF NOT EXISTS idx_drafts_org ON contentos.drafts(organization_id);
CREATE INDEX IF NOT EXISTS idx_drafts_status ON contentos.drafts(status);
CREATE INDEX IF NOT EXISTS idx_drafts_scheduled ON contentos.drafts(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_drafts_created_by ON contentos.drafts(created_by);

-- ============================================================
-- 6. BRAIN DUMPS
-- ============================================================
CREATE TABLE contentos.brain_dumps (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID NOT NULL REFERENCES contentos.organizations(id) ON DELETE CASCADE,
    created_by          UUID NOT NULL REFERENCES contentos.users(id) ON DELETE CASCADE,
    input_type          TEXT NOT NULL DEFAULT 'text'
                    CHECK (input_type IN ('text', 'voice', 'image')),
    raw_input           TEXT NOT NULL,
    voice_audio_url     TEXT,
    processed_content   JSONB NOT NULL DEFAULT '{}',
    generated_draft_ids UUID[] NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- status adăugat în 003

CREATE INDEX IF NOT EXISTS idx_brain_dumps_org ON contentos.brain_dumps(organization_id);

-- ============================================================
-- 7. ANALYTICS DAILY
-- ============================================================
CREATE TABLE contentos.analytics_daily (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID NOT NULL REFERENCES contentos.organizations(id) ON DELETE CASCADE,
    social_account_id   UUID NOT NULL REFERENCES contentos.social_accounts(id) ON DELETE CASCADE,
    date                DATE NOT NULL,
    posts_count         INTEGER NOT NULL DEFAULT 0,
    total_likes         INTEGER NOT NULL DEFAULT 0,
    total_comments      INTEGER NOT NULL DEFAULT 0,
    total_shares        INTEGER NOT NULL DEFAULT 0,
    total_views         INTEGER NOT NULL DEFAULT 0,
    total_reach         INTEGER NOT NULL DEFAULT 0,
    avg_engagement_rate NUMERIC(8,4),
    top_post_id         UUID REFERENCES contentos.posts(id) ON DELETE SET NULL,
    top_post_engagement NUMERIC(8,4),
    followers_gained     INTEGER NOT NULL DEFAULT 0,
    followers_lost      INTEGER NOT NULL DEFAULT 0,
    net_followers       INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(social_account_id, date)
);

-- followers_count adăugat în 003

CREATE INDEX IF NOT EXISTS idx_analytics_org_date ON contentos.analytics_daily(organization_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_account_date ON contentos.analytics_daily(social_account_id, date DESC);

-- ============================================================
-- 8. COACH CONVERSATIONS
-- ============================================================
CREATE TABLE contentos.coach_conversations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID NOT NULL REFERENCES contentos.organizations(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES contentos.users(id) ON DELETE CASCADE,
    messages            JSONB NOT NULL DEFAULT '[]',
    context_post_ids    UUID[] NOT NULL DEFAULT '{}',
    context_platform    TEXT,
    title               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- context JSONB adăugat în 003

CREATE INDEX IF NOT EXISTS idx_coach_conversations_org ON contentos.coach_conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_coach_conversations_user ON contentos.coach_conversations(user_id);

-- ============================================================
-- RLS & POLICII INIȚIALE (înlocuite de 004)
-- ============================================================
ALTER TABLE contentos.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.brain_dumps ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE contentos.coach_conversations ENABLE ROW LEVEL SECURITY;

-- Politici blanket (004 le înlocuiește cu politicile granulare)
CREATE POLICY "Users can view own org" ON contentos.organizations
    FOR ALL USING (
        id IN (SELECT organization_id FROM contentos.users WHERE id = auth.uid())
    );

CREATE POLICY "Users can view own profile" ON contentos.users
    FOR ALL USING (organization_id IN (SELECT organization_id FROM contentos.users WHERE id = auth.uid()));

CREATE POLICY "Users can view own org social accounts" ON contentos.social_accounts
    FOR ALL USING (
        organization_id IN (SELECT organization_id FROM contentos.users WHERE id = auth.uid())
    );

CREATE POLICY "Users can view own org posts" ON contentos.posts
    FOR ALL USING (
        organization_id IN (SELECT organization_id FROM contentos.users WHERE id = auth.uid())
    );

CREATE POLICY "Users can view own org drafts" ON contentos.drafts
    FOR ALL USING (
        organization_id IN (SELECT organization_id FROM contentos.users WHERE id = auth.uid())
    );

CREATE POLICY "Users can view own org brain dumps" ON contentos.brain_dumps
    FOR ALL USING (
        organization_id IN (SELECT organization_id FROM contentos.users WHERE id = auth.uid())
    );

CREATE POLICY "Users can view own coach conversations" ON contentos.coach_conversations
    FOR ALL USING (
        organization_id IN (SELECT organization_id FROM contentos.users WHERE id = auth.uid())
        AND user_id = auth.uid()
    );

CREATE POLICY "Users can view own org analytics" ON contentos.analytics_daily
    FOR ALL USING (
        organization_id IN (SELECT organization_id FROM contentos.users WHERE id = auth.uid())
    );

-- ============================================================
-- FUNCȚII ȘI TRIGGERE
-- ============================================================
CREATE OR REPLACE FUNCTION contentos.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON contentos.organizations
    FOR EACH ROW EXECUTE FUNCTION contentos.update_updated_at();

CREATE TRIGGER update_social_accounts_updated_at
    BEFORE UPDATE ON contentos.social_accounts
    FOR EACH ROW EXECUTE FUNCTION contentos.update_updated_at();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON contentos.users
    FOR EACH ROW EXECUTE FUNCTION contentos.update_updated_at();

CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON contentos.posts
    FOR EACH ROW EXECUTE FUNCTION contentos.update_updated_at();

CREATE TRIGGER update_drafts_updated_at
    BEFORE UPDATE ON contentos.drafts
    FOR EACH ROW EXECUTE FUNCTION contentos.update_updated_at();

CREATE TRIGGER update_coach_conversations_updated_at
    BEFORE UPDATE ON contentos.coach_conversations
    FOR EACH ROW EXECUTE FUNCTION contentos.update_updated_at();

CREATE OR REPLACE FUNCTION contentos.compute_engagement_rate()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reach_count > 0 THEN
        NEW.engagement_rate = (
            (COALESCE(NEW.likes_count, 0) +
             COALESCE(NEW.comments_count, 0) +
             COALESCE(NEW.shares_count, 0) +
             COALESCE(NEW.saves_count, 0))::NUMERIC /
            NEW.reach_count * 100
        );
    ELSIF NEW.views_count > 0 THEN
        NEW.engagement_rate = (
            (COALESCE(NEW.likes_count, 0) +
             COALESCE(NEW.comments_count, 0) +
             COALESCE(NEW.shares_count, 0) +
             COALESCE(NEW.saves_count, 0))::NUMERIC /
            NEW.views_count * 100
        );
    END IF;

    NEW.virality_score = (
        COALESCE(NEW.shares_count, 0) * 3 +
        COALESCE(NEW.comments_count, 0) * 2 +
        COALESCE(NEW.likes_count, 0) * 1
    )::NUMERIC;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER compute_post_engagement
    BEFORE INSERT OR UPDATE ON contentos.posts
    FOR EACH ROW EXECUTE FUNCTION contentos.compute_engagement_rate();

-- ============================================================
-- Enhancement block (originally split as 003_full_schema.sql)
-- ============================================================

-- ============================================================
-- ContentOS Migration 003: Schema Enhancements
-- Adds inspirations, templates, tracked_competitors; columns; indexes; functions.
-- Prerequisit: 002_full_schema.sql (core section)
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
